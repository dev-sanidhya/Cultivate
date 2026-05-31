"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { createClient } from "@/lib/supabase/client"
import { fetchUnreadNotificationCount } from "@/lib/badges"
import type { Profile } from "@/types"
import type { Session } from "@supabase/supabase-js"

export function AppHeader({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (active) {
        const nextUserId = session?.user.id ?? null
        setUserId(nextUserId)
        if (!nextUserId) setUnreadNotifications(0)
      }
    })

    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (active) setUserId(data.user?.id ?? null)
    })()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshUnreadNotifications = useCallback(async () => {
    if (!userId) return

    const supabase = createClient()
    try {
      const count = await fetchUnreadNotificationCount(supabase, userId)
      setUnreadNotifications(count)
    } catch {
      setUnreadNotifications(0)
    }
  }, [userId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUnreadNotifications()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [pathname, refreshUnreadNotifications])

  useEffect(() => {
    if (!userId) return
    const currentUserId = userId

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        () => {
          void refreshUnreadNotifications()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refreshUnreadNotifications, userId])

  if (isMobile && pathname.startsWith("/chat/")) {
    return null
  }

  return (
    <header
      className="app-top-header"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        background: "rgba(250,250,250,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        className="app-top-header-inner"
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="app-top-header-brand"
          style={{
            fontSize: 24,
            fontWeight: 800,
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Strefo
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/notifications"
            onClick={() => setUnreadNotifications(0)}
            style={{ display: "flex" }}
            aria-label="Notifications"
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--color-primary-bg)",
              }}
            >
              <Bell size={18} color="var(--color-primary)" />
              {unreadNotifications > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "2px solid rgba(250, 250, 250, 0.95)",
                  }}
                />
              )}
            </div>
          </Link>
          <Link href="/profile" style={{ display: "flex" }}>
            <Avatar
              name={`${profile.first_name} ${profile.last_name}`}
              photoUrl={profile.photo_url}
              size={36}
            />
          </Link>
        </div>
      </div>
    </header>
  )
}
