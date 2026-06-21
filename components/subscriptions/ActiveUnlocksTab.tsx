"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/Spinner"
import { formatLookingFor } from "@/lib/lookingFor"
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

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
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
    })()
  }, [])

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
        </div>
      ))}
    </div>
  )
}
