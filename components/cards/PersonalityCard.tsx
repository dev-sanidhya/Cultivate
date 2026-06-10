"use client"

import { useState, type RefObject } from "react"
import { Share2, Eye, Bookmark, Heart, MessageCircle, Lock, Unlock, BookOpen, BookCheck, Pencil, CircleX, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import type { Card, CardInteraction } from "@/types"
import { formatTaggedAddress } from "@/lib/utils/format"
import { formatLookingFor } from "@/lib/lookingFor"
import { PrioritizationBadge } from "@/components/cards/PrioritizationBadge"
import type { PrioritizationType } from "@/types"

// Increase/decrease this to tune the desktop card width without changing the card internals.
const DESKTOP_CARD_MAX_WIDTH = 375

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
  showOwnActionsInside?: boolean
  showTaggedLocation?: boolean
  prioritizationType?: PrioritizationType | null
  isRead?: boolean
  fullscreen?: boolean
  isOwnInSearch?: boolean
  notePanelRef?: RefObject<HTMLDivElement | null>
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
  showOwnActionsInside = true,
  showTaggedLocation,
  prioritizationType,
  isRead,
  fullscreen = false,
  isOwnInSearch = false,
  notePanelRef,
}: PersonalityCardProps) {
  const isLiked = interactions.some((i) => i.card_id === card.id && i.type === "like")
  const isSaved = interactions.some((i) => i.card_id === card.id && i.type === "save")
  const noteText = card.note?.trim() ?? ""
  const profileParts = [
    `${card.age}y`,
    card.gender ? card.gender.charAt(0).toUpperCase() + card.gender.slice(1) : null,
    ...(card.personality_types ?? []),
  ].filter(Boolean) as string[]
  const profileLabel = profileParts.join(" • ")
  const lookingForChipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
    color: "white",
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    minWidth: 0,
    maxWidth: "100%",
    flex: "0 1 auto",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as const
  const profileChipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 12px",
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: 500,
    background: "var(--color-primary-bg)",
    color: "var(--color-primary)",
    border: "none",
    whiteSpace: "nowrap",
    minWidth: 0,
    maxWidth: "100%",
    flex: "0 1 auto",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } as const
  const isSearchCardInteractive = mode === "search" && !!onFullscreen && !fullscreen

  function shareCard() {
    const url = `${window.location.origin}/card/${card.card_id}`
    if (navigator.share) {
      navigator.share({ title: `Strefo Card #${card.card_id}`, url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success("Card link copied!")
    }
  }

  const shouldShowTaggedLocation = showTaggedLocation ?? mode !== "search"
  const addressLabel = shouldShowTaggedLocation && card.tagged_address ? formatTaggedAddress(card.tagged_address) : null

  return (
    <div
      className="card animate-fadeIn"
      role={isSearchCardInteractive ? "button" : undefined}
      tabIndex={isSearchCardInteractive ? 0 : undefined}
      aria-label={isSearchCardInteractive ? "Open card fullscreen" : undefined}
      onClick={isSearchCardInteractive ? onFullscreen : undefined}
      onKeyDown={
        isSearchCardInteractive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onFullscreen?.()
              }
            }
          : undefined
      }
      style={{
        display: "flex",
        flexDirection: "column",
        aspectRatio: "7 / 12",
        width: "100%",
        maxWidth: fullscreen ? undefined : DESKTOP_CARD_MAX_WIDTH,
        margin: "0 auto",
        padding: "18px",
        borderRadius: fullscreen ? 28 : undefined,
        overflow: "hidden",
        position: "relative",
        opacity: card.is_closed ? 0.7 : 1,
        cursor: isSearchCardInteractive ? "pointer" : "default",
      }}
    >
      {/* Top row: Card ID + status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
          {prioritizationType && <PrioritizationBadge type={prioritizationType} floating={false} />}
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
          {mode === "own" && showOwnActionsInside && (
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

      {/* Looking For + profile chips */}
      {(card.looking_for || profileLabel) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "nowrap", alignItems: "center", gap: 8, width: "100%", minWidth: 0 }}>
            {card.looking_for && (
              <div style={lookingForChipStyle}>
                Looking for: {formatLookingFor(card.looking_for, card.looking_for_gender)}
              </div>
            )}
            {profileLabel && (
              <span style={{ ...profileChipStyle, marginLeft: "auto" }}>
                {profileLabel}
              </span>
            )}
          </div>
        </div>
      )}

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
      <div
        ref={notePanelRef}
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
          display: "flex",
          alignItems: noteText ? "flex-start" : "center",
        }}
      >
        {noteText ? (
          noteText
        ) : (
          <span style={{ opacity: 0.55, fontStyle: "italic" }}>No note added</span>
        )}
      </div>

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
            onClick={(event) => {
              event.stopPropagation()
              onLike?.()
            }}
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
            onClick={(event) => {
              event.stopPropagation()
              onSave?.()
            }}
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
            onClick={(event) => {
              event.stopPropagation()
              onMarkRead?.(!isRead)
            }}
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
            onClick={(event) => {
              event.stopPropagation()
              shareCard()
            }}
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
          {isOwnInSearch ? (
            <span
              style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
                padding: "8px 16px", borderRadius: 20,
                background: "var(--color-primary-bg)", color: "var(--color-primary)",
                border: "1px solid var(--color-border)", fontSize: 13, fontWeight: 700,
              }}
            >
              You
            </span>
          ) : (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onChat?.()
              }}
              style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
                padding: "8px 16px", borderRadius: 20,
                background: "var(--color-primary)", color: "white",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              <MessageCircle size={14} /> Chat
            </button>
          )}
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
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setExpanded((prev) => !prev)
        }}
        aria-label={expanded ? `Collapse ${title.toLowerCase()}` : `Expand ${title.toLowerCase()}`}
        aria-expanded={expanded}
        title={expanded ? `Collapse ${title}` : `Expand ${title}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
          width: "100%",
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>
          {title}
        </div>
        <span
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
        </span>
      </button>
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
