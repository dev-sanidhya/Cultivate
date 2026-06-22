import type { Card, Gender } from "@/types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getConversationBlockStatus } from "@/lib/blocks"
import { hasActiveUnlock, isApprovedLookingForCategory } from "@/lib/chatUnlocks"

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">

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
  targetGender: Gender | null = null,
) {
  const isApproved = await isApprovedLookingForCategory(supabase, lookingFor)
  if (!isApproved) return []

  const activeUnlock = await hasActiveUnlock(supabase, userId, lookingFor, targetGender)

  let query = supabase
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .eq("looking_for", lookingFor)
    .eq("is_closed", false)
    .eq("is_public", true)

  if (!activeUnlock) {
    query = query.eq("chat_enabled", true)
  }

  query = targetGender == null ? query.is("looking_for_gender", null) : query.eq("looking_for_gender", targetGender)

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error

  if (activeUnlock && (data ?? []).some((card) => !card.chat_enabled)) {
    let repairQuery = supabase
      .from("cards")
      .update({ chat_enabled: true })
      .eq("user_id", userId)
      .eq("looking_for", lookingFor)
      .eq("is_closed", false)

    repairQuery = targetGender == null ? repairQuery.is("looking_for_gender", null) : repairQuery.eq("looking_for_gender", targetGender)
    await repairQuery
  }

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
    targetGender?: Gender | null
  },
) {
  const isApproved = await isApprovedLookingForCategory(supabase, params.myCard.looking_for)
  if (!isApproved) {
    throw new Error("This Looking For option must be approved before chats can be unlocked.")
  }

  const blockStatus = await getConversationBlockStatus(supabase, {
    userId: params.userId,
    otherUserId: params.otherUserId,
  })

  if (blockStatus.blockedByOther && blockStatus.blockedByMe) {
    throw new Error("This conversation is blocked. Unblock this user from your profile to start a new chat.")
  }

  if (blockStatus.blockedByOther) {
    throw new Error("You are not allowed to contact this person.")
  }

  if (blockStatus.blockedByMe) {
    throw new Error("You have blocked this user. Unblock them from your profile to contact them again.")
  }

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
      target_gender: params.targetGender ?? params.myCard.looking_for_gender ?? null,
    })
    .select("id")
    .single()

  if (error) throw error
  return data?.id ?? null
}
