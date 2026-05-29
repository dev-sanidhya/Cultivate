"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, CreditCard, Search, MessageCircle, Bookmark } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchUnreadChatCount } from "@/lib/badges"
import type { Session } from "@supabase/supabase-js"

const NAV_ITEMS = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/cards", icon: CreditCard, label: "My Cards" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/saved", icon: Bookmark, label: "Saved" },
]

export function DesktopSidebarNav() {
  const pathname = usePathname()
  const [unreadChats, setUnreadChats] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (active) {
        const nextUserId = session?.user.id ?? null
        setUserId(nextUserId)
        if (!nextUserId) setUnreadChats(0)
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

  useEffect(() => {
    if (!userId) return
    const currentUserId = userId

    const supabase = createClient()
    let active = true

    async function refreshUnreadChats() {
      try {
        const nextCount = await fetchUnreadChatCount(supabase, currentUserId)
        if (active) setUnreadChats(nextCount)
      } catch {
        if (active) setUnreadChats(0)
      }
    }

    void refreshUnreadChats()

    const channel = supabase
      .channel(`desktop-chat-unread:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void refreshUnreadChats()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads", filter: `user_id=eq.${currentUserId}` },
        () => {
          void refreshUnreadChats()
        },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <aside className="desktop-sidebar-nav">
      <div
        className="desktop-sidebar-brand"
        style={{
          padding: "0 24px",
          height: 57,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1,
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Strefo
        </span>
      </div>

      <nav style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                textDecoration: "none",
                background: active ? "var(--color-primary-bg)" : "transparent",
                border: active ? "1px solid var(--color-border)" : "1px solid transparent",
                color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontWeight: active ? 700 : 500,
                transition: "all 0.15s",
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} />
                {label === "Chat" && unreadChats > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#ef4444",
                      border: "2px solid var(--color-surface)",
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 15 }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
