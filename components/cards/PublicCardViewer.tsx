"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { ChatCardPickerModal } from "@/components/chat/ChatCardPickerModal"
import { createChatForCardPair, fetchEligibleShareCards } from "@/lib/chat"
import { adjustCardMetric } from "@/lib/cardMetrics"
import type { Card, CardInteraction } from "@/types"

export function PublicCardViewer({ card }: { card: Card }) {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [interactions, setInteractions] = useState<CardInteraction[]>([])
  const [chatTargetCard, setChatTargetCard] = useState<Card | null>(null)
  const [shareCards, setShareCards] = useState<Card[]>([])

  useEffect(() => {
    const supabase = createClient()
    let active = true

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return

      if (!user) {
        setUserId("")
        setInteractions([])
        return
      }

      setUserId(user.id)
      const { data, error } = await supabase
        .from("card_interactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("card_id", card.id)

      if (!active) return
      if (error) {
        toast.error(error.message)
        return
      }

      setInteractions((data ?? []) as CardInteraction[])
    })()

    return () => {
      active = false
    }
  }, [card.id])

  async function handleInteraction(type: "like" | "save") {
    if (!userId) {
      router.push("/login")
      return
    }

    const supabase = createClient()
    const existing = interactions.find((interaction) => interaction.card_id === card.id && interaction.type === type)

    if (existing) {
      const { error } = await supabase.from("card_interactions").delete().eq("id", existing.id)
      if (error) {
        toast.error(error.message)
        return
      }
      const { error: metricError } = await adjustCardMetric(supabase, card.id, type === "like" ? "like_count" : "save_count", -1)
      if (metricError) {
        toast.error(metricError.message)
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
      .select("*")
      .single()

    if (error) {
      toast.error(error.message)
      return
    }

    const { error: metricError } = await adjustCardMetric(supabase, card.id, type === "like" ? "like_count" : "save_count", 1)
    if (metricError) {
      toast.error(metricError.message)
    }

    if (data) setInteractions((prev) => [...prev, data as CardInteraction])
  }

  async function handleChat() {
    if (!userId) {
      router.push("/login")
      return
    }

    try {
      const supabase = createClient()
      const { data: unlocks } = await supabase
        .from("chat_unlocks")
        .select("id")
        .eq("user_id", userId)
        .eq("looking_for_category", card.looking_for)
        .gt("expires_at", new Date().toISOString())

      if (!unlocks?.length) {
        toast.error(`You need an active card with "Looking For: ${card.looking_for}" to chat.`)
        router.push("/cards")
        return
      }

      const eligibleCards = await fetchEligibleShareCards(supabase, userId, card.looking_for)

      if (eligibleCards.length === 0) {
        toast.error(`No enabled card found with "Looking For: ${card.looking_for}".`)
        return
      }

      if (eligibleCards.length === 1) {
        const chatId = await createChatForCardPair(supabase, {
          userId,
          otherUserId: card.user_id,
          myCard: eligibleCards[0],
          theirCard: card,
        })
        if (chatId) router.push(`/chat/${chatId}`)
        return
      }

      setChatTargetCard(card)
      setShareCards(eligibleCards)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start chat"
      toast.error(message)
    }
  }

  async function handleShareCardSelect(myCard: Card) {
    if (!chatTargetCard) return
    try {
      const supabase = createClient()
      const chatId = await createChatForCardPair(supabase, {
        userId,
        otherUserId: chatTargetCard.user_id,
        myCard,
        theirCard: chatTargetCard,
      })
      setChatTargetCard(null)
      setShareCards([])
      if (chatId) router.push(`/chat/${chatId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start chat"
      toast.error(message)
    }
  }

  return (
    <>
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

      <ChatCardPickerModal
        open={!!chatTargetCard}
        targetCard={chatTargetCard}
        cards={shareCards}
        onSelect={handleShareCardSelect}
        onClose={() => {
          setChatTargetCard(null)
          setShareCards([])
        }}
      />
    </>
  )
}
