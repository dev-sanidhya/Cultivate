import type { Card } from "@/types"
import type { SupabaseClient } from "@supabase/supabase-js"

type SupabaseLike = Pick<SupabaseClient, "from">

export interface ChatCardRelation {
  initiator_id: string
  recipient_id: string
  initiator_card?: Card | null
  recipient_card?: Card | null
}

export function getChatCardsForViewer(chat: ChatCardRelation, viewerId: string) {
  const isInitiator = chat.initiator_id === viewerId

  return {
    myCard: (isInitiator ? chat.initiator_card : chat.recipient_card) ?? null,
    theirCard: (isInitiator ? chat.recipient_card : chat.initiator_card) ?? null,
    isInitiator,
  }
}

export async function fetchEligibleShareCards(
  supabase: SupabaseLike,
  userId: string,
  lookingFor: string,
) {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .eq("looking_for", lookingFor)
    .eq("chat_enabled", true)
    .eq("is_closed", false)
    .eq("is_public", true)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Card[]
}

export async function findExistingChatForCardPair(
  supabase: SupabaseLike,
  params: {
    userId: string
    otherUserId: string
    myCardId: string
    theirCardId: string
  },
) {
  const { data, error } = await supabase
    .from("chats")
    .select("id")
    .or(
      `and(initiator_id.eq.${params.userId},recipient_id.eq.${params.otherUserId},initiator_card_id.eq.${params.myCardId},recipient_card_id.eq.${params.theirCardId}),and(initiator_id.eq.${params.otherUserId},recipient_id.eq.${params.userId},initiator_card_id.eq.${params.theirCardId},recipient_card_id.eq.${params.myCardId})`,
    )
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

export async function createChatForCardPair(
  supabase: SupabaseLike,
  params: {
    userId: string
    otherUserId: string
    myCard: Card
    theirCard: Card
  },
) {
  const existingChatId = await findExistingChatForCardPair(supabase, {
    userId: params.userId,
    otherUserId: params.otherUserId,
    myCardId: params.myCard.id,
    theirCardId: params.theirCard.id,
  })

  if (existingChatId) return existingChatId

  const { data, error } = await supabase
    .from("chats")
    .insert({
      initiator_id: params.userId,
      recipient_id: params.otherUserId,
      initiator_card_id: params.myCard.id,
      recipient_card_id: params.theirCard.id,
      looking_for_category: params.theirCard.looking_for,
    })
    .select("id")
    .single()

  if (error) throw error
  return data?.id ?? null
}
