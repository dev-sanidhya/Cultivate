"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, CreditCard, MessageCircle, Activity } from "lucide-react"

interface Stats {
  total_users: number
  users_by_gender: { male: number; female: number; other: number }
  cards_by_looking_for: { category: string; total: number; chat_enabled: number; locked: number }[]
  visit_counts: { visits: number; count: number }[]
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [
        { count: totalUsers },
        { data: profiles },
        { data: cards },
        { data: visits },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("gender"),
        supabase.from("cards").select("looking_for, chat_enabled, is_closed"),
        supabase.from("visit_logs").select("user_id"),
      ])

      // Group by gender
      const genderCounts = { male: 0, female: 0, other: 0 }
      for (const p of profiles ?? []) {
        genderCounts[p.gender as keyof typeof genderCounts] = (genderCounts[p.gender as keyof typeof genderCounts] || 0) + 1
      }

      // Group cards by looking_for
      const cardMap = new Map<string, { total: number; chat_enabled: number; locked: number }>()
      for (const c of cards ?? []) {
        if (!c.looking_for) continue
        const existing = cardMap.get(c.looking_for) ?? { total: 0, chat_enabled: 0, locked: 0 }
        existing.total++
        if (c.chat_enabled) existing.chat_enabled++
        if (c.is_closed) existing.locked++
        cardMap.set(c.looking_for, existing)
      }

      // Visit frequency
      const visitFreq = new Map<string, number>()
      for (const v of visits ?? []) {
        visitFreq.set(v.user_id, (visitFreq.get(v.user_id) ?? 0) + 1)
      }
      const visitDist = new Map<number, number>()
      for (const count of visitFreq.values()) {
        const key = count >= 5 ? 5 : count
        visitDist.set(key, (visitDist.get(key) ?? 0) + 1)
      }

      setStats({
        total_users: totalUsers ?? 0,
        users_by_gender: genderCounts,
        cards_by_looking_for: Array.from(cardMap.entries()).map(([category, data]) => ({ category, ...data })),
        visit_counts: Array.from(visitDist.entries()).map(([visits, count]) => ({ visits, count })),
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 40, color: "var(--color-text-secondary)" }}>Loading stats...</div>

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginBottom: 24 }}>Statistics</h1>

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard icon={<Users size={20} color="#7C3AED" />} label="Total Users" value={stats?.total_users ?? 0} color="#F5F3FF" />
        <StatCard icon={<CreditCard size={20} color="#EC4899" />} label="Total Cards" value={stats?.cards_by_looking_for.reduce((s, c) => s + c.total, 0) ?? 0} color="#FDF2F8" />
        <StatCard icon={<MessageCircle size={20} color="#10B981" />} label="Chat Enabled" value={stats?.cards_by_looking_for.reduce((s, c) => s + c.chat_enabled, 0) ?? 0} color="#ECFDF5" />
        <StatCard icon={<Activity size={20} color="#F59E0B" />} label="Cards Matched" value={stats?.cards_by_looking_for.reduce((s, c) => s + c.locked, 0) ?? 0} color="#FFFBEB" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {/* Gender breakdown */}
        <div className="card" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 16 }}>Users by Gender</h2>
          {Object.entries(stats?.users_by_gender ?? {}).map(([gender, count]) => (
            <div key={gender} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{gender}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Cards by category */}
        <div className="card" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 16 }}>Cards by Category</h2>
          {(stats?.cards_by_looking_for ?? []).map((row) => (
            <div key={row.category} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--color-border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{row.category}</span>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{row.total} cards</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 12, color: "var(--color-success)" }}>Chat: {row.chat_enabled}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Locked: {row.locked}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Visit frequency */}
        <div className="card" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 16 }}>Visit Frequency</h2>
          {[1, 2, 3, 4, 5].map((n) => {
            const count = stats?.visit_counts.find((v) => v.visits === n)?.count ?? 0
            return (
              <div key={n} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                  {n === 5 ? "5+ times" : `${n} time${n > 1 ? "s" : ""}`}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{count} users</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: "20px", background: color }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-sm)" }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)" }}>{value.toLocaleString()}</p>
    </div>
  )
}
