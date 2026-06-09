"use client"

import { useEffect, useRef, useState, Suspense, type PointerEvent as ReactPointerEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { ChatCardPickerModal } from "@/components/chat/ChatCardPickerModal"
import { ChatUnlockChoiceModal } from "@/components/chat/ChatUnlockChoiceModal"
import { Spinner } from "@/components/ui/Spinner"
import type { Card, CardInteraction, Search } from "@/types"
import { createChatForCardPair } from "@/lib/chat"
import { resolveChatStart, completeDirectUnlock, type ChatViewer } from "@/lib/chatFlow"
import type { Counterpart } from "@/lib/lookingFor"
import { adjustCardMetric, recordCardView } from "@/lib/cardMetrics"
import { fetchActivePrioritizationsForCards, type PrioritizationByCard } from "@/lib/cardPrioritizations"
import { ageFromDateOfBirth } from "@/lib/utils/age"

interface UnlockChoiceState {
  target: Card
  counterpart: Counterpart
  price: number
  durationDays: number
}

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

type CardFilterQuery<T> = {
  eq: (column: string, value: unknown) => T
  ilike: (column: string, pattern: string) => T
  overlaps: (column: string, value: string[]) => T
  contains: (column: string, value: Record<string, unknown>) => T
}

function applyFilterSearchCriteria<T extends CardFilterQuery<T>>(
  query: T,
  searchData: Search,
  options: { includeOptionalDetails: boolean },
) {
  let nextQuery = query

  if (options.includeOptionalDetails && typeof searchData.age === "number" && Number.isFinite(searchData.age)) {
    nextQuery = nextQuery.eq("age", searchData.age)
  }

  const gender = searchData.gender?.trim()
  if (gender) {
    nextQuery = nextQuery.ilike("gender", gender)
  }

  const lookingFor = searchData.looking_for?.trim()
  if (lookingFor) {
    nextQuery = nextQuery.ilike("looking_for", lookingFor)
  }

  if (searchData.looking_for_gender) {
    nextQuery = nextQuery.eq("looking_for_gender", searchData.looking_for_gender)
  }

  if (options.includeOptionalDetails) {
    const personalityTypes = normalizeSelectedValues(searchData.personality_types)
    if (personalityTypes.length) {
      nextQuery = nextQuery.overlaps("personality_types", personalityTypes)
    }

    const qualities = normalizeSelectedValues(searchData.qualities)
    if (qualities.length) {
      nextQuery = nextQuery.overlaps("qualities", qualities)
    }

    const hobbies = normalizeSelectedValues(searchData.hobbies)
    if (hobbies.length) {
      nextQuery = nextQuery.overlaps("hobbies", hobbies)
    }

    const activeAddressFilter = getActiveAddressFilter(searchData.tagged_address)
    if (activeAddressFilter) {
      nextQuery = nextQuery.contains("tagged_address", activeAddressFilter)
    }
  }

  return nextQuery
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
  const [priorityByCard, setPriorityByCard] = useState<PrioritizationByCard>({})
  const [filter, setFilter] = useState<Filter>("All")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [viewer, setViewer] = useState<ChatViewer | null>(null)
  const [search, setSearch] = useState<Search | null>(null)
  const [chatTargetCard, setChatTargetCard] = useState<Card | null>(null)
  const [shareCards, setShareCards] = useState<Card[]>([])
  const [shareCounterpart, setShareCounterpart] = useState<Counterpart | null>(null)
  const [unlockChoice, setUnlockChoice] = useState<UnlockChoiceState | null>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const viewedCardIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  async function loadResults() {
    try {
      viewedCardIdsRef.current = new Set()
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please sign in again")
      setUserId(user.id)

      const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("gender, date_of_birth")
        .eq("id", user.id)
        .single()
      if (viewerProfile) {
        setViewer({
          id: user.id,
          gender: viewerProfile.gender,
          age: ageFromDateOfBirth(viewerProfile.date_of_birth),
        })
      }

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

      if (!searchData) throw new Error("No search found. Please create a new search.")
      const activeSearch = searchData

      setSearch(activeSearch)

      let query = supabase
        .from("cards")
        .select("*, profile:profiles(id, first_name, last_name, photo_url)")
        .eq("is_public", true)
        .eq("is_closed", false)

      if (activeSearch.search_type === "card_id") {
        const cardIdQuery = activeSearch.card_id_query?.trim()
        if (cardIdQuery) {
          query = query.ilike("card_id", cardIdQuery)
        }
      } else {
        query = applyFilterSearchCriteria(query, activeSearch, { includeOptionalDetails: true })
      }

      let { data: cardsData, error: cardsError } = await query.order("created_at", { ascending: false })

      // Fallback for environments where cards->profiles relation is missing in PostgREST schema.
      if (cardsError) {
        const fallbackQuery = supabase
          .from("cards")
          .select("*")
          .eq("is_public", true)
          .eq("is_closed", false)

        if (activeSearch.search_type === "card_id") {
          const cardIdQuery = activeSearch.card_id_query?.trim()
          if (cardIdQuery) {
            fallbackQuery.ilike("card_id", cardIdQuery)
          }
        } else {
          applyFilterSearchCriteria(fallbackQuery, activeSearch, { includeOptionalDetails: true })
        }

        const fallbackResult = await fallbackQuery.order("created_at", { ascending: false })
        cardsData = fallbackResult.data
        cardsError = fallbackResult.error
      }

      if (cardsError) throw cardsError

      let resultCards = (cardsData ?? []) as Card[]

      // S-Prioritize injection: S-prioritized cards surface at the top when only
      // gender + Looking For type + Looking For gender match, ignoring other filters.
      if (
        activeSearch.search_type === "filter" &&
        activeSearch.gender?.trim() &&
        activeSearch.looking_for?.trim() &&
        activeSearch.looking_for_gender
      ) {
        const { data: sActive } = await supabase
          .from("card_prioritizations")
          .select("card_id")
          .eq("plan_type", "S")
          .gt("expires_at", new Date().toISOString())

        const sCardIds = (sActive ?? []).map((row: { card_id: string }) => row.card_id)
        if (sCardIds.length > 0) {
          let sQuery = supabase
            .from("cards")
            .select("*, profile:profiles(id, first_name, last_name, photo_url)")
            .eq("is_public", true)
            .eq("is_closed", false)
            .in("id", sCardIds)

          sQuery = applyFilterSearchCriteria(sQuery, activeSearch, { includeOptionalDetails: false })

          let { data: sCards, error: sCardsError } = await sQuery

          if (sCardsError) {
            let sFallbackQuery = supabase
              .from("cards")
              .select("*")
              .eq("is_public", true)
              .eq("is_closed", false)
              .in("id", sCardIds)

            sFallbackQuery = applyFilterSearchCriteria(sFallbackQuery, activeSearch, { includeOptionalDetails: false })

            const sFallbackResult = await sFallbackQuery
            sCards = sFallbackResult.data
            sCardsError = sFallbackResult.error
          }

          if (sCardsError) throw sCardsError

          const existingIds = new Set(resultCards.map((c) => c.id))
          for (const sc of (sCards ?? []) as Card[]) {
            if (!existingIds.has(sc.id)) resultCards.push(sc)
          }
        }
      }

      // Fetch active prioritizations for the result set and sort.
      const priorityMap = await fetchActivePrioritizationsForCards(supabase, resultCards.map((c) => c.id))

      // Prioritized cards first (newest prioritization first), then the rest by creation time (oldest first).
      resultCards = [...resultCards].sort((a, b) => {
        const pa = priorityMap[a.id]
        const pb = priorityMap[b.id]
        if (pa && pb) return new Date(pb.created_at).getTime() - new Date(pa.created_at).getTime()
        if (pa) return -1
        if (pb) return 1
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      const { data: interactionsData, error: interactionsError } = await supabase
        .from("card_interactions")
        .select("*")
        .eq("user_id", user.id)
      if (interactionsError) throw interactionsError

      setCards(resultCards)
      setPriorityByCard(priorityMap)
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
      const { error } = await supabase.from("card_interactions").delete().eq("id", existing.id)
      if (error) {
        toast.error(error.message)
        return
      }
      const { error: metricError } = await adjustCardMetric(supabase, card.id, type === "like" ? "like_count" : "save_count", -1)
      if (metricError) {
        toast.error(metricError.message)
      }
      setInteractions((prev) => prev.filter((i) => i.id !== existing.id))
    } else {
      const { data, error } = await supabase.from("card_interactions").insert({
        user_id: userId,
        card_id: card.id,
        type,
      }).select().single()
      if (error) {
        toast.error(error.message)
        return
      }
      const { error: metricError } = await adjustCardMetric(supabase, card.id, type === "like" ? "like_count" : "save_count", 1)
      if (metricError) {
        toast.error(metricError.message)
      }
      if (data) setInteractions((prev) => [...prev, data])
    }
  }

  async function handleMarkRead(card: Card, read: boolean) {
    const supabase = createClient()
    setReads((prev) => {
      const next = new Set(prev)
      if (read) next.add(card.id)
      else next.delete(card.id)
      return next
    })

    if (read) {
      const { error } = await supabase.from("card_interactions").insert({
        user_id: userId, card_id: card.id, type: "read",
      })
      if (error) {
        setReads((prev) => {
          const next = new Set(prev)
          next.delete(card.id)
          return next
        })
        toast.error(error.message)
      }
    } else {
      const { error } = await supabase.from("card_interactions")
        .delete()
        .eq("user_id", userId)
        .eq("card_id", card.id)
        .eq("type", "read")
      if (error) {
        setReads((prev) => {
          const next = new Set(prev)
          next.add(card.id)
          return next
        })
        toast.error(error.message)
      }
    }
  }

  async function handleChat(card: Card) {
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

  function setActiveCardIndex(nextIndex: number) {
    setCurrentIndex(nextIndex)
    setFullscreenIndex((prev) => (prev === null ? prev : nextIndex))
  }

  function openFullscreen(index: number) {
    setCurrentIndex(index)
    if (fullscreenIndex === null) {
      window.history.pushState({ searchResultsFullscreen: true }, "", window.location.href)
    }
    setFullscreenIndex(index)
  }

  function closeFullscreen() {
    if (fullscreenIndex !== null && window.history.state?.searchResultsFullscreen) {
      window.history.back()
      return
    }
    setFullscreenIndex(null)
  }

  function stepFullscreen(direction: -1 | 1) {
    const baseIndex = fullscreenIndex ?? currentIndex
    const nextIndex = Math.min(filteredCards.length - 1, Math.max(0, baseIndex + direction))
    if (nextIndex !== baseIndex) {
      setActiveCardIndex(nextIndex)
    }
  }

  function handleSwipeStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    swipeStartRef.current = { x: event.clientX, y: event.clientY }
  }

  function handleSwipeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start || fullscreenIndex === null) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const isHorizontalSwipe = Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2
    if (!isHorizontalSwipe) return

    if (dx < 0) {
      stepFullscreen(1)
    } else {
      stepFullscreen(-1)
    }
  }

  function handleNormalSwipeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const isHorizontalSwipe = Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2
    if (!isHorizontalSwipe) return

    if (dx < 0) {
      setActiveCardIndex(Math.min(filteredCards.length - 1, activeCurrentIndex + 1))
    } else {
      setActiveCardIndex(Math.max(0, activeCurrentIndex - 1))
    }
  }

  // Track view counts
  useEffect(() => {
    const card = filteredCards[currentIndex]
    if (!card || !userId) return
    if (viewedCardIdsRef.current.has(card.id)) return
    viewedCardIdsRef.current.add(card.id)
    const supabase = createClient()
    // Supabase query builders are lazy: the request is only sent when the
    // builder is awaited or `.then()` is called. A bare `void` never fires it.
    recordCardView(supabase, card.id).then(({ error }) => {
      if (error) console.error("Failed to track card view", error)
    })
  }, [currentIndex, filteredCards, userId])

  useEffect(() => {
    if (fullscreenIndex === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenIndex(null)
        return
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        const baseIndex = fullscreenIndex ?? currentIndex
        const nextIndex = Math.max(0, baseIndex - 1)
        if (nextIndex !== baseIndex) {
          setActiveCardIndex(nextIndex)
        }
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        const baseIndex = fullscreenIndex ?? currentIndex
        const nextIndex = Math.min(filteredCards.length - 1, baseIndex + 1)
        if (nextIndex !== baseIndex) {
          setActiveCardIndex(nextIndex)
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [fullscreenIndex, currentIndex, filteredCards.length])

  useEffect(() => {
    const onPopState = () => {
      setFullscreenIndex(null)
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const activeCurrentIndex = filteredCards.length > 0 ? Math.min(currentIndex, filteredCards.length - 1) : 0
  const activeFullscreenIndex = fullscreenIndex === null
    ? null
    : filteredCards.length > 0
      ? Math.min(fullscreenIndex, filteredCards.length - 1)
      : null
  const fullscreenDisplayIndex = activeFullscreenIndex ?? 0
  const card = filteredCards[activeCurrentIndex]
  const fullscreenCard = activeFullscreenIndex !== null ? filteredCards[activeFullscreenIndex] : null
  const showTaggedLocation = !!search?.tagged_address && search.search_type === "filter"

  useEffect(() => {
    if (activeFullscreenIndex === null) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [activeFullscreenIndex])

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>

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
          <div
            style={{ position: "relative", touchAction: isMobile ? "pan-y" : undefined }}
            onPointerDown={isMobile ? handleSwipeStart : undefined}
            onPointerUp={isMobile ? handleNormalSwipeEnd : undefined}
            onPointerCancel={isMobile ? () => { swipeStartRef.current = null } : undefined}
          >
            {card && (
              <PersonalityCard
                card={card}
                mode="search"
                interactions={interactions}
                isRead={reads.has(card.id)}
                showTaggedLocation={showTaggedLocation}
                isOwnInSearch={card.user_id === userId}
                prioritizationType={priorityByCard[card.id]?.plan_type ?? null}
                onLike={() => handleInteraction(card, "like")}
                onSave={() => handleInteraction(card, "save")}
                onMarkRead={(read) => handleMarkRead(card, read)}
                onChat={() => handleChat(card)}
                showBrandMark
                onFullscreen={() => openFullscreen(activeCurrentIndex)}
              />
            )}
          </div>

          {/* Navigation - arrows on desktop only; mobile uses swipe */}
          {filteredCards.length > 1 && !isMobile && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 20 }}>
              <button
                onClick={() => setActiveCardIndex(Math.max(0, activeCurrentIndex - 1))}
                disabled={activeCurrentIndex === 0}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: activeCurrentIndex === 0 ? "var(--color-border-light)" : "var(--color-primary)",
                  color: activeCurrentIndex === 0 ? "var(--color-text-muted)" : "white",
                  border: "none", cursor: activeCurrentIndex === 0 ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronLeft size={20} />
              </button>

              <span style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 600 }}>
                {activeCurrentIndex + 1} / {filteredCards.length}
              </span>

              <button
                onClick={() => setActiveCardIndex(Math.min(filteredCards.length - 1, activeCurrentIndex + 1))}
                disabled={activeCurrentIndex === filteredCards.length - 1}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: activeCurrentIndex === filteredCards.length - 1 ? "var(--color-border-light)" : "var(--color-primary)",
                  color: activeCurrentIndex === filteredCards.length - 1 ? "var(--color-text-muted)" : "white",
                  border: "none", cursor: activeCurrentIndex === filteredCards.length - 1 ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {filteredCards.length > 1 && isMobile && (
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>
              {activeCurrentIndex + 1} / {filteredCards.length}
            </div>
          )}
        </div>
      )}

      {fullscreenCard && activeFullscreenIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Card fullscreen viewer"
          onClick={closeFullscreen}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "linear-gradient(180deg, rgba(245, 243, 255, 0.96) 0%, rgba(250, 250, 250, 0.95) 48%, rgba(253, 242, 248, 0.92) 100%)",
            backdropFilter: "blur(14px)",
            display: "flex",
            flexDirection: "column",
            padding: "12px",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 680,
                position: "relative",
                overflow: "visible",
              }}
            >
              <div
                onClick={(event) => event.stopPropagation()}
                onPointerDown={handleSwipeStart}
                onPointerUp={handleSwipeEnd}
                onPointerCancel={() => {
                  swipeStartRef.current = null
                }}
                onPointerLeave={() => {
                  swipeStartRef.current = null
                }}
                style={{
                  width: "100%",
                  maxHeight: "calc(100dvh - 120px)",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  touchAction: "pan-y",
                  borderRadius: 28,
                  boxShadow: "0 30px 90px rgba(0, 0, 0, 0.28)",
                }}
              >
                <PersonalityCard
                  card={fullscreenCard}
                  mode="search"
                  interactions={interactions}
                  isRead={reads.has(fullscreenCard.id)}
                  showTaggedLocation={showTaggedLocation}
                  isOwnInSearch={fullscreenCard.user_id === userId}
                  prioritizationType={priorityByCard[fullscreenCard.id]?.plan_type ?? null}
                  onLike={() => handleInteraction(fullscreenCard, "like")}
                  onSave={() => handleInteraction(fullscreenCard, "save")}
                  onMarkRead={(read) => handleMarkRead(fullscreenCard, read)}
                  onChat={() => handleChat(fullscreenCard)}
                  showBrandMark
                  fullscreen
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 42, marginTop: 12, color: "white", fontSize: 14, fontWeight: 700 }}>
            {fullscreenDisplayIndex + 1} / {filteredCards.length}
          </div>
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
