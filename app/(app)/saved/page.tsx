"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { ChatCardPickerModal } from "@/components/chat/ChatCardPickerModal"
import { Spinner } from "@/components/ui/Spinner"
import type { Card, CardInteraction } from "@/types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createChatForCardPair, fetchEligibleShareCards } from "@/lib/chat"

type Tab = "liked" | "saved"

export default function SavedPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("liked")
  const [likedCards, setLikedCards] = useState<Card[]>([])
  const [savedCards, setSavedCards] = useState<Card[]>([])
  const [interactions, setInteractions] = useState<CardInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [chatTargetCard, setChatTargetCard] = useState<Card | null>(null)
  const [shareCards, setShareCards] = useState<Card[]>([])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user!.id)

    const { data: allInteractions } = await supabase
      .from("card_interactions")
      .select("*, card:card_id(*)")
      .eq("user_id", user!.id)
      .in("type", ["like", "save", "read"])

    const liked: Card[] = []
    const saved: Card[] = []
    for (const i of allInteractions ?? []) {
      if (i.type === "like" && i.card) liked.push(i.card as Card)
      if (i.type === "save" && i.card) saved.push(i.card as Card)
    }

    setLikedCards(liked)
    setSavedCards(saved)
    setInteractions((allInteractions ?? []) as CardInteraction[])
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadData()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  async function handleInteraction(card: Card, type: "like" | "save" | "read") {
    const supabase = createClient()
    const existing = interactions.find((i) => i.card_id === card.id && i.type === type)
    if (existing) {
      await supabase.from("card_interactions").delete().eq("id", existing.id)
      setInteractions((prev) => prev.filter((i) => i.id !== existing.id))
      if (type === "like") setLikedCards((prev) => prev.filter((c) => c.id !== card.id))
      if (type === "save") setSavedCards((prev) => prev.filter((c) => c.id !== card.id))
      return
    }

    const { data, error } = await supabase.from("card_interactions").insert({
      user_id: userId,
      card_id: card.id,
      type,
    }).select().single()

    if (error) {
      toast.error(error.message)
      return
    }

    if (data) {
      setInteractions((prev) => [...prev, data])
      if (type === "like") setLikedCards((prev) => (prev.some((c) => c.id === card.id) ? prev : [...prev, card]))
      if (type === "save") setSavedCards((prev) => (prev.some((c) => c.id === card.id) ? prev : [...prev, card]))
    }
  }

  async function handleChat(card: Card) {
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

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>

  const displayCards = tab === "liked" ? likedCards : savedCards

  return (
    <div className="page-container" style={{ paddingTop: 18 }}>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "var(--color-primary-bg)", padding: 4, borderRadius: 12 }}>
        {([["liked", `❤️ Liked (${likedCards.length})`], ["saved", `🔖 Saved (${savedCards.length})`]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600,
              background: tab === key ? "white" : "transparent",
              color: tab === key ? "var(--color-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
              boxShadow: tab === key ? "var(--shadow-sm)" : "none",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {displayCards.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{tab === "liked" ? "❤️" : "🔖"}</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>
            No {tab} cards yet
          </p>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 8 }}>
            Cards you {tab} will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {displayCards.map((card) => (
            <PersonalityCard
              key={card.id}
              card={card}
              mode="search"
              interactions={interactions}
              onLike={() => handleInteraction(card, "like")}
              onSave={() => handleInteraction(card, "save")}
              onMarkRead={() => handleInteraction(card, "read")}
              onChat={() => handleChat(card)}
              isRead={interactions.some((i) => i.card_id === card.id && i.type === "read")}
            />
          ))}
        </div>
      )}

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
    </div>
  )
}
