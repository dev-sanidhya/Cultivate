"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(30, 27, 75, 0.4)",
          backdropFilter: "blur(4px)",
        }}
      />
      {/* Sheet */}
      <div
        className={`animate-slideUp ${className}`}
        style={{
          position: "relative",
          background: "var(--color-surface)",
          borderRadius: "24px 24px 0 0",
          padding: "24px 20px 40px",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            background: "var(--color-border)",
            borderRadius: 2,
            margin: "0 auto 20px",
          }}
        />
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>{title}</h2>
            <button className="btn-ghost" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
