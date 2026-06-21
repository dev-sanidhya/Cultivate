"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  BarChart2, Users, CreditCard, Phone, Settings,
  Bell, Shield, LogOut, Menu, X, ChevronRight, Gift, Image as ImageIcon, Send
} from "lucide-react"
import {
  ADMIN_LOGIN_PATH,
  canAccessAdminPath,
  getAccessibleAdminPages,
  getAdminPageFromPathname,
  getDefaultAdminPath,
} from "@/lib/admin-access"

function getAdminPageIcon(key: string) {
  if (key === "stats") return BarChart2
  if (key === "users") return Users
  if (key === "fields") return CreditCard
  if (key === "contacts") return Phone
  if (key === "config") return Settings
  if (key === "offers") return Gift
  if (key === "banners") return ImageIcon
  if (key === "notifications") return Bell
  if (key === "notif_assist") return Send
  return Shield
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminUser, setAdminUser] = useState<{
    id: string
    name: string
    role: "owner" | "employee"
    accessible_pages: string[]
  } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (pathname === ADMIN_LOGIN_PATH) {
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

  const accessibleNavItems = getAccessibleAdminPages(adminUser)
  const currentPage = getAdminPageFromPathname(pathname)
  const currentPageAllowed = canAccessAdminPath(adminUser, pathname)
  const defaultAdminPath = getDefaultAdminPath(adminUser)

  useEffect(() => {
    if (pathname === ADMIN_LOGIN_PATH) return
    if (!authChecked || !adminUser) return

    if (pathname === "/admin") {
      if (defaultAdminPath) {
        router.replace(defaultAdminPath)
      }
      return
    }

    if (!currentPageAllowed) {
      if (defaultAdminPath) {
        router.replace(defaultAdminPath)
      }
    }
  }, [adminUser, authChecked, currentPageAllowed, defaultAdminPath, pathname, router])

  function signOut() {
    sessionStorage.removeItem("admin_user")
    router.push("/admin/login")
  }

  if (pathname === ADMIN_LOGIN_PATH) return <>{children}</>
  if (!authChecked || !adminUser) {
    return <div style={{ minHeight: "100vh", background: "#F8F7FF" }} />
  }

  if (pathname !== "/admin" && !currentPageAllowed) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#F8F7FF" }}>
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
              <button className="btn-ghost" onClick={() => setSidebarOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div style={{ marginTop: 12, padding: "10px", background: "var(--color-primary-bg)", borderRadius: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{adminUser?.name}</p>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{adminUser?.role}</p>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
              {accessibleNavItems.length > 0 ? (
                accessibleNavItems.map(({ href, key, label }) => {
                  const Icon = getAdminPageIcon(key)
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
              })
            ) : (
              <div style={{ padding: "12px", color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
                No admin pages are assigned to this account.
              </div>
            )}
          </nav>

          <div style={{ padding: "12px", borderTop: "1px solid var(--color-border)" }}>
            <button
              onClick={signOut}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, background: "var(--color-error-bg)",
                color: "var(--color-error)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              }}
              type="button"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", marginLeft: 0 }}>
          <header style={{
            background: "white", borderBottom: "1px solid var(--color-border)",
            padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 30,
          }}>
            <button className="btn-ghost" onClick={() => setSidebarOpen(true)} type="button">
              <Menu size={20} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
              {currentPage?.label ?? "Admin Panel"}
            </span>
          </header>

          <main style={{ flex: 1, padding: "24px 20px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            <div className="card" style={{ padding: "24px", maxWidth: 560 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginBottom: 12 }}>
                Access denied
              </h1>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                This admin account does not have permission to view {currentPage?.label ?? "this page"}.
              </p>
              {defaultAdminPath ? (
                <button
                  type="button"
                  onClick={() => router.replace(defaultAdminPath)}
                  className="btn-primary"
                >
                  Go to allowed page
                </button>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    )
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
            <button className="btn-ghost" onClick={() => setSidebarOpen(false)} type="button">
              <X size={18} />
            </button>
          </div>
          <div style={{ marginTop: 12, padding: "10px", background: "var(--color-primary-bg)", borderRadius: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{adminUser?.name}</p>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{adminUser?.role}</p>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
          {accessibleNavItems.map(({ href, key, label }) => {
            const Icon = getAdminPageIcon(key)
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
          <button className="btn-ghost" onClick={() => setSidebarOpen(true)} type="button">
            <Menu size={20} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
            {currentPage?.label ?? "Admin Panel"}
          </span>
        </header>

        <main style={{ flex: 1, padding: "24px 20px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
