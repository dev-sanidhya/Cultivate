import type { SupabaseClient } from "@supabase/supabase-js"
import type { Gender, PrioritizationType } from "@/types"
import { formatLookingFor } from "@/lib/lookingFor"

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">

function nowIso() {
  return new Date().toISOString()
}

/**
 * Lazily generate expiry notifications for the current user (no cron):
 * - Card prioritization windows that have ended.
 * - Chat unlock periods that have ended (also re-locks chat for that category).
 * Each source row is marked notified so it only fires once.
 */
export async function runExpiryNotifications(supabase: SupabaseLike, userId: string) {
  await Promise.all([
    notifyExpiredPrioritizations(supabase, userId),
    notifyExpiredChatUnlocks(supabase, userId),
  ])
}

async function notifyExpiredPrioritizations(supabase: SupabaseLike, userId: string) {
  const { data } = await supabase
    .from("card_prioritizations")
    .select("id, plan_type, prioritized_view_count, card:card_id(card_id)")
    .eq("user_id", userId)
    .eq("expiry_notified", false)
    .lt("expires_at", nowIso())

  const rows = (data ?? []) as unknown as {
    id: string
    plan_type: PrioritizationType
    prioritized_view_count: number
    card: { card_id: string } | { card_id: string }[] | null
  }[]

  if (rows.length === 0) return

  for (const row of rows) {
    const cardRel = Array.isArray(row.card) ? row.card[0] : row.card
    const humanId = cardRel?.card_id ?? "your"
    const views = row.prioritized_view_count ?? 0
    const prioritizationLabel = `${row.plan_type}-Prioritization`
    const message =
      `The ${prioritizationLabel} period for your #${humanId} card has ended. ` +
      `Your card will no longer be displayed before other cards in the search results. ` +
      `During the ${prioritizationLabel} period, your card was viewed by ${views} ${views === 1 ? "user" : "users"}. ` +
      `If you have not yet found the person you are looking for, you can get prioritization again to increase its visibility.`

    await supabase.from("notifications").insert({
      user_id: userId,
      message,
      type: "prioritization_expired",
      metadata: { card_id: humanId, views, plan_type: row.plan_type },
    })
  }

  await supabase
    .from("card_prioritizations")
    .update({ expiry_notified: true })
    .in("id", rows.map((r) => r.id))
}

async function notifyExpiredChatUnlocks(supabase: SupabaseLike, userId: string) {
  const { data } = await supabase
    .from("chat_unlocks")
    .select("id, looking_for_category, target_gender, expires_at")
    .eq("user_id", userId)
    .eq("expiry_notified", false)
    .lt("expires_at", nowIso())

  const rows = (data ?? []) as {
    id: string
    looking_for_category: string
    target_gender: Gender | null
  }[]

  if (rows.length === 0) return

  for (const row of rows) {
    const label = formatLookingFor(row.looking_for_category, row.target_gender)
    const message =
      `The chat unlock period for your "${label}" card has ended, and chat has been locked again for this card. ` +
      `To continue chatting with users interested in this category, please unlock chat again for this card.`

    await supabase.from("notifications").insert({
      user_id: userId,
      message,
      type: "chat_unlock_expired",
      metadata: { looking_for: row.looking_for_category, target_gender: row.target_gender },
    })

    // Re-lock chat for this category/gender if no other active unlock remains.
    let activeQuery = supabase
      .from("chat_unlocks")
      .select("id")
      .eq("user_id", userId)
      .eq("looking_for_category", row.looking_for_category)
      .gt("expires_at", nowIso())
    activeQuery = row.target_gender == null
      ? activeQuery.is("target_gender", null)
      : activeQuery.eq("target_gender", row.target_gender)

    const { data: stillActive } = await activeQuery.limit(1)
    if ((stillActive?.length ?? 0) === 0) {
      let cardsQuery = supabase
        .from("cards")
        .update({ chat_enabled: false })
        .eq("user_id", userId)
        .eq("looking_for", row.looking_for_category)
      cardsQuery = row.target_gender == null
        ? cardsQuery.is("looking_for_gender", null)
        : cardsQuery.eq("looking_for_gender", row.target_gender)
      await cardsQuery
    }
  }

  await supabase
    .from("chat_unlocks")
    .update({ expiry_notified: true })
    .in("id", rows.map((r) => r.id))
}
