"use client"

import type { ReactNode } from "react"
import { CheckCircle2, Info, TriangleAlert } from "lucide-react"

type PopupTone = "info" | "warning" | "danger"

interface PopupModalProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onClose?: () => void
  tone?: PopupTone
}

const toneStyles: Record<PopupTone, { icon: ReactNode; accent: string; button: string }> = {
  info: {
    icon: <Info size={20} />,
    accent: "#2563EB",
    button: "var(--color-primary)",
  },
  warning: {
    icon: <TriangleAlert size={20} />,
    accent: "#D97706",
    button: "#D97706",
  },
  danger: {
    icon: <TriangleAlert size={20} />,
    accent: "#DC2626",
    button: "#DC2626",
  },
}

export function PopupModal({
  open,
  title,
  message,
  confirmLabel = "OK",
  onConfirm,
  onClose,
  tone = "warning",
}: PopupModalProps) {
  if (!open) return null

  const styles = toneStyles[tone]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-modal-title"
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
        onClick={onClose ?? onConfirm}
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
          maxWidth: 420,
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
              background: `${styles.accent}14`,
              color: styles.accent,
              flexShrink: 0,
              marginBottom: 18,
            }}
          >
            <div style={{ transform: "scale(1.1)" }}>
              {styles.icon}
            </div>
          </div>

          <div style={{ width: "100%", maxWidth: 320 }}>
            <h2
              id="popup-modal-title"
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--color-text)",
                marginBottom: 14,
                lineHeight: 1.25,
              }}
            >
              {title}
            </h2>
            <div style={{ fontSize: 16, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              {message}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 28 }}>
          {onClose && onClose !== onConfirm && (
            <button
              onClick={onClose}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "white",
                color: "var(--color-text)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              minWidth: 152,
              padding: "12px 18px",
              borderRadius: 14,
              border: "none",
              background: styles.button,
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
