"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { Spinner } from "@/components/ui/Spinner"
import type { Card, CardInteraction, Search } from "@/types"

const FILTERS = ["All", "Read", "Unread", "Saved", "Liked"] as const
type Filter = (typeof FILTERS)[number]

function getActiveAddressFilter(taggedAddress?: Search["tagged_address"]) {
  if (!taggedAddress) return null
  const activeFieldEntries = Object.entries(taggedAddress).filter(([key, value]) => {
    if (key === "type") return false
    return typeof value === "string" ? value.trim().length > 0 : value != null
  })
  if (activeFieldEntries.length === 0) return null
  return Object.fromEntries([["type", taggedAddress.type], ...activeFieldEntries])
}

function normalizeSelectedValues(values?: string[] | null) {
  return (values ?? []).map((v) => v.trim()).filter(Boolean)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

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

  async function loadResults() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please sign in again")
      setUserId(user.id)

      let searchData: Search | null = null
      const normalizedSearchId = searchId?.trim()

      if (normalizedSearchId && isUuid(normalizedSearchId)) {
        const { data, error: searchError } = await supabase
          .from("searches")
          .select("*")
          .eq("id", normalizedSearchId)
          .maybeSingle()
        if (searchError) throw searchError
        searchData = data
      }

      if (!searchData) {
        const { data: latestSearch, error: latestSearchError } = await supabase
          .from("searches")
          .select("*")
          .eq("user_id", user.id)
          .order("last_searched_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (latestSearchError) throw latestSearchError
        if (!latestSearch) throw new Error("No search found. Please create a new search.")
        searchData = latestSearch
      }

      setSearch(searchData)

      let query = supabase
        .from("cards")
        .select("*, profile:profiles(id, first_name, last_name, photo_url)")
        .eq("is_public", true)
        .eq("is_closed", false)
        .neq("user_id", user.id)

      if (searchData?.search_type === "card_id") {
        const cardIdQuery = searchData.card_id_query?.trim()
        if (cardIdQuery) {
          query = query.ilike("card_id", cardIdQuery)
        }
      } else {
        if (typeof searchData?.age === "number" && Number.isFinite(searchData.age)) {
          query = query.eq("age", searchData.age)
        }
        const gender = searchData?.gender?.trim()
        if (gender) {
          query = query.ilike("gender", gender)
        }
        const lookingFor = searchData?.looking_for?.trim()
        if (lookingFor) {
          query = query.ilike("looking_for", lookingFor)
        }

        const personalityTypes = normalizeSelectedValues(searchData?.personality_types)
        if (personalityTypes.length) {
          query = query.overlaps("personality_types", personalityTypes)
        }
        const qualities = normalizeSelectedValues(searchData?.qualities)
        if (qualities.length) {
          query = query.overlaps("qualities", qualities)
        }
        const hobbies = normalizeSelectedValues(searchData?.hobbies)
        if (hobbies.length) {
          query = query.overlaps("hobbies", hobbies)
        }

        const activeAddressFilter = getActiveAddressFilter(searchData?.tagged_address)
        if (activeAddressFilter) {
          query = query.contains("tagged_address", activeAddressFilter)
        }
      }

      let { data: cardsData, error: cardsError } = await query.order("created_at", { ascending: false })

      // Fallback for environments where cards->profiles relation is missing in PostgREST schema.
      if (cardsError) {
        const fallbackQuery = supabase
          .from("cards")
          .select("*")
          .eq("is_public", true)
          .eq("is_closed", false)
          .neq("user_id", user.id)

        if (searchData?.search_type === "card_id") {
          const cardIdQuery = searchData.card_id_query?.trim()
          if (cardIdQuery) {
            fallbackQuery.ilike("card_id", cardIdQuery)
          }
        } else {
          if (typeof searchData?.age === "number" && Number.isFinite(searchData.age)) {
            fallbackQuery.eq("age", searchData.age)
          }
          const gender = searchData?.gender?.trim()
          if (gender) {
            fallbackQuery.ilike("gender", gender)
          }
          const lookingFor = searchData?.looking_for?.trim()
          if (lookingFor) {
            fallbackQuery.ilike("looking_for", lookingFor)
          }

          const personalityTypes = normalizeSelectedValues(searchData?.personality_types)
          if (personalityTypes.length) {
            fallbackQuery.overlaps("personality_types", personalityTypes)
          }
          const qualities = normalizeSelectedValues(searchData?.qualities)
          if (qualities.length) {
            fallbackQuery.overlaps("qualities", qualities)
          }
          const hobbies = normalizeSelectedValues(searchData?.hobbies)
          if (hobbies.length) {
            fallbackQuery.overlaps("hobbies", hobbies)
          }

          const activeAddressFilter = getActiveAddressFilter(searchData?.tagged_address)
          if (activeAddressFilter) {
            fallbackQuery.contains("tagged_address", activeAddressFilter)
          }
        }

        const fallbackResult = await fallbackQuery.order("created_at", { ascending: false })
        cardsData = fallbackResult.data
        cardsError = fallbackResult.error
      }

      if (cardsError) throw cardsError

      const { data: interactionsData, error: interactionsError } = await supabase
        .from("card_interactions")
        .select("*")
        .eq("user_id", user.id)
      if (interactionsError) throw interactionsError

      setCards(cardsData ?? [])
      setInteractions(interactionsData ?? [])

      const readSet = new Set<string>(
        interactionsData?.filter((i: CardInteraction) => i.type === "read").map((i: CardInteraction) => i.card_id) ?? []
      )
      setReads(readSet)
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e && typeof e.message === "string"
            ? e.message
            : "Failed to load search results"
      toast.error(message, { id: "search-results-load-error" })
      setCards([])
      setInteractions([])
      setReads(new Set())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadResults()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [searchId])

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

  const filterCounts: Record<Filter, number> = {
    All: cards.length,
    Read: cards.filter((c) => reads.has(c.id)).length,
    Unread: cards.filter((c) => !reads.has(c.id)).length,
    Saved: cards.filter((c) => interactions.some((i) => i.card_id === c.id && i.type === "save")).length,
    Liked: cards.filter((c) => interactions.some((i) => i.card_id === c.id && i.type === "like")).length,
  }

  function getFilterLabel(f: Filter) {
    const count = filterCounts[f]
    return count > 0 ? `${f} (${count})` : f
  }

  // Track view counts
  useEffect(() => {
    const card = filteredCards[currentIndex]
    if (!card || !userId) return
    const supabase = createClient()
    supabase.from("cards").update({ view_count: card.view_count + 1 }).eq("id", card.id).then(() => {})
  }, [currentIndex, filteredCards, userId])

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>

  const card = filteredCards[currentIndex]

  return (
    <div className="page-container" style={{ paddingTop: 20 }}>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16, alignItems: "center" }}>
        <button
          onClick={() => router.back()}
          className="btn-ghost"
          style={{ flex: "0 0 auto", width: 32, height: 32, borderRadius: "50%" }}
          aria-label="Go back"
        >
          <ChevronLeft size={18} />
        </button>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setCurrentIndex(0) }}
            className={`tag ${filter === f ? "selected" : ""}`}
            style={{ whiteSpace: "nowrap" }}
          >
            {getFilterLabel(f)}
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
