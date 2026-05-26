"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Search } from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import type { Profile } from "@/types"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers(phone?: string) {
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false })
    if (phone) query = query.ilike("phone", `%${phone}%`)
    const { data } = await query.limit(50)
    setUsers(data ?? [])
    setLoading(false)
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginBottom: 24 }}>User Management</h1>

      <div style={{ position: "relative", maxWidth: 400, marginBottom: 24 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
        <input
          className="input"
          style={{ paddingLeft: 40 }}
          placeholder="Search by phone number..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); loadUsers(e.target.value || undefined) }}
        />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-primary-bg)" }}>
              {["Full Name", "Phone", "Gender", "Date of Birth", "Joined"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>No users found</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} style={{ borderTop: "1px solid var(--color-border-light)" }}>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                    {user.first_name} {user.last_name}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--color-text-secondary)" }}>{user.phone}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{user.gender}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--color-text-secondary)" }}>{formatDate(user.date_of_birth)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--color-text-secondary)" }}>{formatDate(user.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
