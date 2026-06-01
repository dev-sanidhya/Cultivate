"use client"

import { useEffect, useState, type FormEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ADMIN_PAGES } from "@/types"
import type { AdminUser } from "@/types"
import { sha256Hex } from "@/lib/utils/hash"

type AdminFormData = {
  name: string
  username: string
  password: string
  role: "employee" | "owner"
  accessible_pages: string[]
}

const EMPTY_FORM_DATA: AdminFormData = {
  name: "",
  username: "",
  password: "",
  role: "employee",
  accessible_pages: [],
}

export default function AdminAccessPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AdminFormData>(EMPTY_FORM_DATA)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAdmins() }, [])

  async function loadAdmins() {
    const supabase = createClient()
    const { data } = await supabase.from("admin_users").select("id, name, username, role, accessible_pages, created_at").order("created_at")
    setAdmins(data ?? [])
    setLoading(false)
  }

  function openCreateForm() {
    setEditingAdminId(null)
    setFormData(EMPTY_FORM_DATA)
    setShowForm(true)
  }

  function openEditForm(admin: AdminUser) {
    setEditingAdminId(admin.id)
    setFormData({
      name: admin.name,
      username: admin.username,
      password: "",
      role: admin.role,
      accessible_pages: admin.accessible_pages ?? [],
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingAdminId(null)
    setFormData(EMPTY_FORM_DATA)
  }

  async function saveAdmin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!formData.name || !formData.username || (!editingAdminId && !formData.password)) {
      toast.error("Fill all fields")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const payload: Partial<AdminUser> & { password_hash?: string } = {
      name: formData.name,
      username: formData.username,
      role: formData.role,
      accessible_pages: formData.accessible_pages,
    }

    if (formData.password) {
      payload.password_hash = await sha256Hex(formData.password)
    }

    const { error } = editingAdminId
      ? await supabase.from("admin_users").update(payload).eq("id", editingAdminId)
      : await supabase.from("admin_users").insert({
          ...payload,
          password_hash: payload.password_hash ?? "",
        })

    if (error) {
      toast.error(error.message)
    } else {
      const isEditingCurrentAdmin = (() => {
        if (typeof window === "undefined" || !editingAdminId) return false
        const stored = sessionStorage.getItem("admin_user")
        if (!stored) return false
        try {
          return JSON.parse(stored)?.id === editingAdminId
        } catch {
          return false
        }
      })()

      if (isEditingCurrentAdmin) {
        const stored = sessionStorage.getItem("admin_user")
        if (stored) {
          try {
            const currentUser = JSON.parse(stored)
            sessionStorage.setItem("admin_user", JSON.stringify({
              ...currentUser,
              name: formData.name,
              role: formData.role,
              accessible_pages: formData.accessible_pages,
            }))
          } catch {
            // Ignore malformed session storage and let the layout refresh on next load.
          }
        }
      }

      toast.success(editingAdminId ? "Admin updated" : "Admin created")
      closeForm()
      await loadAdmins()
    }
    setSaving(false)
  }

  async function deleteAdmin(id: string) {
    if (!confirm("Delete this admin?")) return
    const supabase = createClient()
    const { error } = await supabase.from("admin_users").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }

    setAdmins((prev) => prev.filter((a) => a.id !== id))
    toast.success("Admin removed")
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)" }}>User Access</h1>
        <button
          onClick={openCreateForm}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}
        >
          <Plus size={16} /> New Admin
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: "24px", marginBottom: 24, maxWidth: 500 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            {editingAdminId ? "Edit Admin Account" : "Create Admin Account"}
          </h2>
          <form onSubmit={saveAdmin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              <input
                className="input"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                placeholder={editingAdminId ? "Leave blank to keep current password" : "Password"}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["employee", "owner"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`tag ${formData.role === r ? "selected" : ""}`}
                    onClick={() => setFormData((p) => ({ ...p, role: r }))}
                    style={{ textTransform: "capitalize" }}
                  >
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
                    type="button"
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
              <button type="button" onClick={closeForm} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? (editingAdminId ? "Saving..." : "Creating...") : (editingAdminId ? "Save Changes" : "Create Admin")}
              </button>
            </div>
          </form>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {admin.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => openEditForm(admin)}
                        className="btn-ghost"
                        style={{ padding: 6 }}
                        title="Edit admin"
                        aria-label={`Edit ${admin.username}`}
                      >
                        <Pencil size={14} color="var(--color-primary)" />
                      </button>
                    )}
                    {admin.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => deleteAdmin(admin.id)}
                        className="btn-ghost"
                        style={{ padding: 6 }}
                        title="Delete admin"
                        aria-label={`Delete ${admin.username}`}
                      >
                        <Trash2 size={14} color="var(--color-error)" />
                      </button>
                    )}
                  </div>
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
