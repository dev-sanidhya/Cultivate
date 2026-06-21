"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/Spinner"
import { PopupModal } from "@/components/ui/PopupModal"
import { formatLookingFor } from "@/lib/lookingFor"
import { formatUnlockDuration } from "@/lib/duration"
import { resolveEffectiveUnlockPricing } from "@/lib/pricing"
import { createCategoryUnlock } from "@/lib/subscriptions"
import type { ChatUnlock } from "@/types"

function remainingLabel(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return "Expired"
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h remaining`
  const mins = Math.floor((ms % 3600000) / 60000)
  return hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`
}

export function ActiveUnlocksTab() {
  const [unlocks, setUnlocks] = useState<ChatUnlock[]>([])
  const [loading, setLoading] = useState(true)
  const [extendTarget, setExtendTarget] = useState<ChatUnlock | null>(null)
  const [extendInfo, setExtendInfo] = useState<{ price: number; totalDays: number; bonusDays: number } | null>(null)
  const [extending, setExtending] = useState(false)

  async function loadUnlocks() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from("chat_unlocks")
      .select("*")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
    setUnlocks((data ?? []) as ChatUnlock[])
    setLoading(false)
  }

  useEffect(() => {
    void loadUnlocks()
  }, [])

  async function openExtend(unlock: ChatUnlock) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const pricing = await resolveEffectiveUnlockPricing(supabase, user.id, unlock.looking_for_category)
    setExtendInfo({ price: pricing.effectivePrice, totalDays: pricing.totalDurationDays, bonusDays: pricing.bonusDurationDays })
    setExtendTarget(unlock)
  }

  async function confirmExtend() {
    if (!extendTarget || !extendInfo) return
    setExtending(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please sign in again")
      // Extension adds time on top of the current expiry (mock payment success).
      await createCategoryUnlock(
        supabase,
        user.id,
        extendTarget.looking_for_category,
        extendTarget.target_gender,
        extendInfo.totalDays,
        {
          offerType: null,
          amountPaid: extendInfo.price,
          baseDurationDays: extendInfo.totalDays - extendInfo.bonusDays,
          bonusDurationDays: extendInfo.bonusDays,
        },
        extendTarget.expires_at,
      )
      toast.success("Unlock extended!")
      setExtendTarget(null)
      setExtendInfo(null)
      setLoading(true)
      await loadUnlocks()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to extend")
    } finally {
      setExtending(false)
    }
  }

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}><Spinner size={26} color="primary" /></div>
  }

  if (unlocks.length === 0) {
    return <p style={{ fontSize: 14, color: "var(--color-text-muted)", paddingTop: 20 }}>You have no active chat unlocks.</p>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {unlocks.map((u) => (
        <div key={u.id} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--color-border)", background: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>
              {formatLookingFor(u.looking_for_category, u.target_gender)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)" }}>
              {remainingLabel(u.expires_at)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Expires {new Date(u.expires_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            {u.bonus_duration_days > 0 ? ` · includes ${u.bonus_duration_days}d bonus` : ""}
          </div>
          <button
            onClick={() => void openExtend(u)}
            style={{ marginTop: 10, padding: "8px 14px", background: "var(--color-primary-bg)", color: "var(--color-primary)", border: "1px solid var(--color-border)", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Extend unlock time
          </button>
        </div>
      ))}

      <PopupModal
        open={!!extendTarget}
        tone="info"
        title="Extend unlock"
        confirmLabel={extending ? "Processing..." : "Pay & extend"}
        onConfirm={() => { if (!extending) void confirmExtend() }}
        onClose={() => { setExtendTarget(null); setExtendInfo(null) }}
        message={
          extendTarget && extendInfo ? (
            <div style={{ textAlign: "left", fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Add <strong>{formatUnlockDuration(extendInfo.totalDays)}</strong> to your{" "}
              <strong>{formatLookingFor(extendTarget.looking_for_category, extendTarget.target_gender)}</strong> unlock for{" "}
              <strong>₹{extendInfo.price / 100}</strong>. The new time is added on top of your current expiry.
            </div>
          ) : null
        }
      />
    </div>
  )
}
