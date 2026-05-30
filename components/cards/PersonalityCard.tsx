"use client"

import { useState } from "react"
import { Share2, Eye, Bookmark, Heart, MessageCircle, Lock, Unlock, BookOpen, BookCheck, Maximize2, Pencil, CircleX, ChevronDown, ChevronRight } from "lucide-react"
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
  onFullscreen?: () => void
  showBrandMark?: boolean
  isRead?: boolean
  fullscreen?: boolean
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
  onFullscreen,
  showBrandMark,
  isRead,
  fullscreen = false,
}: PersonalityCardProps) {
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
        display: "flex",
        flexDirection: "column",
        aspectRatio: "7 / 12",
        padding: "18px",
        borderRadius: fullscreen ? 28 : undefined,
        overflow: "hidden",
        position: "relative",
        opacity: card.is_closed ? 0.7 : 1,
      }}
    >
      {mode === "search" && onFullscreen && (
        <button
          onClick={onFullscreen}
          aria-label="Open fullscreen"
          title="Open fullscreen"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1px solid var(--color-border)",
            background: "rgba(255,255,255,0.96)",
            color: "var(--color-text-secondary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.10)",
            zIndex: 2,
          }}
        >
          <Maximize2 size={15} />
        </button>
      )}

      {/* Top row: Card ID + status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {showBrandMark && (
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                lineHeight: 1,
                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: -0.2,
                pointerEvents: "none",
              }}
              >
                Strefo
              </span>
          )}
          {mode === "own" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
              {!card.is_closed && card.is_public && (
                <button
                  onClick={onClose}
                  aria-label="Close card"
                  title="Close card"
                  style={{
                    width: 40,
                    height: 40,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-error)",
                    background: "var(--color-error-bg)",
                    padding: 0,
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <CircleX size={16} />
                </button>
              )}
              <button
                onClick={onEdit}
                aria-label="Edit card"
                title="Edit card"
                style={{
                  width: 40,
                  height: 40,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-secondary)",
                  background: "var(--color-surface)",
                  padding: 0,
                  borderRadius: "50%",
                  border: "1px solid var(--color-border)",
                  cursor: "pointer",
                }}
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
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
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Location:</span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{addressLabel}</span>
        </div>
      )}

      {/* Qualities & Hobbies */}
      <div style={{ marginBottom: 12 }}>
        <SingleLineTagSection title="Qualities" tags={card.qualities ?? []} />
        <SingleLineTagSection title="Hobbies" tags={card.hobbies ?? []} />
      </div>

      {/* Note */}
      {card.note && (
        <div
          style={{
            background: "var(--color-primary-bg)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            fontSize: 13,
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
            borderLeft: "3px solid var(--color-primary-light)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {card.note}
        </div>
      )}

      {/* Action bar */}
      {mode === "own" && (
        <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--color-border-light)", paddingTop: 4 }}>
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
          <button
            className="btn-ghost"
            style={{ padding: 6 }}
            onClick={shareCard}
            aria-label="Share"
            title="Share"
          >
            <Share2 size={15} color="var(--color-text-secondary)" />
          </button>
          {card.chat_enabled ? (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-success)", background: "var(--color-success-bg)", padding: "5px 10px", borderRadius: 20 }}>
              <Unlock size={12} /> Chat active
            </div>
          ) : (
            <button
              onClick={onUnlockChat}
              style={{
                marginLeft: "auto",
                display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600,
                color: "var(--color-primary)", background: "var(--color-primary-bg)",
                padding: "10px 14px", borderRadius: 20, border: "1px solid var(--color-border)",
                cursor: "pointer",
              }}
            >
              <Lock size={13} /> Unlock Chat
            </button>
          )}
        </div>
      )}

      {mode === "search" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid var(--color-border-light)", paddingTop: 0 }}>
          <button
            onClick={onLike}
            aria-label={isLiked ? "Unlike" : "Like"}
            title={isLiked ? "Unlike" : "Like"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              border: "none",
              background: "transparent",
              color: isLiked ? "var(--color-accent)" : "var(--color-text-secondary)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
          </button>
          <button
            onClick={onSave}
            aria-label={isSaved ? "Unsave" : "Save"}
            title={isSaved ? "Unsave" : "Save"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              border: "none",
              background: "transparent",
              color: isSaved ? "var(--color-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => onMarkRead?.(!isRead)}
            aria-label={isRead ? "Mark unread" : "Mark read"}
            title={isRead ? "Mark unread" : "Mark read"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              border: "none",
              background: isRead ? "var(--color-primary-bg)" : "transparent",
              color: isRead ? "var(--color-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
              padding: 0,
              borderRadius: 999,
            }}
          >
            {isRead ? <BookCheck size={18} /> : <BookOpen size={18} />}
          </button>
          <button
            onClick={shareCard}
            aria-label="Share"
            title="Share"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              border: "none",
              background: "transparent",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <Share2 size={18} />
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

function SingleLineTagSection({
  title,
  tags,
}: {
  title: string
  tags: string[]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>
          {title}
        </div>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? `Collapse ${title.toLowerCase()}` : `Expand ${title.toLowerCase()}`}
          title={expanded ? `Collapse ${title}` : `Expand ${title}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            padding: 0,
            border: "none",
            background: "transparent",
            color: "var(--color-primary-light)",
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {expanded && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((tag) => (
            <span key={tag} className="tag" style={{ fontSize: 12, flex: "0 0 auto" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
