"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { createClient } from "@/lib/supabase/client"
import { createChatForCardPair, fetchEligibleShareCards } from "@/lib/chat"
import { getConversationBlockStatus } from "@/lib/blocks"
import { formatLookingFor } from "@/lib/lookingFor"
import type { Card, CardInteraction } from "@/types"

interface PublicCardActionsCardProps {
  card: Card
  userId: string
}

export function PublicCardActionsCard({ card, userId }: PublicCardActionsCardProps) {
  const router = useRouter()
  const [interactions, setInteractions] = useState<CardInteraction[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function loadInteractions() {
      const { data, error } = await supabase
        .from("card_interactions")
        .select("*")
        .eq("user_id", userId)

      if (error) {
        toast.error(error.message)
        return
      }

      setInteractions((data ?? []) as CardInteraction[])
    }

    void loadInteractions()
  }, [userId])

  async function handleInteraction(type: "like" | "save") {
    const supabase = createClient()
    const existing = interactions.find((interaction) => interaction.card_id === card.id && interaction.type === type)

    if (existing) {
      const { error } = await supabase.from("card_interactions").delete().eq("id", existing.id)
      if (error) {
        toast.error(error.message)
        return
      }
      setInteractions((prev) => prev.filter((interaction) => interaction.id !== existing.id))
      return
    }

    const { data, error } = await supabase
      .from("card_interactions")
      .insert({
        user_id: userId,
        card_id: card.id,
        type,
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      return
    }

    if (data) setInteractions((prev) => [...prev, data as CardInteraction])
  }

  async function handleChat() {
    try {
      const supabase = createClient()
      const blockStatus = await getConversationBlockStatus(supabase, {
        userId,
        otherUserId: card.user_id,
      })

      if (blockStatus.blockedByOther || blockStatus.blockedByMe) {
        toast.error(
          blockStatus.blockedByOther
            ? "You are not allowed to contact this person."
            : "You have blocked this user. Unblock them from your profile to contact them again.",
        )
        return
      }

      const { data: unlocks } = await supabase
        .from("chat_unlocks")
        .select("id")
        .eq("user_id", userId)
        .eq("looking_for_category", card.looking_for)
        .gt("expires_at", new Date().toISOString())

      if (!unlocks?.length) {
        toast.error(`You need an active card with "Looking For: ${formatLookingFor(card.looking_for, card.looking_for_gender)}" to chat.`)
        router.push("/cards")
        return
      }

      const eligibleCards = await fetchEligibleShareCards(supabase, userId, card.looking_for)

      if (eligibleCards.length === 0) {
        toast.error(`No enabled card found with "Looking For: ${formatLookingFor(card.looking_for, card.looking_for_gender)}".`)
        return
      }

      const chatId = await createChatForCardPair(supabase, {
        userId,
        otherUserId: card.user_id,
        myCard: eligibleCards[0],
        theirCard: card,
      })

      if (chatId) router.push(`/chat/${chatId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start chat"
      toast.error(message)
    }
  }

  return (
    <PersonalityCard
      card={card}
      mode="search"
      interactions={interactions}
      onLike={() => {
        void handleInteraction("like")
      }}
      onSave={() => {
        void handleInteraction("save")
      }}
      onChat={() => {
        void handleChat()
      }}
      showBrandMark
    />
  )
}
