"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { ADMIN_PAGES } from "@/types"
import type { AdminUser } from "@/types"
import { sha256Hex } from "@/lib/utils/hash"

export default function AdminAccessPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", username: "", password: "", role: "employee" as "employee" | "owner", accessible_pages: [] as string[] })
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadAdmins() }, [])

  async function loadAdmins() {
    const supabase = createClient()
    const { data } = await supabase.from("admin_users").select("id, name, username, role, accessible_pages, created_at").order("created_at")
    setAdmins(data ?? [])
    setLoading(false)
  }

  async function createAdmin() {
    if (!formData.name || !formData.username || !formData.password) {
      toast.error("Fill all fields")
      return
    }
    setCreating(true)
    const supabase = createClient()
    const passwordHash = await sha256Hex(formData.password)

    const { error } = await supabase.from("admin_users").insert({
      name: formData.name,
      username: formData.username,
      password_hash: passwordHash,
      role: formData.role,
      accessible_pages: formData.accessible_pages,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Admin created")
      setShowForm(false)
      setFormData({ name: "", username: "", password: "", role: "employee", accessible_pages: [] })
      loadAdmins()
    }
    setCreating(false)
  }

  async function deleteAdmin(id: string) {
    if (!confirm("Delete this admin?")) return
    const supabase = createClient()
    await supabase.from("admin_users").delete().eq("id", id)
    setAdmins((prev) => prev.filter((a) => a.id !== id))
    toast.success("Admin removed")
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)" }}>User Access</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}
        >
          <Plus size={16} /> New Admin
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: "24px", marginBottom: 24, maxWidth: 500 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create Admin Account</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="label">Name</label>
              <input className="input" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <label className="label">Username</label>
              <input className="input" value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))} placeholder="username" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} placeholder="Password" />
            </div>
            <div>
              <label className="label">Role</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["employee", "owner"] as const).map((r) => (
                  <button key={r} className={`tag ${formData.role === r ? "selected" : ""}`} onClick={() => setFormData((p) => ({ ...p, role: r }))} style={{ textTransform: "capitalize" }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Accessible Pages</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ADMIN_PAGES.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`tag ${formData.accessible_pages.includes(key) ? "selected" : ""}`}
                    onClick={() => {
                      setFormData((p) => ({
                        ...p,
                        accessible_pages: p.accessible_pages.includes(key)
                          ? p.accessible_pages.filter((k) => k !== key)
                          : [...p.accessible_pages, key],
                      }))
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={createAdmin} disabled={creating} className="btn-primary" style={{ flex: 1 }}>
                {creating ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-primary-bg)" }}>
              {["Name", "Username", "Role", "Pages", ""].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40 }}>Loading...</td></tr>
            ) : admins.map((admin) => (
              <tr key={admin.id} style={{ borderTop: "1px solid var(--color-border-light)" }}>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>{admin.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--color-text-secondary)" }}>{admin.username}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                    padding: "3px 8px", borderRadius: 20,
                    background: admin.role === "owner" ? "#EDE9FE" : "#F3F4F6",
                    color: admin.role === "owner" ? "var(--color-primary)" : "var(--color-text-secondary)",
                  }}>
                    {admin.role}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {admin.accessible_pages?.length ?? 0} pages
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {admin.role !== "owner" && (
                    <button onClick={() => deleteAdmin(admin.id)} className="btn-ghost" style={{ padding: 6 }}>
                      <Trash2 size={14} color="var(--color-error)" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Owner config note */}
      <div className="card" style={{ padding: "20px", marginTop: 24, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
        <p style={{ fontSize: 14, color: "#92400E" }}>
          <strong>Owner Account:</strong> Prateek Chauhan (username: prateek). Owner account details can only be changed by the owner with OTP verification to +91 7819812678.
        </p>
      </div>
    </div>
  )
}
