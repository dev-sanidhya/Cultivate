import type { SupabaseClient } from "@supabase/supabase-js"
import type { OfferType } from "@/types"
import { fetchActiveOffersForUser, resolveCategoryBenefit } from "@/lib/offers"

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">

export interface UnlockPricing {
  price: number
  durationDays: number
  /** True when this came from the per-category configuration (admin-verified). */
  configured: boolean
}

export interface EffectiveUnlockPricing {
  /** Regular (non-discounted) price in paise. */
  basePrice: number
  /** Price the user actually pays in paise (discounted when an offer applies). */
  effectivePrice: number
  /** Base unlock duration in days. */
  baseDurationDays: number
  /** Bonus days added by active offers. */
  bonusDurationDays: number
  /** Total duration granted (base + bonus). */
  totalDurationDays: number
  /** Whether an active offer is contributing a discount or bonus. */
  hasOffer: boolean
  /** Offer types contributing the benefit (for conversion tracking). */
  offerTypes: OfferType[]
}

const DEFAULT_PRICE_KEY = "default_chat_unlock_price"
const DEFAULT_DURATION_KEY = "default_chat_unlock_duration_days"

/**
 * Resolve the chat-unlock price + duration for a Looking For category.
 * Uses the per-category `chat_pricing` row when present; otherwise falls back to
 * the platform-wide defaults so newly created (unverified) custom categories can
 * be unlocked immediately, before an admin configures category-specific pricing.
 */
export async function resolveUnlockPricing(
  supabase: SupabaseLike,
  category: string,
): Promise<UnlockPricing> {
  const [{ data: pricing }, { data: defaults }] = await Promise.all([
    supabase
      .from("chat_pricing")
      .select("price, duration_days")
      .eq("looking_for_category", category)
      .maybeSingle(),
    supabase
      .from("platform_config")
      .select("key, value")
      .in("key", [DEFAULT_PRICE_KEY, DEFAULT_DURATION_KEY]),
  ])

  if (pricing) {
    return { price: pricing.price ?? 0, durationDays: pricing.duration_days ?? 30, configured: true }
  }

  const defaultMap = new Map<string, string>((defaults ?? []).map((r) => [r.key, r.value]))
  const price = parseInt(defaultMap.get(DEFAULT_PRICE_KEY) ?? "0", 10)
  const durationDays = parseInt(defaultMap.get(DEFAULT_DURATION_KEY) ?? "30", 10)
  return {
    price: Number.isFinite(price) ? price : 0,
    durationDays: Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 30,
    configured: false,
  }
}

/**
 * Effective unlock pricing for a user + category, applying any active offers
 * (highest discount + highest bonus duration, independently).
 */
export async function resolveEffectiveUnlockPricing(
  supabase: SupabaseLike,
  userId: string,
  category: string,
): Promise<EffectiveUnlockPricing> {
  const [base, activeOffers] = await Promise.all([
    resolveUnlockPricing(supabase, category),
    fetchActiveOffersForUser(supabase, userId),
  ])

  const benefit = resolveCategoryBenefit(activeOffers, category)
  const effectivePrice =
    benefit.discountedPrice != null ? Math.min(benefit.discountedPrice, base.price) : base.price
  const bonus = benefit.bonusDurationDays

  return {
    basePrice: base.price,
    effectivePrice,
    baseDurationDays: base.durationDays,
    bonusDurationDays: bonus,
    totalDurationDays: base.durationDays + bonus,
    hasOffer: benefit.discountedPrice != null || bonus > 0,
    offerTypes: benefit.offerTypes,
  }
}
