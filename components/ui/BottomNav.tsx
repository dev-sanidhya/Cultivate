"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, CreditCard, Search, MessageCircle, Bookmark } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchUnreadChatCount } from "@/lib/badges"

const NAV_ITEMS = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/cards", icon: CreditCard, label: "My Cards" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/saved", icon: Bookmark, label: "Saved" },
]

export function BottomNav() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [unreadChats, setUnreadChats] = useState(0)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    let active = true
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let authSubscription: { unsubscribe: () => void } | null = null

    async function loadUnreadChats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (active) setUnreadChats(0)
        return
      }

      if (channel) {
        void supabase.removeChannel(channel)
        channel = null
      }

      const count = await fetchUnreadChatCount(supabase, user.id)
      if (!active) return
      setUnreadChats(count)

      channel = supabase
        .channel(`chat-unread:${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          async () => {
            try {
              const nextCount = await fetchUnreadChatCount(supabase, user.id)
              if (active) setUnreadChats(nextCount)
            } catch {
              if (active) setUnreadChats(0)
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_reads", filter: `user_id=eq.${user.id}` },
          async () => {
            try {
              const nextCount = await fetchUnreadChatCount(supabase, user.id)
              if (active) setUnreadChats(nextCount)
            } catch {
              if (active) setUnreadChats(0)
            }
          },
        )
        .subscribe()

      if (!active && channel) {
        void supabase.removeChannel(channel)
      }
    }

    void loadUnreadChats()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadUnreadChats()
    })
    authSubscription = subscription

    return () => {
      active = false
      authSubscription?.unsubscribe()
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [])

  if (isMobile && pathname.startsWith("/chat/")) {
    return null
  }

  return (
    <nav
      className="bottom-nav-mobile"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 20px rgba(109, 40, 217, 0.08)",
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "4px 0",
                color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 36,
                  height: 28,
                  borderRadius: 10,
                  background: active ? "var(--color-primary-bg)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {label === "Chat" && unreadChats > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#ef4444",
                      border: "2px solid var(--color-surface)",
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
