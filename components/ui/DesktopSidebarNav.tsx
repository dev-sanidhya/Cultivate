"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CreditCard, Search, MessageCircle, Bookmark } from "lucide-react"

const NAV_ITEMS = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/cards", icon: CreditCard, label: "My Cards" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/saved", icon: Bookmark, label: "Saved" },
]

export function DesktopSidebarNav() {
  const pathname = usePathname()

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
              <Icon size={18} />
              <span style={{ fontSize: 15 }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
