"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { ChatUnlockChoiceModal } from "@/components/chat/ChatUnlockChoiceModal"
import { ChatCardPickerModal } from "@/components/chat/ChatCardPickerModal"
import { createClient } from "@/lib/supabase/client"
import { createChatForCardPair } from "@/lib/chat"
import { resolveChatStart, completeDirectUnlock, type ChatViewer } from "@/lib/chatFlow"
import type { Counterpart } from "@/lib/lookingFor"
import { ageFromDateOfBirth } from "@/lib/utils/age"
import type { Card, CardInteraction } from "@/types"

interface PublicCardActionsCardProps {
  card: Card
  userId: string
}

export function PublicCardActionsCard({ card, userId }: PublicCardActionsCardProps) {
  const router = useRouter()
  const [interactions, setInteractions] = useState<CardInteraction[]>([])
  const [viewer, setViewer] = useState<ChatViewer | null>(null)
  const [shareCards, setShareCards] = useState<Card[]>([])
  const [shareCounterpart, setShareCounterpart] = useState<Counterpart | null>(null)
  const [unlockChoice, setUnlockChoice] = useState<{
    target: Card
    counterpart: Counterpart
    price: number
    durationDays: number
  } | null>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const [{ data: interactionData, error }, { data: profile }] = await Promise.all([
        supabase.from("card_interactions").select("*").eq("user_id", userId),
        supabase.from("profiles").select("gender, date_of_birth").eq("id", userId).maybeSingle(),
      ])

      if (error) {
        toast.error(error.message)
      } else {
        setInteractions((interactionData ?? []) as CardInteraction[])
      }

      if (profile) {
        setViewer({
          id: userId,
          gender: profile.gender,
          age: ageFromDateOfBirth(profile.date_of_birth),
        })
      }
    }

    void load()
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
    if (!viewer) {
      router.push("/login")
      return
    }
    try {
      const supabase = createClient()
      // Centralized flow: handles block status, gender eligibility, special-pair
      // counterpart resolution, and unlock state (fixes wrong-category prompts).
      const result = await resolveChatStart(supabase, viewer, card)
      switch (result.kind) {
        case "blocked":
          toast.error(result.message)
          return
        case "redirect":
          router.push(`/chat/${result.chatId}`)
          return
        case "pick":
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
    try {
      const supabase = createClient()
      const chatId = await createChatForCardPair(supabase, {
        userId,
        otherUserId: card.user_id,
        myCard,
        theirCard: card,
        targetGender: shareCounterpart?.looking_for_gender ?? null,
      })
      setShareCards([])
      setShareCounterpart(null)
      if (chatId) router.push(`/chat/${chatId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start chat")
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
      if (chatId) router.push(`/chat/${chatId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unlock chat")
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
        open={shareCards.length > 0}
        targetCard={card}
        cards={shareCards}
        onSelect={(c) => void handleShareCardSelect(c)}
        onClose={() => {
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
        onUnlock={() => void handleDirectUnlock()}
        onClose={() => setUnlockChoice(null)}
      />
    </>
  )
}
