"use client"

import { useState } from "react"
import { Share2, Eye, Bookmark, Heart, MessageCircle, Lock, Unlock, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import type { Card, CardInteraction } from "@/types"
import { formatTaggedAddress } from "@/lib/utils/format"

interface PersonalityCardProps {
  card: Card
  mode: "own" | "search" | "public"
  interactions?: CardInteraction[]
  onLike?: () => void
  onSave?: () => void
  onChat?: () => void
  onUnlockChat?: () => void
  onClose?: () => void
  onEdit?: () => void
  onMarkRead?: (read: boolean) => void
  isRead?: boolean
}

export function PersonalityCard({
  card,
  mode,
  interactions = [],
  onLike,
  onSave,
  onChat,
  onUnlockChat,
  onClose,
  onEdit,
  onMarkRead,
  isRead,
}: PersonalityCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isLiked = interactions.some((i) => i.card_id === card.id && i.type === "like")
  const isSaved = interactions.some((i) => i.card_id === card.id && i.type === "save")

  function shareCard() {
    const url = `${window.location.origin}/card/${card.card_id}`
    if (navigator.share) {
      navigator.share({ title: `Strefo Card #${card.card_id}`, url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success("Card link copied!")
    }
  }

  const addressLabel = card.tagged_address ? formatTaggedAddress(card.tagged_address) : null

  return (
    <div
      className="card animate-fadeIn"
      style={{
        padding: "20px",
        position: "relative",
        opacity: card.is_closed ? 0.7 : 1,
      }}
    >
      {/* Top row: Card ID + status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              background: "var(--color-primary-bg)",
              color: "var(--color-primary)",
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              border: "1px solid var(--color-border)",
            }}
          >
            #{card.card_id}
          </span>
          {card.is_closed && (
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", background: "#F3F4F6", padding: "3px 8px", borderRadius: 20 }}>
              Closed
            </span>
          )}
          {mode === "own" && !card.is_public && (
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", background: "#F3F4F6", padding: "3px 8px", borderRadius: 20 }}>
              Private
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {mode === "own" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-text-secondary)" }}>
                <Eye size={13} />
                <span>{card.view_count}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-text-secondary)" }}>
                <Heart size={13} />
                <span>{card.like_count}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-text-secondary)" }}>
                <Bookmark size={13} />
                <span>{card.save_count}</span>
              </div>
            </>
          )}
          <button className="btn-ghost" style={{ padding: 6 }} onClick={shareCard}>
            <Share2 size={15} color="var(--color-text-secondary)" />
          </button>
        </div>
      </div>

      {/* Looking For - prominent */}
      {card.looking_for && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              color: "white",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Looking for: {card.looking_for}
          </div>
        </div>
      )}

      {/* Core fields */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <span className="tag selected" style={{ background: "#EDE9FE", color: "#6D28D9", border: "none" }}>
          {card.age}y
        </span>
        <span className="tag selected" style={{ background: "#EDE9FE", color: "#6D28D9", border: "none", textTransform: "capitalize" }}>
          {card.gender}
        </span>
        {card.personality_types?.map((p) => (
          <span key={p} className="tag">{p}</span>
        ))}
      </div>

      {/* Address */}
      {addressLabel && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>📍</span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{addressLabel}</span>
        </div>
      )}

      {/* Qualities & Hobbies */}
      {(card.qualities?.length > 0 || card.hobbies?.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {card.qualities?.map((q) => (
            <span key={q} className="tag" style={{ fontSize: 12 }}>✨ {q}</span>
          ))}
          {card.hobbies?.map((h) => (
            <span key={h} className="tag" style={{ fontSize: 12 }}>🎯 {h}</span>
          ))}
        </div>
      )}

      {/* Note */}
      {card.note && (
        <div
          style={{
            background: "var(--color-primary-bg)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
            fontSize: 13,
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
            borderLeft: "3px solid var(--color-primary-light)",
          }}
        >
          {card.note}
        </div>
      )}

      {/* Action bar */}
      {mode === "own" && (
        <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--color-border-light)", paddingTop: 14 }}>
          {card.chat_enabled ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-success)", background: "var(--color-success-bg)", padding: "5px 10px", borderRadius: 20 }}>
              <Unlock size={12} /> Chat active
            </div>
          ) : (
            <button
              onClick={onUnlockChat}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600,
                color: "var(--color-primary)", background: "var(--color-primary-bg)",
                padding: "6px 14px", borderRadius: 20, border: "1px solid var(--color-border)",
                cursor: "pointer",
              }}
            >
              <Lock size={13} /> Unlock Chat
            </button>
          )}
          <button
            onClick={onEdit}
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
              fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)",
              background: "transparent", padding: "6px 14px", borderRadius: 20,
              border: "1px solid var(--color-border)", cursor: "pointer",
            }}
          >
            Edit
          </button>
          {!card.is_closed && card.is_public && (
            <button
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600,
                color: "var(--color-error)", background: "var(--color-error-bg)",
                padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              }}
            >
              Close Card
            </button>
          )}
        </div>
      )}

      {mode === "search" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--color-border-light)", paddingTop: 14 }}>
          <button
            onClick={onLike}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "8px 14px",
              borderRadius: 20, border: `1px solid ${isLiked ? "var(--color-accent)" : "var(--color-border)"}`,
              background: isLiked ? "var(--color-accent-bg)" : "white",
              color: isLiked ? "var(--color-accent)" : "var(--color-text-secondary)",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Heart size={14} fill={isLiked ? "currentColor" : "none"} /> {isLiked ? "Liked" : "Like"}
          </button>
          <button
            onClick={onSave}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "8px 14px",
              borderRadius: 20, border: `1px solid ${isSaved ? "var(--color-primary)" : "var(--color-border)"}`,
              background: isSaved ? "var(--color-primary-bg)" : "white",
              color: isSaved ? "var(--color-primary)" : "var(--color-text-secondary)",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} /> {isSaved ? "Saved" : "Save"}
          </button>
          <button
            onClick={() => onMarkRead?.(!isRead)}
            style={{
              padding: "8px 10px", borderRadius: 20, border: "1px solid var(--color-border)",
              background: "white", color: "var(--color-text-secondary)", cursor: "pointer",
              fontSize: 12, fontWeight: 500,
            }}
          >
            {isRead ? "Unread" : "Read"}
          </button>
          <button
            onClick={onChat}
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
              padding: "8px 16px", borderRadius: 20,
              background: "var(--color-primary)", color: "white",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <MessageCircle size={14} /> Chat
          </button>
        </div>
      )}
    </div>
  )
}
