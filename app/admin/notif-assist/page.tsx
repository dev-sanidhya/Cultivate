"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RefreshCw, Plus, Minus, Download } from "lucide-react"

interface EligibleUser {
  user_id: string
  phone: string
  first_name: string
  last_name: string
  offer_type: string
  expires_at: string
  count: number
}

export default function NotifAssistPage() {
  const [users, setUsers] = useState<EligibleUser[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [countFilter, setCountFilter] = useState<number | "all">("all")

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/notif-assist")
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch {
      toast.error("Failed to load list")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [])

  async function adjust(delta: number) {
    setWorking(true)
    try {
      const res = await fetch("/api/admin/notif-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      })
      const data = await res.json()
      setUsers(data.users ?? [])
      toast.success("Counts updated")
    } catch {
      toast.error("Failed to update counts")
    } finally {
      setWorking(false)
    }
  }

  const filtered = countFilter === "all" ? users : users.filter((u) => u.count === countFilter)

  function exportCsv() {
    const header = ["Phone", "First Name", "Last Name", "Offer", "Expires At", "Notification Count"]
    const lines = filtered.map((u) =>
      [u.phone, u.first_name, u.last_name, u.offer_type, u.expires_at, String(u.count)]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    const csv = [header.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `notif-assist-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)" }}>Notification Assistance</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
            Users whose active offer expires in 7-4 hours. Export and notify via your messaging tool.
          </p>
        </div>
        <button onClick={() => void load()} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid var(--color-border)", borderRadius: 10 }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "16px 0" }}>
        <button onClick={() => void adjust(1)} disabled={working} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          <Plus size={15} /> Count +1 (all listed)
        </button>
        <button onClick={() => void adjust(-1)} disabled={working} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "white", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          <Minus size={15} /> Count -1 (all listed)
        </button>

        <select
          className="input"
          value={String(countFilter)}
          onChange={(e) => setCountFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
          style={{ maxWidth: 200 }}
        >
          <option value="all">All counts</option>
          <option value="0">Count = 0</option>
          <option value="1">Count = 1</option>
          <option value="2">Count = 2</option>
          <option value="3">Count = 3</option>
        </select>

        <button onClick={exportCsv} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--color-success-bg)", color: "var(--color-success)", border: "1px solid var(--color-border)", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          <Download size={15} /> Export CSV ({filtered.length})
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>No users currently in the eligibility window.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden", maxWidth: 900 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-primary-bg)" }}>
                {["Phone", "Name", "Offer", "Expires", "Count"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.user_id} style={{ borderTop: "1px solid var(--color-border-light)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{u.phone}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{u.first_name} {u.last_name}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, textTransform: "capitalize" }}>{u.offer_type.replace("_", " ")}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {new Date(u.expires_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "var(--color-primary)" }}>{u.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
