"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"
import { timeAgo } from "@/lib/utils/format"
import type { Notification } from "@/types"
import { Bell } from "lucide-react"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
      setNotifications(data ?? [])

      // Mark all as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false)

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>

  return (
    <div className="page-container" style={{ paddingTop: 20 }}>
      <PageHeader title="Notifications" showBack />

      {notifications.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <Bell size={48} color="var(--color-text-muted)" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>No notifications</p>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 8 }}>
            {"You're all caught up!"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "14px 16px",
                background: n.is_read ? "transparent" : "var(--color-primary-bg)",
                borderRadius: 12,
                borderLeft: n.is_read ? "none" : "3px solid var(--color-primary)",
              }}
            >
              <p style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.5 }}>{n.message}</p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                {timeAgo(n.event_at ?? n.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
