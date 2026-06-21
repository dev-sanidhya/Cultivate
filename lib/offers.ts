import type { SupabaseClient } from "@supabase/supabase-js"
import type { Offer, OfferCategoryBenefit, OfferType, UserOffer } from "@/types"

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">

export interface ActiveOffer {
  offer: Offer
  benefits: OfferCategoryBenefit[]
  /** When this active offer window expires (per-user for welcome/card_creation, global for occasional). */
  expiresAt: string
  /** When this offer window started (used to order countdowns - earliest first). */
  startedAt: string
}

export interface CategoryBenefit {
  /** Discounted unlock price (paise), or null if no active discount for this category. */
  discountedPrice: number | null
  /** Highest bonus duration (days) among active offers for this category. */
  bonusDurationDays: number
  /** The offer types contributing a benefit (for conversion tracking). */
  offerTypes: OfferType[]
}

function nowIso() {
  return new Date().toISOString()
}

/** Compute the expiry of an offer window given a start time + availability length. */
export function windowExpiry(startIso: string, days: number, hours: number): string {
  const ms = (days * 24 + hours) * 60 * 60 * 1000
  return new Date(new Date(startIso).getTime() + ms).toISOString()
}

/**
 * All offers currently active for a given user:
 * - welcome / card_creation: a non-expired `user_offers` window exists.
 * - occasional: the offer is active and within its global activation window.
 */
export async function fetchActiveOffersForUser(
  supabase: SupabaseLike,
  userId: string,
): Promise<ActiveOffer[]> {
  const now = nowIso()

  const [{ data: offersData }, { data: userOffersData }] = await Promise.all([
    supabase.from("offers").select("*, benefits:offer_category_benefits(*)").eq("is_active", true),
    supabase.from("user_offers").select("*").eq("user_id", userId).gt("expires_at", now),
  ])

  const offers = (offersData ?? []) as (Offer & { benefits: OfferCategoryBenefit[] })[]
  const userOffers = (userOffersData ?? []) as UserOffer[]
  const userOfferByType = new Map<OfferType, UserOffer>()
  for (const uo of userOffers) userOfferByType.set(uo.offer_type, uo)

  const active: ActiveOffer[] = []

  for (const offer of offers) {
    const benefits = offer.benefits ?? []
    if (offer.offer_type === "occasional") {
      // Global window keyed off activation_at + availability length.
      if (!offer.activation_at) continue
      if (new Date(offer.activation_at).getTime() > Date.now()) continue
      const expiresAt = windowExpiry(offer.activation_at, offer.availability_days, offer.availability_hours)
      if (new Date(expiresAt).getTime() <= Date.now()) continue
      active.push({ offer, benefits, expiresAt, startedAt: offer.activation_at })
    } else {
      // Per-user window.
      const uo = userOfferByType.get(offer.offer_type)
      if (!uo) continue
      active.push({ offer, benefits, expiresAt: uo.expires_at, startedAt: uo.starts_at })
    }
  }

  return active
}

/**
 * Best combined benefit for a category across active offers:
 * highest price discount (lowest discounted price) and highest bonus duration,
 * computed independently (per spec).
 */
export function resolveCategoryBenefit(
  activeOffers: ActiveOffer[],
  category: string,
): CategoryBenefit {
  let discountedPrice: number | null = null
  let bonusDurationDays = 0
  const offerTypes: OfferType[] = []

  for (const a of activeOffers) {
    const benefit = a.benefits.find((b) => b.looking_for_category === category)
    if (!benefit) continue
    let contributed = false
    if (benefit.discounted_price != null) {
      if (discountedPrice == null || benefit.discounted_price < discountedPrice) {
        discountedPrice = benefit.discounted_price
      }
      contributed = true
    }
    if (benefit.bonus_duration_days > bonusDurationDays) {
      bonusDurationDays = benefit.bonus_duration_days
      contributed = true
    }
    if (contributed && !offerTypes.includes(a.offer.offer_type)) {
      offerTypes.push(a.offer.offer_type)
    }
  }

  return { discountedPrice, bonusDurationDays, offerTypes }
}

/**
 * The active offer whose countdown should be shown: the one that started first.
 * When it expires, the next one surfaces automatically on the next load.
 */
export function primaryCountdownOffer(activeOffers: ActiveOffer[]): ActiveOffer | null {
  if (activeOffers.length === 0) return null
  return [...activeOffers].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  )[0]
}

/** Create a per-user offer window (welcome on signup, card_creation on qualifying card). */
export async function startUserOfferWindow(
  supabase: SupabaseLike,
  userId: string,
  offerType: Exclude<OfferType, "occasional">,
  triggerCardId: string | null = null,
): Promise<void> {
  const { data: offer } = await supabase
    .from("offers")
    .select("id, is_active, availability_days, availability_hours")
    .eq("offer_type", offerType)
    .maybeSingle()

  if (!offer || !offer.is_active) return

  const startsAt = nowIso()
  const expiresAt = windowExpiry(startsAt, offer.availability_days, offer.availability_hours)

  // One window per (user, offer_type); a new qualifying trigger restarts the timer.
  await supabase.from("user_offers").upsert(
    {
      user_id: userId,
      offer_id: offer.id,
      offer_type: offerType,
      trigger_card_id: triggerCardId,
      starts_at: startsAt,
      expires_at: expiresAt,
    },
    { onConflict: "user_id,offer_type" },
  )
}
