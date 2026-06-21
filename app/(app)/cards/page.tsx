"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Star, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { Modal } from "@/components/ui/Modal"
import { PopupModal } from "@/components/ui/PopupModal"
import { Spinner } from "@/components/ui/Spinner"
import { CONTACT_WARNING_LIMIT } from "@/lib/utils/moderation"
import { readStoredContactWarningCount, writeStoredContactWarningCount } from "@/lib/utils/contactWarnings"
import { fetchOwnCardMetrics, type OwnCardMetricRow } from "@/lib/cardMetrics"
import { enableChatForCategory } from "@/lib/chatFlow"
import type { Card } from "@/types"

type CardRef = { id: string; card_id: string }
type ChatCardRow = {
  initiator_card_id: string | null
  recipient_card_id: string | null
  initiator: CardRef | CardRef[] | null
  recipient: CardRef | CardRef[] | null
}

export default function CardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [closingCard, setClosingCard] = useState<Card | null>(null)
  // Card IDs from this card's chat list that it can be closed/linked with.
  const [closeCandidates, setCloseCandidates] = useState<{ id: string; card_id: string }[]>([])
  const [selectedCloseCardId, setSelectedCloseCardId] = useState<string | null>(null)
  const [closeLoading, setCloseLoading] = useState(false)
  const [warningCount, setWarningCount] = useState(0)
  const [penaltyAmount, setPenaltyAmount] = useState("0")
  const [penaltyPaidAt, setPenaltyPaidAt] = useState<string | null>(null)
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false)

  useEffect(() => {
    loadCards()
  }, [])

  async function loadCards() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: cardData }, { data: profile }, { data: penaltyConfig }, { data: warningEvents }] = await Promise.all([
      supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("contact_detail_warning_count, contact_penalty_paid_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("platform_config")
        .select("value")
        .eq("key", "contact_penalty_amount")
        .single(),
      supabase
        .from("contact_detail_warnings")
        .select("id")
        .eq("user_id", user.id),
    ])

    let metricsByCardId = new Map<string, { view_count: number; like_count: number; save_count: number }>()

    if ((cardData ?? []).length > 0) {
      const { data: metrics, error: metricsError } = await fetchOwnCardMetrics(supabase)
      if (!metricsError && metrics) {
        const typedMetrics = metrics as OwnCardMetricRow[]
        metricsByCardId = new Map(typedMetrics.map((metric: OwnCardMetricRow) => [metric.card_id, metric]))
      }
    }

    const typedCards = (cardData ?? []) as Card[]

    setCards(typedCards.map((card: Card) => {
      const metrics = metricsByCardId.get(card.id)
      if (!metrics) return card
      return {
        ...card,
        view_count: metrics.view_count ?? card.view_count,
        like_count: metrics.like_count ?? card.like_count,
        save_count: metrics.save_count ?? card.save_count,
      }
    }))
    if (profile) {
      const storedCount = readStoredContactWarningCount(user.id)
      const eventCount = Array.isArray(warningEvents) ? warningEvents.length : 0
      const mergedCount = Math.max(profile.contact_detail_warning_count ?? 0, storedCount, eventCount)
      setWarningCount(mergedCount)
      setPenaltyPaidAt(profile.contact_penalty_paid_at ?? null)
      writeStoredContactWarningCount(user.id, mergedCount)
    }
    if (penaltyConfig?.value) setPenaltyAmount(penaltyConfig.value)
    setLoading(false)
  }

  const isPenaltyBlocked = warningCount >= CONTACT_WARNING_LIMIT && !penaltyPaidAt

  function handleBlockedAction() {
    setPenaltyModalOpen(true)
  }

  async function handlePayPenalty() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const paidAt = new Date().toISOString()

    await supabase
      .from("profiles")
      .update({
        contact_detail_warning_count: 0,
        contact_penalty_paid_at: paidAt,
      })
      .eq("id", user!.id)
    await supabase
      .from("contact_detail_warnings")
      .delete()
      .eq("user_id", user!.id)

    setWarningCount(0)
    setPenaltyPaidAt(paidAt)
    writeStoredContactWarningCount(user!.id, 0)
    setPenaltyModalOpen(false)
    toast.success("Penalty marked as paid.")
  }

  function handleCreateCard() {
    if (isPenaltyBlocked) {
      handleBlockedAction()
      return
    }
    router.push("/cards/create")
  }

  function handleEditCard(card: Card) {
    if (isPenaltyBlocked) {
      handleBlockedAction()
      return
    }
    router.push(`/cards/${card.id}/edit`)
  }

  async function handleUnlockChat(card: Card) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: pricing } = await supabase
      .from("chat_pricing")
      .select("*")
      .eq("looking_for_category", card.looking_for)
      .maybeSingle()

    const duration = pricing?.duration_days ?? 30

    // Unlock applies to the whole (category, gender); enable every same-category card.
    // Payment is mocked as successful until a gateway is integrated.
    await supabase.from("chat_unlocks").insert({
      user_id: user.id,
      card_id: card.id,
      looking_for_category: card.looking_for,
      target_gender: card.looking_for_gender,
      expires_at: new Date(Date.now() + duration * 86400000).toISOString(),
    })

    await enableChatForCategory(supabase, user.id, card.looking_for, card.looking_for_gender)

    toast.success("Chat unlocked!")
    loadCards()
  }

  async function handleCloseCard(card: Card) {
    const supabase = createClient()
    // Find the Card IDs this card has chatted with (chats where this card is on
    // either side); the user closes/links against the counterpart card.
    const { data: chats } = await supabase
      .from("chats")
      .select("initiator_card_id, recipient_card_id, initiator:initiator_card_id(id, card_id), recipient:recipient_card_id(id, card_id)")
      .or(`initiator_card_id.eq.${card.id},recipient_card_id.eq.${card.id}`)

    const candidates: { id: string; card_id: string }[] = []
    for (const c of (chats ?? []) as ChatCardRow[]) {
      const otherRel = c.initiator_card_id === card.id ? c.recipient : c.initiator
      const other = Array.isArray(otherRel) ? otherRel[0] : otherRel
      if (other && !candidates.find((x) => x.id === other.id)) {
        candidates.push({ id: other.id, card_id: other.card_id })
      }
    }

    setCloseCandidates(candidates)
    setClosingCard(card)
    setSelectedCloseCardId(null)
  }

  async function confirmCloseCard(didntFind: boolean) {
    if (!closingCard) return
    setCloseLoading(true)
    const supabase = createClient()

    const linkedCardId = didntFind ? null : selectedCloseCardId
    await supabase.from("cards").update({
      is_closed: true,
      is_public: false,
      closed_with_card_id: linkedCardId,
      closure_type: linkedCardId ? "linked" : "direct",
    }).eq("id", closingCard.id)

    // Record the card-to-card closure mapping for analytics/validation.
    if (linkedCardId) {
      await supabase.from("card_closures").insert({
        card_id: closingCard.id,
        closed_with_card_id: linkedCardId,
      })
    }

    toast.success("Card closed.")
    setClosingCard(null)
    loadCards()
    setCloseLoading(false)
  }

  async function handleReopenCard(card: Card) {
    const supabase = createClient()
    await supabase.from("cards").update({
      is_closed: false,
      is_public: true,
      closure_type: null,
    }).eq("id", card.id)
    toast.success("Card reopened.")
    loadCards()
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <Spinner size={32} color="primary" />
      </div>
    )
  }

  return (
    <div className="page-container" style={{ paddingTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)" }}>My Cards</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </p>
        </div>
        <button
          onClick={handleCreateCard}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            background: "var(--color-primary)", color: "white", border: "none",
            borderRadius: 20, fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}
        >
          <Plus size={16} /> New Card
        </button>
      </div>

      {cards.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
            No cards yet
          </h3>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
            Create your first Personality Card to start connecting.
          </p>
          <button className="btn-primary" style={{ maxWidth: 200, margin: "0 auto" }} onClick={handleCreateCard}>
            Create Card
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {cards.map((card) => (
            <div key={card.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PersonalityCard
                card={card}
                mode="own"
                onUnlockChat={() => handleUnlockChat(card)}
                onClose={() => handleCloseCard(card)}
                onEdit={() => handleEditCard(card)}
              />
              {!card.is_closed && (
                <button
                  onClick={() => router.push(`/subscriptions?card=${card.id}`)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 16px", background: "var(--color-primary-bg)", color: "var(--color-primary)",
                    border: "1px solid var(--color-border)", borderRadius: 12, fontWeight: 600, fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <Star size={15} /> Prioritize Card
                </button>
              )}
              {/* Reopen only cards that were closed directly (not linked/merged). */}
              {card.is_closed && card.closure_type === "direct" && (
                <button
                  onClick={() => handleReopenCard(card)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 16px", background: "var(--color-primary-bg)", color: "var(--color-primary)",
                    border: "1px solid var(--color-border)", borderRadius: 12, fontWeight: 600, fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={15} /> Make Public Again
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Close Card Modal */}
      <Modal
        open={!!closingCard}
        onClose={() => setClosingCard(null)}
        title="Close this card?"
      >
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
          Have you found the person you were looking for?
        </p>

        {closeCandidates.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 12 }}>
              Select the Card ID you want to close this card with:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {closeCandidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCloseCardId(c.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px",
                    borderRadius: 12, border: `2px solid ${selectedCloseCardId === c.id ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: selectedCloseCardId === c.id ? "var(--color-primary-bg)" : "white",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-primary)", letterSpacing: 1 }}>
                    #{c.card_id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedCloseCardId && (
            <button
              className="btn-primary"
              onClick={() => confirmCloseCard(false)}
              disabled={closeLoading}
            >
              Close with selected card
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => confirmCloseCard(true)}
            disabled={closeLoading}
          >
            {"Didn't find the person - close anyway"}
          </button>
          <button
            onClick={() => setClosingCard(null)}
            style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", padding: "8px" }}
          >
            Keep card open
          </button>
        </div>
      </Modal>

      <PopupModal
        open={penaltyModalOpen}
        tone="danger"
        title="Penalty payment required"
        message={
          <>
            <p style={{ marginBottom: 12 }}>
              You have reached {CONTACT_WARNING_LIMIT} warnings for sharing contact details in card notes.
            </p>
            <p>
              Please pay the penalty of ₹{penaltyAmount} to create new cards or edit existing ones.
            </p>
          </>
        }
        confirmLabel="Pay"
        onConfirm={handlePayPenalty}
        onClose={() => setPenaltyModalOpen(false)}
      />
    </div>
  )
}
