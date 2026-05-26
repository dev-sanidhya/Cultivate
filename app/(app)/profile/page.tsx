"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { formatDate } from "@/lib/utils/format"
import type { Profile } from "@/types"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>

  return (
    <div className="page-container" style={{ paddingTop: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginBottom: 24 }}>Profile</h1>

      {profile && (
        <>
          {/* Profile card */}
          <div className="card" style={{ padding: "24px", textAlign: "center", marginBottom: 20 }}>
            <Avatar
              name={`${profile.first_name} ${profile.last_name}`}
              photoUrl={profile.photo_url}
              size={80}
            />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginTop: 16, marginBottom: 4 }}>
              {profile.first_name} {profile.last_name}
            </h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
              {profile.gender}
            </p>
          </div>

          {/* Details */}
          <div className="card" style={{ padding: "20px", marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
              Account Details
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Phone", value: profile.phone },
                { label: "Gender", value: profile.gender, capitalize: true },
                { label: "Date of Birth", value: formatDate(profile.date_of_birth) },
                { label: "Member Since", value: formatDate(profile.created_at) },
              ].map(({ label, value, capitalize }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", textTransform: capitalize ? "capitalize" : "none" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", marginBottom: 24 }}>
            Profile details are permanent and cannot be changed.
          </p>

          <button
            onClick={signOut}
            disabled={signingOut}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: "var(--color-error-bg)", color: "var(--color-error)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {signingOut ? <Spinner size={18} color="red" /> : <><LogOut size={18} /> Sign Out</>}
          </button>
        </>
      )}
    </div>
  )
}
