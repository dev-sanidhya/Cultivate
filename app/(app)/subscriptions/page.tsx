"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Crown, Star, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/PageHeader"
import { PopupModal } from "@/components/ui/PopupModal"
import { Spinner } from "@/components/ui/Spinner"
import { formatLookingFor, requiresGenderSelection } from "@/lib/lookingFor"
import { formatUnlockDuration, formatDurationWithBonus } from "@/lib/duration"
import {
  fetchUnlockCategories,
  createCategoryUnlock,
  fetchPrioritizationPlans,
  createCardPrioritization,
  type UnlockCategory,
} from "@/lib/subscriptions"
import { fetchActiveOffersForUser, resolveCategoryBenefit } from "@/lib/offers"
import { ActiveUnlocksTab } from "@/components/subscriptions/ActiveUnlocksTab"
import type { Card, Gender, PrioritizationPlan, PrioritizationType, OfferType } from "@/types"

interface CategoryOffer {
  effectivePrice: number
  bonusDays: number
  offerType: OfferType | null
}

type View = "home" | "unlock" | { prioritize: PrioritizationType }

const TARGET_GENDERS: Gender[] = ["male", "female", "other"]

export default function SubscriptionsPage() {
  const router = useRouter()
  const [view, setView] = useState<View>("home")

  return (
    <div className="page-container" style={{ paddingTop: 10 }}>
      <PageHeader
        title="Subscriptions"
        subtitle="Manage your paid features"
        showBack
        onBack={view === "home" ? undefined : () => setView("home")}
      />

      {view === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <OptionCard
            icon={<MessageCircle size={20} />}
            title="Unlock Chats"
            description="Unlock chat for a Looking For category and start conversations."
            onClick={() => setView("unlock")}
          />
          <OptionCard
            icon={<Crown size={20} />}
            title="N-Prioritization Card"
            description="Show your card at the top of relevant search results."
            onClick={() => setView({ prioritize: "N" })}
          />
          <OptionCard
            icon={<Star size={20} />}
            title="S-Prioritization Card"
            description="Top placement even when only gender and Looking For match."
            onClick={() => setView({ prioritize: "S" })}
          />
        </div>
      )}

      {view === "unlock" && <UnlockChatsView />}
      {typeof view === "object" && "prioritize" in view && (
        <PrioritizeView planType={view.prioritize} onDone={() => router.push("/cards")} />
      )}
    </div>
  )
}

function OptionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 16,
        border: "1px solid var(--color-border)",
        background: "white",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-primary-bg)",
          color: "var(--color-primary)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{description}</div>
      </div>
      <ChevronRight size={18} color="var(--color-text-muted)" />
    </button>
  )
}

