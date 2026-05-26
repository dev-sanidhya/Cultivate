"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/Spinner"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!username || !password) { toast.error("Enter credentials"); return }
    setLoading(true)

    const supabase = createClient()
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, name, role, accessible_pages, password_hash")
      .eq("username", username)
      .single()

    if (!admin) { toast.error("Invalid credentials"); setLoading(false); return }

    // Simple password check (in production, use bcrypt)
    const { createHash } = await import("crypto").catch(() => ({ createHash: null }))
    // Fallback: compare plaintext (admin sets up passwords manually via DB)
    const passwordMatches = admin.password_hash === password ||
      (createHash && admin.password_hash === createHash("sha256").update(password).digest("hex"))

    if (!passwordMatches) { toast.error("Invalid credentials"); setLoading(false); return }

    sessionStorage.setItem("admin_user", JSON.stringify({
      id: admin.id,
      name: admin.name,
      role: admin.role,
      accessible_pages: admin.accessible_pages,
    }))

    router.push("/admin/stats")
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #F5F3FF 0%, #FDF2F8 50%, #FAFAFA 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: "32px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{
            fontSize: 28, fontWeight: 800,
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Strefo Admin</span>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 6 }}>Sign in to admin panel</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">Username</label>
            <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <Spinner /> : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  )
}
