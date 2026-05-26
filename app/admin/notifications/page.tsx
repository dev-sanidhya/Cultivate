"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Send } from "lucide-react"

export default function AdminNotificationsPage() {
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!phone || !message) { toast.error("Enter phone number and message"); return }
    setSending(true)

    const supabase = createClient()
    const normalizedPhone = phone.replace(/\D/g, "")
    const phoneVariants = [
      `+91${normalizedPhone}`,
      normalizedPhone.length === 10 ? `+91${normalizedPhone}` : `+${normalizedPhone}`,
    ]

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .in("phone", phoneVariants)
      .single()

    if (!profile) {
      toast.error("No user found with this phone number")
      setSending(false)
      return
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: profile.id,
      message,
      type: "admin_message",
    })

    if (error) {
      toast.error("Failed to send notification")
    } else {
      toast.success("Notification sent!")
      setPhone("")
      setMessage("")
    }
    setSending(false)
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginBottom: 24 }}>Send Notification</h1>

      <div className="card" style={{ padding: "24px", maxWidth: 500 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label className="label">User Phone Number</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--color-text-secondary)" }}>+91</span>
              <input
                className="input"
                style={{ paddingLeft: 46 }}
                type="tel"
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              className="input"
              placeholder="Notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              style={{ resize: "vertical" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 15 }}
          >
            <Send size={16} /> {sending ? "Sending..." : "Send Notification"}
          </button>
        </div>
      </div>
    </div>
  )
}
