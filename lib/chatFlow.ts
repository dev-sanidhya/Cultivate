import type { SupabaseClient } from "@supabase/supabase-js"
import type { Card, Gender } from "@/types"
import { getConversationBlockStatus } from "@/lib/blocks"
import { createChatForCardPair, fetchEligibleShareCards } from "@/lib/chat"
import {
  getCounterpart,
  ineligibleContactMessage,
  viewerCanContact,
  type Counterpart,
} from "@/lib/lookingFor"
import { generateCardId } from "@/lib/utils/cardId"

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">

export interface ChatViewer {
  id: string
  gender: Gender
  age: number
}

export type ChatFlowResult =
  | { kind: "redirect"; chatId: string }
  | { kind: "blocked"; message: string }
  | { kind: "pick"; cards: Card[]; target: Card; counterpart: Counterpart }
  | {
      kind: "needUnlock"
      target: Card
      counterpart: Counterpart
      price: number
      durationDays: number
    }

function nowIso() {
  return new Date().toISOString()
}

/** Whether the user holds an active unlock for the given (category, gender) pair. */
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

async function fetchPricing(supabase: SupabaseLike, category: string) {
  const { data } = await supabase
    .from("chat_pricing")
    .select("price, duration_days")
    .eq("looking_for_category", category)
    .maybeSingle()
  return {
    price: data?.price ?? 0,
    durationDays: data?.duration_days ?? 30,
  }
}

/** Enable chat on every (non-closed) card the user owns in this (category, gender). */
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

  query = targetGender == null ? query.is("looking_for_gender", null) : query.eq("looking_for_gender", targetGender)
  await query
}

/** Create the counterpart card used to chat (age/gender from profile, rest empty). */
export async function createCounterpartCard(
  supabase: SupabaseLike,
  viewer: ChatViewer,
  counterpart: Counterpart,
): Promise<Card> {
  let cardId = generateCardId()
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: existing } = await supabase.from("cards").select("id").eq("card_id", cardId).maybeSingle()
    if (!existing) break
    cardId = generateCardId()
  }

  const { data, error } = await supabase
    .from("cards")
    .insert({
      card_id: cardId,
      user_id: viewer.id,
      age: viewer.age,
      gender: viewer.gender,
      looking_for: counterpart.looking_for,
      looking_for_gender: counterpart.looking_for_gender,
      chat_enabled: true,
      is_public: true,
    })
    .select("*")
    .single()

  if (error) throw error
  return data as Card
}

/**
 * Resolve what should happen when the viewer taps "Chat" on a target card.
 * Handles block status, gender eligibility, special-pair counterpart, and unlock state.
 */
export async function resolveChatStart(
  supabase: SupabaseLike,
  viewer: ChatViewer,
  target: Card,
): Promise<ChatFlowResult> {
  // Block status
  const blockStatus = await getConversationBlockStatus(supabase, {
    userId: viewer.id,
    otherUserId: target.user_id,
  })
  if (blockStatus.blockedByOther) {
    return { kind: "blocked", message: "You are not allowed to contact this person." }
  }
  if (blockStatus.blockedByMe) {
    return {
      kind: "blocked",
      message: "You have blocked this user. Unblock them from your profile to contact them again.",
    }
  }

  const targetShape = { looking_for: target.looking_for, looking_for_gender: target.looking_for_gender }

  // Gender eligibility (visible-but-blocked message)
  if (!viewerCanContact(targetShape, target.gender, viewer.gender)) {
    return { kind: "blocked", message: ineligibleContactMessage(targetShape, target.gender) }
  }

  const counterpart = getCounterpart(targetShape, target.gender)
  if (!counterpart.looking_for) {
    return { kind: "blocked", message: "You cannot chat with this user." }
  }

  const unlocked = await hasActiveUnlock(supabase, viewer.id, counterpart.looking_for, counterpart.looking_for_gender)

  if (!unlocked) {
    const { price, durationDays } = await fetchPricing(supabase, counterpart.looking_for)
    return { kind: "needUnlock", target, counterpart, price, durationDays }
  }

  // Unlocked: find an eligible owned card; auto-create one if missing.
  let eligibleCards = await fetchEligibleShareCards(
    supabase,
    viewer.id,
    counterpart.looking_for,
    counterpart.looking_for_gender,
  )

  if (eligibleCards.length === 0) {
    const newCard = await createCounterpartCard(supabase, viewer, counterpart)
    eligibleCards = [newCard]
  }

  if (eligibleCards.length === 1) {
    const chatId = await createChatForCardPair(supabase, {
      userId: viewer.id,
      otherUserId: target.user_id,
      myCard: eligibleCards[0],
      theirCard: target,
      targetGender: counterpart.looking_for_gender,
    })
    if (!chatId) return { kind: "blocked", message: "Failed to start chat" }
    return { kind: "redirect", chatId }
  }

  return { kind: "pick", cards: eligibleCards, target, counterpart }
}

/**
 * Complete a direct chat unlock (after a successful/mock payment):
 * create the counterpart card, record the unlock, enable chat on same-category cards,
 * and open the conversation with the target card.
 */
export async function completeDirectUnlock(
  supabase: SupabaseLike,
  viewer: ChatViewer,
  target: Card,
  counterpart: Counterpart,
  durationDays: number,
): Promise<string> {
  const newCard = await createCounterpartCard(supabase, viewer, counterpart)

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from("chat_unlocks").insert({
    user_id: viewer.id,
    card_id: newCard.id,
    looking_for_category: counterpart.looking_for,
    target_gender: counterpart.looking_for_gender,
    expires_at: expiresAt,
  })

  await enableChatForCategory(supabase, viewer.id, counterpart.looking_for, counterpart.looking_for_gender)

  const chatId = await createChatForCardPair(supabase, {
    userId: viewer.id,
    otherUserId: target.user_id,
    myCard: newCard,
    theirCard: target,
    targetGender: counterpart.looking_for_gender,
  })
  if (!chatId) throw new Error("Failed to start chat")
  return chatId
}
