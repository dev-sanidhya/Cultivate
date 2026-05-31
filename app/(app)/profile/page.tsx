"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { formatDate } from "@/lib/utils/format"
import { fetchBlockedUsers, unblockUser } from "@/lib/blocks"
import { toast } from "sonner"
import type { Profile, UserBlock } from "@/types"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const [{ data: profileData }, blockedData] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        fetchBlockedUsers(supabase, user.id),
      ])

      setProfile(profileData)
      setBlockedUsers(blockedData)
      setLoading(false)
    }

    void load().catch(() => {
      setLoading(false)
    })
  }, [])

  async function handleUnblock(blockedUserId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      await unblockUser(supabase, {
        blockerId: user.id,
        blockedUserId,
      })
      setBlockedUsers((prev) => prev.filter((item) => item.blocked_user_id !== blockedUserId))
      toast.success("User unblocked")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unblock user")
    }
  }

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>

  return (
    <div className="page-container" style={{ paddingTop: 10 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginBottom: 12 }}>Profile</h1>

      {profile && (
        <>
          {/* Profile card */}
          <div className="card" style={{ padding: "24px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Avatar
                name={`${profile.first_name} ${profile.last_name}`}
                photoUrl={profile.photo_url}
                size={80}
              />
              <div style={{ minWidth: 0, textAlign: "left" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginBottom: 4, lineHeight: 1.1 }}>
                  {profile.first_name} {profile.last_name}
                </h2>
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
                  {profile.gender}
                </p>
              </div>
            </div>
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

          {blockedUsers.length > 0 && (
            <div className="card" style={{ padding: "20px", marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                Blocked users
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {blockedUsers.map((blocked) => (
                  <div
                    key={blocked.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: "var(--color-primary-bg)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        Blocked via card
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text)", wordBreak: "break-word" }}>
                        #{blocked.blocked_card_id}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        void handleUnblock(blocked.blocked_user_id)
                      }}
                      style={{
                        flexShrink: 0,
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        background: "white",
                        color: "var(--color-error)",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
