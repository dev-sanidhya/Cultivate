"use client"

import { Modal } from "@/components/ui/Modal"
import { formatLookingFor } from "@/lib/lookingFor"
import type { Card } from "@/types"

interface ChatCardPickerModalProps {
  open: boolean
  targetCard: Card | null
  cards: Card[]
  onSelect: (card: Card) => void
  onClose: () => void
}

export function ChatCardPickerModal({
  open,
  targetCard,
  cards,
  onSelect,
  onClose,
}: ChatCardPickerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Choose My Card">
      <div style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
        Pick the card you want to share with #{targetCard?.card_id}. This selection will stay fixed for the chat.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onSelect(card)}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 6,
              padding: "14px 16px",
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              background: "white",
              cursor: "pointer",
              textAlign: "left",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text)" }}>
                My card #{card.card_id}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", background: "var(--color-primary-bg)", padding: "4px 8px", borderRadius: 999 }}>
                Chat enabled
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Looking for: {formatLookingFor(card.looking_for, card.looking_for_gender)}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
