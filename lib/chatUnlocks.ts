import type { SupabaseClient } from "@supabase/supabase-js"
import type { Card, Gender } from "@/types"

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">

function nowIso() {
  return new Date().toISOString()
}

/** Stable key for a category + target-gender unlock. */
export function chatUnlockKey(category: string, targetGender: Gender | null) {
  return `${category}::${targetGender ?? "null"}`
}

/** Whether the user holds an active unlock for the given category + target-gender pair. */
export async function hasActiveUnlock(
  supabase: SupabaseLike,
  userId: string,
  category: string,
  targetGender: Gender | null,
): Promise<boolean> {
  let query = supabase
    .from("chat_unlocks")
    .select("id")
    .eq("user_id", userId)
    .eq("looking_for_category", category)
    .gt("expires_at", nowIso())

  query = targetGender == null ? query.is("target_gender", null) : query.eq("target_gender", targetGender)

  const { data } = await query.limit(1)
  return (data?.length ?? 0) > 0
}

/** Whether a card should be chat-enabled because a matching unlock is currently active. */
export async function shouldEnableChatForCard(
  supabase: SupabaseLike,
  userId: string,
  card: Pick<Card, "looking_for" | "looking_for_gender">,
) {
  return hasActiveUnlock(supabase, userId, card.looking_for, card.looking_for_gender)
}

/** Enable chat on every non-closed card the user owns in this category + target-gender pair. */
export async function enableChatForCategory(
  supabase: SupabaseLike,
  userId: string,
  category: string,
  targetGender: Gender | null,
) {
  let query = supabase
    .from("cards")
    .update({ chat_enabled: true })
    .eq("user_id", userId)
    .eq("looking_for", category)
    .eq("is_closed", false)

  query = targetGender == null ? query.is("looking_for_gender", null) : query.eq("looking_for_gender", targetGender)
  await query
}
