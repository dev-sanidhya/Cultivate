"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, CreditCard, Search, MessageCircle, Bookmark } from "lucide-react"

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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
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
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
