"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  BarChart2, Users, CreditCard, Phone, Settings,
  Bell, Shield, LogOut, Menu, X, ChevronRight
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/admin/stats", icon: BarChart2, label: "Statistics" },
  { href: "/admin/users", icon: Users, label: "User Management" },
  { href: "/admin/fields", icon: CreditCard, label: "Card Fields" },
  { href: "/admin/contacts", icon: Phone, label: "Contact Status" },
  { href: "/admin/config", icon: Settings, label: "Platform Config" },
  { href: "/admin/notifications", icon: Bell, label: "Send Notifications" },
  { href: "/admin/access", icon: Shield, label: "User Access" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (pathname === "/admin/login") {
      return
    }

    const timeoutId = setTimeout(() => {
      const stored = sessionStorage.getItem("admin_user")
      if (!stored) {
        setAuthChecked(true)
        router.push("/admin/login")
        return
      }

      try {
        setAdminUser(JSON.parse(stored))
      } catch {
        sessionStorage.removeItem("admin_user")
        router.push("/admin/login")
      } finally {
        setAuthChecked(true)
      }
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [pathname, router])

  function signOut() {
    sessionStorage.removeItem("admin_user")
    router.push("/admin/login")
  }

  if (pathname === "/admin/login") return <>{children}</>
  if (!authChecked || !adminUser) {
    return <div style={{ minHeight: "100vh", background: "#F8F7FF" }} />
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8F7FF" }}>
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: "white",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: sidebarOpen ? 0 : -260,
          transition: "left 0.3s",
          zIndex: 50,
        }}
      >
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 18, fontWeight: 800, background: "linear-gradient(135deg, #7C3AED, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Strefo Admin
            </span>
            <button className="btn-ghost" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div style={{ marginTop: 12, padding: "10px", background: "var(--color-primary-bg)", borderRadius: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{adminUser?.name}</p>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{adminUser?.role}</p>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 12px", borderRadius: 10, marginBottom: 2,
                  background: active ? "var(--color-primary-bg)" : "transparent",
                  color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                  textDecoration: "none", fontWeight: active ? 600 : 400, fontSize: 14,
                  transition: "all 0.15s",
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{label}</span>
                {active && <ChevronRight size={14} />}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: "12px", borderTop: "1px solid var(--color-border)" }}>
          <button
            onClick={signOut}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, background: "var(--color-error-bg)",
              color: "var(--color-error)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", marginLeft: 0 }}>
        {/* Top bar */}
        <header style={{
          background: "white", borderBottom: "1px solid var(--color-border)",
          padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 30,
        }}>
          <button className="btn-ghost" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
            {NAV_ITEMS.find((n) => pathname === n.href)?.label ?? "Admin Panel"}
          </span>
        </header>

        <main style={{ flex: 1, padding: "24px 20px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
