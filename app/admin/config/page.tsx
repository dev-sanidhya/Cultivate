"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Save } from "lucide-react"
import type { ChatPricing, FieldOption } from "@/types"

const PLATFORM_KEYS = [
  { key: "support_email", label: "Support Email" },
  { key: "instagram_handle", label: "Instagram Handle" },
  { key: "twitter_handle", label: "Twitter/X Handle" },
  { key: "upload_contacts_email", label: "Upload Contacts Email" },
  { key: "feedback_email", label: "Feedback Email" },
  { key: "contact_penalty_amount", label: "Contact Details Penalty Amount (Rs.)" },
]

export default function AdminConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [pricing, setPricing] = useState<ChatPricing[]>([])
  const [verifiedCategories, setVerifiedCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const supabase = createClient()
    const [{ data: configData }, { data: pricingData }, { data: fieldOptionsData }] = await Promise.all([
      supabase.from("platform_config").select("*"),
      supabase.from("chat_pricing").select("*"),
      supabase.from("field_options").select("field_name, value").eq("field_name", "looking_for").eq("is_approved", true).order("value"),
    ])

    const configMap: Record<string, string> = {}
    for (const c of configData ?? []) configMap[c.key] = c.value
    setConfigs(configMap)

    const verifiedLookingFor = ((fieldOptionsData ?? []) as FieldOption[])
      .map((option) => option.value.trim())
      .filter(Boolean)

    const existingPricing = (pricingData ?? []) as ChatPricing[]
    const pricingByCategory = new Map(existingPricing.map((row) => [row.looking_for_category, row] as const))

    const missingCategories = verifiedLookingFor.filter((category) => !pricingByCategory.has(category))
    if (missingCategories.length > 0) {
      await supabase.from("chat_pricing").upsert(
        missingCategories.map((category) => ({
          looking_for_category: category,
          price: 0,
          duration_days: 30,
        })),
        { onConflict: "looking_for_category" },
      )
    }

    const freshPricing = await supabase.from("chat_pricing").select("*")
    setPricing((freshPricing.data ?? []) as ChatPricing[])
    setVerifiedCategories(verifiedLookingFor)
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadData()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  async function saveConfig() {
    setSaving(true)
    const supabase = createClient()
    for (const [key, value] of Object.entries(configs)) {
      await supabase.from("platform_config").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
    }
    toast.success("Config saved")
    setSaving(false)
  }

  async function updatePricing(id: string, field: "price" | "duration_days", value: number) {
    const supabase = createClient()
    await supabase.from("chat_pricing").update({ [field]: value }).eq("id", id)
    setPricing((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p))
  }

  if (loading) return <div style={{ padding: 40, color: "var(--color-text-secondary)" }}>Loading...</div>

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginBottom: 24 }}>Platform Configuration</h1>

      {/* Platform settings */}
      <div className="card" style={{ padding: "24px", marginBottom: 24, maxWidth: 600 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 20 }}>Platform Settings</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PLATFORM_KEYS.map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                className="input"
                value={configs[key] ?? ""}
                onChange={(e) => setConfigs((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={`Enter ${label.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 20, padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}
        >
          <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Chat Pricing */}
      <div className="card" style={{ padding: "24px", maxWidth: 700 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>Chat Pricing</h2>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-primary-bg)" }}>
              {["Category", "Price (₹)", "Duration (days)"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pricing.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid var(--color-border-light)" }}>
                <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                  {p.looking_for_category}
                  {verifiedCategories.includes(p.looking_for_category) && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "var(--color-success)", background: "var(--color-success-bg)", padding: "3px 8px", borderRadius: 999 }}>
                      Verified
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <input
                    type="number"
                    className="input"
                    value={p.price / 100}
                    onChange={(e) => updatePricing(p.id, "price", Math.round(parseFloat(e.target.value) * 100))}
                    style={{ maxWidth: 100 }}
                    min={0}
                  />
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <input
                    type="number"
                    className="input"
                    value={p.duration_days}
                    onChange={(e) => updatePricing(p.id, "duration_days", parseInt(e.target.value))}
                    style={{ maxWidth: 100 }}
                    min={1}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 12 }}>Set price to 0 for free. Price is in rupees.</p>
      </div>
    </div>
  )
}
