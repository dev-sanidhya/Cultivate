"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { Spinner } from "@/components/ui/Spinner"
import { PageHeader } from "@/components/ui/PageHeader"
import type { Card, CardInteraction, Search } from "@/types"

const FILTERS = ["All", "Read", "Unread", "Saved", "Liked"] as const
type Filter = (typeof FILTERS)[number]

function SearchResultsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const searchId = params.get("id")

  const [cards, setCards] = useState<Card[]>([])
  const [interactions, setInteractions] = useState<CardInteraction[]>([])
  const [reads, setReads] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>("All")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [search, setSearch] = useState<Search | null>(null)

  useEffect(() => {
    if (!searchId) { router.push("/search"); return }
    loadResults()
  }, [searchId])

  // Track view counts
  useEffect(() => {
    const card = filteredCards[currentIndex]
    if (!card || !userId) return
    const supabase = createClient()
    supabase.from("cards").update({ view_count: card.view_count + 1 }).eq("id", card.id).then(() => {})
  }, [currentIndex, userId])

  async function loadResults() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user!.id)

    const { data: searchData } = await supabase.from("searches").select("*").eq("id", searchId).single()
    setSearch(searchData)

    let query = supabase
      .from("cards")
      .select("*, profile:profiles(id, first_name, last_name, photo_url)")
      .eq("is_public", true)
      .eq("is_closed", false)
      .neq("user_id", user!.id)

    if (searchData?.search_type === "card_id") {
      query = query.eq("card_id", searchData.card_id_query)
    } else {
      if (searchData?.age) query = query.eq("age", searchData.age)
      if (searchData?.gender) query = query.eq("gender", searchData.gender)
      if (searchData?.looking_for) query = query.eq("looking_for", searchData.looking_for)
      if (searchData?.personality_types?.length) {
        query = query.overlaps("personality_types", searchData.personality_types)
      }
      if (searchData?.qualities?.length) {
        query = query.overlaps("qualities", searchData.qualities)
      }
      if (searchData?.hobbies?.length) {
        query = query.overlaps("hobbies", searchData.hobbies)
      }
      if (searchData?.tagged_address) {
        query = query.contains("tagged_address", searchData.tagged_address)
      }
    }

    const { data: cardsData } = await query.order("created_at", { ascending: false })

    const { data: interactionsData } = await supabase
      .from("card_interactions")
      .select("*")
      .eq("user_id", user!.id)

    setCards(cardsData ?? [])
    setInteractions(interactionsData ?? [])

    const readSet = new Set<string>(
      interactionsData?.filter((i) => i.type === "read").map((i) => i.card_id) ?? []
    )
    setReads(readSet)
    setLoading(false)
  }

  async function handleInteraction(card: Card, type: "like" | "save") {
    const supabase = createClient()
    const existing = interactions.find((i) => i.card_id === card.id && i.type === type)
    if (existing) {
      await supabase.from("card_interactions").delete().eq("id", existing.id)
      setInteractions((prev) => prev.filter((i) => i.id !== existing.id))
    } else {
      const { data } = await supabase.from("card_interactions").insert({
        user_id: userId,
        card_id: card.id,
        type,
      }).select().single()
      if (data) setInteractions((prev) => [...prev, data])
    }
  }

  async function handleMarkRead(card: Card, read: boolean) {
    const supabase = createClient()
    if (read) {
      const { data } = await supabase.from("card_interactions").insert({
        user_id: userId, card_id: card.id, type: "read",
      }).select().single()
      if (data) setInteractions((prev) => [...prev, data])
      setReads((prev) => new Set([...prev, card.id]))
    } else {
      await supabase.from("card_interactions")
        .delete()
        .eq("user_id", userId)
        .eq("card_id", card.id)
        .eq("type", "read")
      setInteractions((prev) => prev.filter((i) => !(i.card_id === card.id && i.type === "read")))
      setReads((prev) => { const s = new Set(prev); s.delete(card.id); return s })
    }
  }

  async function handleChat(card: Card) {
    // Check if user has a matching unlocked card
    const supabase = createClient()
    const { data: unlocks } = await supabase
      .from("chat_unlocks")
      .select("*")
      .eq("user_id", userId)
      .eq("looking_for_category", card.looking_for)
      .gt("expires_at", new Date().toISOString())

    if (!unlocks?.length) {
      toast.error(`You need an active card with "Looking For: ${card.looking_for}" to chat.`)
      router.push("/cards")
      return
    }

    // Create or find chat
    const { data: existingChat } = await supabase
      .from("chats")
      .select("id")
      .or(`and(initiator_id.eq.${userId},recipient_id.eq.${card.user_id}),and(initiator_id.eq.${card.user_id},recipient_id.eq.${userId})`)
      .single()

    if (existingChat) {
      router.push(`/chat/${existingChat.id}`)
      return
    }

    const { data: newChat } = await supabase.from("chats").insert({
      initiator_id: userId,
      recipient_id: card.user_id,
      initiator_card_id: unlocks[0].card_id,
      recipient_card_id: card.id,
      looking_for_category: card.looking_for,
    }).select().single()

    if (newChat) router.push(`/chat/${newChat.id}`)
  }

  const filteredCards = cards.filter((c) => {
    if (filter === "All") return true
    if (filter === "Read") return reads.has(c.id)
    if (filter === "Unread") return !reads.has(c.id)
    if (filter === "Saved") return interactions.some((i) => i.card_id === c.id && i.type === "save")
    if (filter === "Liked") return interactions.some((i) => i.card_id === c.id && i.type === "like")
    return true
  })

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>

  const card = filteredCards[currentIndex]

  return (
    <div className="page-container" style={{ paddingTop: 20 }}>
      <PageHeader title="Results" subtitle={`${filteredCards.length} cards found`} showBack />

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setCurrentIndex(0) }}
            className={`tag ${filter === f ? "selected" : ""}`}
            style={{ whiteSpace: "nowrap" }}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredCards.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤷</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>No cards found</p>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 8 }}>
            Try broadening your search filters.
          </p>
        </div>
      ) : (
        <div>
          {/* Card viewer */}
          <div style={{ position: "relative" }}>
            {card && (
              <PersonalityCard
                card={card}
                mode="search"
                interactions={interactions}
                isRead={reads.has(card.id)}
                onLike={() => handleInteraction(card, "like")}
                onSave={() => handleInteraction(card, "save")}
                onMarkRead={(read) => handleMarkRead(card, read)}
                onChat={() => handleChat(card)}
              />
            )}
          </div>

          {/* Navigation */}
          {filteredCards.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 20 }}>
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: currentIndex === 0 ? "var(--color-border-light)" : "var(--color-primary)",
                  color: currentIndex === 0 ? "var(--color-text-muted)" : "white",
                  border: "none", cursor: currentIndex === 0 ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronLeft size={20} />
              </button>

              <span style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 600 }}>
                {currentIndex + 1} / {filteredCards.length}
              </span>

              <button
                onClick={() => setCurrentIndex((i) => Math.min(filteredCards.length - 1, i + 1))}
                disabled={currentIndex === filteredCards.length - 1}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: currentIndex === filteredCards.length - 1 ? "var(--color-border-light)" : "var(--color-primary)",
                  color: currentIndex === filteredCards.length - 1 ? "var(--color-text-muted)" : "white",
                  border: "none", cursor: currentIndex === filteredCards.length - 1 ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SearchResultsPage() {
  return (
    <Suspense>
      <SearchResultsContent />
    </Suspense>
  )
}
