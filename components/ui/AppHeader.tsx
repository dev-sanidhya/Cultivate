"use client"

import Link from "next/link"
import { Bell } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import type { Profile } from "@/types"

export function AppHeader({ profile }: { profile: Profile }) {
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
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="app-top-header-brand"
          style={{
            fontSize: 22,
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
          <Link href="/notifications" style={{ display: "flex" }}>
            <button
              className="btn-ghost"
              style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--color-primary-bg)" }}
            >
              <Bell size={18} color="var(--color-primary)" />
            </button>
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