function UnlockChatsView() {
  const [tab, setTab] = useState<"unlock" | "active">("unlock")
  const [categories, setCategories] = useState<UnlockCategory[]>([])
  const [categoryOffers, setCategoryOffers] = useState<Record<string, CategoryOffer>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<UnlockCategory | null>(null)
  const [gender, setGender] = useState<Gender | "">("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const cats = await fetchUnlockCategories(supabase)
        setCategories(cats)
        if (user) {
          const active = await fetchActiveOffersForUser(supabase, user.id)
          const map: Record<string, CategoryOffer> = {}
          for (const cat of cats) {
            const benefit = resolveCategoryBenefit(active, cat.looking_for)
            const effectivePrice = benefit.discountedPrice != null ? Math.min(benefit.discountedPrice, cat.price) : cat.price
            map[cat.looking_for] = {
              effectivePrice,
              bonusDays: benefit.bonusDurationDays,
              offerType: benefit.offerTypes[0] ?? null,
            }
          }
          setCategoryOffers(map)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load categories")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const needsGender = selected ? requiresGenderSelection(selected.looking_for) : false
  const selectedOffer = selected ? categoryOffers[selected.looking_for] : undefined
  const selectedHasOffer = !!selectedOffer && (selectedOffer.effectivePrice < (selected?.price ?? 0) || selectedOffer.bonusDays > 0)

  function openConfirm() {
    if (!selected) return
    if (needsGender && !gender) {
      toast.error("Select a gender")
      return
    }
    setConfirmOpen(true)
  }

  async function handlePay() {
    if (!selected) return
    setPaying(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please sign in again")
      const offer = categoryOffers[selected.looking_for]
      await createCategoryUnlock(
        supabase,
        user.id,
        selected.looking_for,
        needsGender ? (gender || null) : null,
        selected.durationDays + (offer?.bonusDays ?? 0),
        {
          offerType: offer?.offerType ?? null,
          amountPaid: offer?.effectivePrice ?? selected.price,
          baseDurationDays: selected.durationDays,
          bonusDurationDays: offer?.bonusDays ?? 0,
        },
      )
      setConfirmOpen(false)
      setSelected(null)
      setGender("")
      toast.success("Chat unlocked!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unlock chat")
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><Spinner size={28} color="primary" /></div>
  }

  return (
    <div>
      {/* Two tabs: Unlock Chat + Active Unlocks */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([["unlock", "Unlock Chat"], ["active", "Active Unlocks"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
              border: `1px solid ${tab === key ? "var(--color-primary)" : "var(--color-border)"}`,
              background: tab === key ? "var(--color-primary)" : "white",
              color: tab === key ? "white" : "var(--color-text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "active" ? (
        <ActiveUnlocksTab />
      ) : (
      <div>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 14 }}>
        Choose a Looking For category to unlock chat for.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categories.map((cat) => {
          const isSelected = selected?.looking_for === cat.looking_for
          const offer = categoryOffers[cat.looking_for]
          const discounted = offer && offer.effectivePrice < cat.price
          return (
            <button
              key={cat.looking_for}
              onClick={() => { setSelected(cat); setGender("") }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 12,
                border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                background: isSelected ? "var(--color-primary-bg)" : "white",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>{cat.looking_for}</span>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span>
                  {discounted && (
                    <span style={{ textDecoration: "line-through", color: "var(--color-text-muted)", marginRight: 6, fontSize: 12 }}>
                      ₹{cat.price / 100}
                    </span>
                  )}
                  <strong style={{ color: discounted ? "var(--color-accent)" : "inherit" }}>
                    ₹{(offer?.effectivePrice ?? cat.price) / 100}
                  </strong>
                </span>
                <span style={{ fontSize: 12 }}>
                  {offer && offer.bonusDays > 0
                    ? formatDurationWithBonus(cat.durationDays, offer.bonusDays)
                    : formatUnlockDuration(cat.durationDays)}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {selected && needsGender && (
        <div style={{ marginTop: 18 }}>
          <label className="label">Gender</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TARGET_GENDERS.map((g) => (
              <button
                key={g}
                className={`tag ${gender === g ? "selected" : ""}`}
                onClick={() => setGender(gender === g ? "" : g)}
                style={{ textTransform: "capitalize" }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={openConfirm}>
          Continue
        </button>
      )}

      <PopupModal
        open={confirmOpen}
        tone="info"
        title="Confirm unlock"
        confirmLabel={paying ? "Processing..." : "Pay"}
        onConfirm={() => { if (!paying) void handlePay() }}
        onClose={() => setConfirmOpen(false)}
        message={
          selected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
              <Row label="Looking For" value={selected.looking_for} />
              {needsGender && <Row label="Gender" value={gender ? gender[0].toUpperCase() + gender.slice(1) : "-"} />}
              <Row
                label="Price"
                value={
                  selectedHasOffer && selectedOffer && selectedOffer.effectivePrice < selected.price
                    ? `₹${selectedOffer.effectivePrice / 100} (was ₹${selected.price / 100})`
                    : `₹${selected.price / 100}`
                }
              />
              <Row
                label="Unlock period"
                value={
                  selectedOffer && selectedOffer.bonusDays > 0
                    ? formatDurationWithBonus(selected.durationDays, selectedOffer.bonusDays)
                    : formatUnlockDuration(selected.durationDays)
                }
              />
            </div>
          ) : null
        }
      />
      </div>
      )}
    </div>
  )
}

function PrioritizeView({ planType, onDone }: { planType: PrioritizationType; onDone: () => void }) {
  const [plans, setPlans] = useState<PrioritizationPlan[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<PrioritizationPlan | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Please sign in again")
        const [planList, { data: cardData }] = await Promise.all([
          fetchPrioritizationPlans(supabase, planType),
          supabase
            .from("cards")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_closed", false)
            .order("created_at", { ascending: false }),
        ])
        setPlans(planList)
        const loadedCards = (cardData ?? []) as Card[]
        setCards(loadedCards)
        // Preselect the card passed from My Cards (?card=<id>), if present.
        const preselectId = new URLSearchParams(window.location.search).get("card")
        if (preselectId) {
          const match = loadedCards.find((c) => c.id === preselectId)
          if (match) setSelectedCard(match)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load plans")
      } finally {
        setLoading(false)
      }
    })()
  }, [planType])

  const title = planType === "N" ? "N-Prioritization" : "S-Prioritization"

  async function handlePay() {
    if (!selectedPlan || !selectedCard) return
    setPaying(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please sign in again")
      await createCardPrioritization(supabase, user.id, selectedCard.id, selectedPlan)
      setConfirmOpen(false)
      toast.success(`${title} activated!`)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate prioritization")
    } finally {
      setPaying(false)
    }
  }

  const cardLabel = useMemo(
    () => (selectedCard ? formatLookingFor(selectedCard.looking_for, selectedCard.looking_for_gender) : ""),
    [selectedCard],
  )

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><Spinner size={28} color="primary" /></div>
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{title} Card</h2>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16 }}>
        Choose a plan, then pick the card for prioritization.
      </p>

      {plans.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>No plans available yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: isSelected ? "var(--color-primary-bg)" : "white",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>{plan.duration_days} days</span>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>₹{plan.price / 100}</span>
              </button>
            )
          })}
        </div>
      )}

      {selectedPlan && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Select a card</h3>
          {cards.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>You have no active cards.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cards.map((card) => {
                const isSelected = selectedCard?.id === card.id
                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                      background: isSelected ? "var(--color-primary-bg)" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>#{card.card_id}</span>
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                      {formatLookingFor(card.looking_for, card.looking_for_gender)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {selectedPlan && selectedCard && (
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setConfirmOpen(true)}>
          Continue
        </button>
      )}

      <PopupModal
        open={confirmOpen}
        tone="info"
        title={`Confirm ${title}`}
        confirmLabel={paying ? "Processing..." : "Pay"}
        onConfirm={() => { if (!paying) void handlePay() }}
        onClose={() => setConfirmOpen(false)}
        message={
          selectedPlan && selectedCard ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
              <Row label="Card" value={`#${selectedCard.card_id}`} />
              <Row label="Looking For" value={cardLabel} />
              <Row label="Duration" value={`${selectedPlan.duration_days} days`} />
              <Row label="Price" value={`₹${selectedPlan.price / 100}`} />
            </div>
          ) : null
        }
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{value}</span>
    </div>
  )
}
