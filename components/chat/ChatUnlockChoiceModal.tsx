"use client"

import { Lock } from "lucide-react"
import type { Card } from "@/types"
import type { Counterpart } from "@/lib/lookingFor"
import { formatLookingFor } from "@/lib/lookingFor"

interface ChatUnlockChoiceModalProps {
  open: boolean
  target: Card | null
  counterpart: Counterpart | null
  price: number
  durationDays: number
  loading?: boolean
  onUnlock: () => void
  onClose: () => void
}

export function ChatUnlockChoiceModal({
  open,
  target,
  counterpart,
  price,
  durationDays,
  loading = false,
  onUnlock,
  onClose,
}: ChatUnlockChoiceModalProps) {
  if (!open || !target || !counterpart) return null

  const newCardLabel = formatLookingFor(counterpart.looking_for, counterpart.looking_for_gender)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-choice-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <button
        aria-label="Close dialog"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          border: "none",
          background: "rgba(15, 23, 42, 0.48)",
          backdropFilter: "blur(4px)",
          cursor: "pointer",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          borderRadius: 24,
          background: "white",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
          padding: "28px 24px 24px",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-primary-bg)",
              color: "var(--color-primary)",
              marginBottom: 18,
            }}
          >
            <Lock size={22} />
          </div>

          <h2 id="unlock-choice-title" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginBottom: 12 }}>
            Start chatting
          </h2>

          <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
            <p style={{ margin: "0 0 12px" }}>
              You don&apos;t have a card in the <strong>{newCardLabel}</strong> category yet. You can either create one
              yourself, or unlock chat directly now.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              If you unlock directly, we&apos;ll automatically create a new card for you:
            </p>
            <div
              style={{
                background: "var(--color-primary-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 12,
                fontWeight: 700,
                color: "var(--color-primary)",
              }}
            >
              Looking for: {newCardLabel}
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>
              Price: <strong>₹{price / 100}</strong> · Unlock period: <strong>{durationDays} days</strong>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <button
            onClick={onUnlock}
            disabled={loading}
            style={{
              padding: "12px 18px",
              borderRadius: 14,
              border: "none",
              background: "var(--color-primary)",
              color: "white",
              fontWeight: 800,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Unlocking..." : `Unlock chat directly (₹${price / 100})`}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "11px 18px",
              borderRadius: 14,
              border: "1px solid var(--color-border)",
              background: "white",
              color: "var(--color-text)",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
            }}
          >
            I&apos;ll create a card first
          </button>
        </div>
      </div>
    </div>
  )
}
