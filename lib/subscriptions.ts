import type { SupabaseClient } from "@supabase/supabase-js"
import type { Gender, PrioritizationPlan, PrioritizationType } from "@/types"
import { enableChatForCategory, isApprovedLookingForCategory } from "@/lib/chatUnlocks"

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">

export interface UnlockCategory {
  looking_for: string
  price: number
  durationDays: number
}

/** All selectable "Looking For" categories with their unlock price + duration. */
export async function fetchUnlockCategories(supabase: SupabaseLike): Promise<UnlockCategory[]> {
  const [{ data: options }, { data: pricing }] = await Promise.all([
    supabase
      .from("field_options")
      .select("value")
      .eq("field_name", "looking_for")
      .eq("is_approved", true)
      .eq("is_hidden", false)
      .order("value"),
    supabase.from("chat_pricing").select("looking_for_category, price, duration_days"),
  ])

  const priceMap = new Map<string, { price: number; duration_days: number }>()
  for (const row of pricing ?? []) {
    priceMap.set(row.looking_for_category, { price: row.price, duration_days: row.duration_days })
  }

  return (options ?? []).map((opt) => {
    const p = priceMap.get(opt.value)
    return {
      looking_for: opt.value,
      price: p?.price ?? 0,
      durationDays: p?.duration_days ?? 30,
    }
  })
}

/** Record a category-based chat unlock (mock payment success) and enable matching cards. */
export async function createCategoryUnlock(
  supabase: SupabaseLike,
  userId: string,
  category: string,
  gender: Gender | null,
  durationDays: number,
) {
  const isApproved = await isApprovedLookingForCategory(supabase, category)
  if (!isApproved) {
    throw new Error("This Looking For option must be approved before chats can be unlocked.")
  }

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from("chat_unlocks").insert({
    user_id: userId,
    card_id: null,
    looking_for_category: category,
    target_gender: gender,
    expires_at: expiresAt,
  })
  await enableChatForCategory(supabase, userId, category, gender)
}

export async function fetchPrioritizationPlans(
  supabase: SupabaseLike,
  planType: PrioritizationType,
): Promise<PrioritizationPlan[]> {
  const { data } = await supabase
    .from("prioritization_plans")
    .select("*")
    .eq("plan_type", planType)
    .order("duration_days", { ascending: true })
  return (data ?? []) as PrioritizationPlan[]
}

/** Apply a prioritization plan to a card (mock payment success). */
export async function createCardPrioritization(
  supabase: SupabaseLike,
  userId: string,
  cardId: string,
  plan: PrioritizationPlan,
) {
  const expiresAt = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from("card_prioritizations").insert({
    card_id: cardId,
    user_id: userId,
    plan_type: plan.plan_type,
    plan_id: plan.id,
    expires_at: expiresAt,
  })
}
