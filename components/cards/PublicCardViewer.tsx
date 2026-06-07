"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { ChatCardPickerModal } from "@/components/chat/ChatCardPickerModal"
import { ChatUnlockChoiceModal } from "@/components/chat/ChatUnlockChoiceModal"
import { createChatForCardPair } from "@/lib/chat"
import { resolveChatStart, completeDirectUnlock, type ChatViewer } from "@/lib/chatFlow"
import { adjustCardMetric } from "@/lib/cardMetrics"
import { ageFromDateOfBirth } from "@/lib/utils/age"
import type { Counterpart } from "@/lib/lookingFor"
import type { Card, CardInteraction } from "@/types"

interface UnlockChoiceState {
  target: Card
  counterpart: Counterpart
  price: number
  durationDays: number
}

export function PublicCardViewer({ card }: { card: Card }) {
  const router = useRouter()
  const [viewer, setViewer] = useState<ChatViewer | null>(null)
  const [interactions, setInteractions] = useState<CardInteraction[]>([])
  const [chatTargetCard, setChatTargetCard] = useState<Card | null>(null)
  const [shareCards, setShareCards] = useState<Card[]>([])
  const [shareCounterpart, setShareCounterpart] = useState<Counterpart | null>(null)
  const [unlockChoice, setUnlockChoice] = useState<UnlockChoiceState | null>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)

  const userId = viewer?.id ?? ""

  useEffect(() => {
    const supabase = createClient()
    let active = true

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return

      if (!user) {
        setViewer(null)
        setInteractions([])
        return
      }

      const [{ data: profile }, { data, error }] = await Promise.all([
        supabase.from("profiles").select("gender, date_of_birth").eq("id", user.id).single(),
        supabase.from("card_interactions").select("*").eq("user_id", user.id).eq("card_id", card.id),
      ])

      if (!active) return

      if (profile) {
        setViewer({
          id: user.id,
          gender: profile.gender,
          age: ageFromDateOfBirth(profile.date_of_birth),
        })
      }

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
    if (!viewer) {
      router.push("/login")
      return
    }

    try {
      const supabase = createClient()
      const result = await resolveChatStart(supabase, viewer, card)

      switch (result.kind) {
        case "blocked":
          toast.error(result.message)
          return
        case "redirect":
          router.push(`/chat/${result.chatId}`)
          return
        case "pick":
          setChatTargetCard(result.target)
          setShareCards(result.cards)
          setShareCounterpart(result.counterpart)
          return
        case "needUnlock":
          setUnlockChoice({
            target: result.target,
            counterpart: result.counterpart,
            price: result.price,
            durationDays: result.durationDays,
          })
          return
      }
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
        targetGender: shareCounterpart?.looking_for_gender ?? null,
      })
      setChatTargetCard(null)
      setShareCards([])
      setShareCounterpart(null)
      if (chatId) router.push(`/chat/${chatId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start chat"
      toast.error(message)
    }
  }

  async function handleDirectUnlock() {
    if (!viewer || !unlockChoice) return
    setUnlockLoading(true)
    try {
      const supabase = createClient()
      const chatId = await completeDirectUnlock(
        supabase,
        viewer,
        unlockChoice.target,
        unlockChoice.counterpart,
        unlockChoice.durationDays,
      )
      setUnlockChoice(null)
      router.push(`/chat/${chatId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unlock chat"
      toast.error(message)
    } finally {
      setUnlockLoading(false)
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
          setShareCounterpart(null)
        }}
      />

      <ChatUnlockChoiceModal
        open={!!unlockChoice}
        target={unlockChoice?.target ?? null}
        counterpart={unlockChoice?.counterpart ?? null}
        price={unlockChoice?.price ?? 0}
        durationDays={unlockChoice?.durationDays ?? 0}
        loading={unlockLoading}
        onUnlock={() => {
          void handleDirectUnlock()
        }}
        onClose={() => setUnlockChoice(null)}
      />
    </>
  )
}
