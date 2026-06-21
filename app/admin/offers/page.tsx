"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Save, Upload } from "lucide-react"
import { uploadAdminImage } from "@/lib/uploadImage"
import type { Offer, OfferCategoryBenefit, OfferType } from "@/types"

const TABS: { type: OfferType; label: string; hint: string }[] = [
  { type: "welcome", label: "Welcome Offer", hint: "Triggered when a user creates an account." },
  { type: "card_creation", label: "Card Creation Offer", hint: "Triggered when a user creates a card with a 60+ character Note." },
  { type: "occasional", label: "Occasional Offer", hint: "Manually scheduled for all users." },
]

type BenefitState = Record<string, { discounted_price: string; bonus_duration_days: string }>

export default function AdminOffersPage() {
  const [activeTab, setActiveTab] = useState<OfferType>("welcome")
  const [categories, setCategories] = useState<string[]>([])
  const [offers, setOffers] = useState<Record<string, Offer>>({})
  const [benefits, setBenefits] = useState<Record<string, BenefitState>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [])

  async function load() {
    const supabase = createClient()
    const [{ data: offerData }, { data: benefitData }, { data: fieldData }] = await Promise.all([
      supabase.from("offers").select("*"),
      supabase.from("offer_category_benefits").select("*"),
      supabase.from("field_options").select("value").eq("field_name", "looking_for").eq("is_approved", true).order("value"),
    ])

    const offerMap: Record<string, Offer> = {}
    for (const o of (offerData ?? []) as Offer[]) offerMap[o.offer_type] = o

    // Ensure a row exists for each offer type.
    for (const { type } of TABS) {
      if (!offerMap[type]) {
        const { data: created } = await supabase
          .from("offers")
          .insert({ offer_type: type, is_active: false, availability_days: 0, availability_hours: 0 })
          .select("*")
          .single()
        if (created) offerMap[type] = created as Offer
      }
    }
    setOffers(offerMap)

    const cats = ((fieldData ?? []) as { value: string }[]).map((f) => f.value)
    setCategories(cats)

    const benefitMap: Record<string, BenefitState> = {}
    for (const { type } of TABS) benefitMap[type] = {}
    for (const b of (benefitData ?? []) as OfferCategoryBenefit[]) {
      const offerType = Object.values(offerMap).find((o) => o.id === b.offer_id)?.offer_type
      if (!offerType) continue
      benefitMap[offerType][b.looking_for_category] = {
        discounted_price: b.discounted_price != null ? String(b.discounted_price) : "",
        bonus_duration_days: String(b.bonus_duration_days ?? 0),
      }
    }
    setBenefits(benefitMap)
    setLoading(false)
  }

  function updateOffer(type: OfferType, patch: Partial<Offer>) {
    setOffers((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }))
  }

  function updateBenefit(type: OfferType, category: string, field: "discounted_price" | "bonus_duration_days", value: string) {
    setBenefits((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [category]: { ...{ discounted_price: "", bonus_duration_days: "0" }, ...prev[type]?.[category], [field]: value },
      },
    }))
  }

  async function handleUpload(type: OfferType, file: File) {
    setUploading(true)
    try {
      const url = await uploadAdminImage(file, `offers/${type}`)
      updateOffer(type, { banner_url: url })
      toast.success("Banner uploaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function save(type: OfferType) {
    setSaving(true)
    const supabase = createClient()
    const offer = offers[type]
    try {
      await supabase
        .from("offers")
        .update({
          is_active: offer.is_active,
          availability_days: offer.availability_days,
          availability_hours: offer.availability_hours,
          banner_url: offer.banner_url,
          activation_at: type === "occasional" ? offer.activation_at : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id)

      // Upsert benefits for each category.
      const rows = categories.map((cat) => {
        const b = benefits[type]?.[cat]
        const discounted = b?.discounted_price?.trim()
        return {
          offer_id: offer.id,
          looking_for_category: cat,
          discounted_price: discounted ? parseInt(discounted, 10) : null,
          bonus_duration_days: parseInt(b?.bonus_duration_days || "0", 10) || 0,
        }
      })
      await supabase.from("offer_category_benefits").upsert(rows, { onConflict: "offer_id,looking_for_category" })

      toast.success("Offer saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 40, color: "var(--color-text-secondary)" }}>Loading...</div>

  const offer = offers[activeTab]
  const tab = TABS.find((t) => t.type === activeTab)!

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>Discount Offers</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
        Manage chat-unlock discount offers. Benefits apply per Looking For category.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => setActiveTab(t.type)}
            style={{
              padding: "10px 16px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
              border: `1px solid ${activeTab === t.type ? "var(--color-primary)" : "var(--color-border)"}`,
              background: activeTab === t.type ? "var(--color-primary)" : "white",
              color: activeTab === t.type ? "white" : "var(--color-text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {offer && (
        <div className="card" style={{ padding: 24, maxWidth: 760 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>{tab.hint}</p>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 18 }}>
            <input
              type="checkbox"
              checked={offer.is_active}
              onChange={(e) => updateOffer(activeTab, { is_active: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>Offer active</span>
          </label>

          {/* Availability window */}
          <div style={{ marginBottom: 18 }}>
            <label className="label">Availability after activation</label>
            <div style={{ display: "flex", gap: 12 }}>
              <div>
                <input type="number" className="input" min={0} style={{ maxWidth: 110 }}
                  value={offer.availability_days}
                  onChange={(e) => updateOffer(activeTab, { availability_days: parseInt(e.target.value) || 0 })} />
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 6 }}>days</span>
              </div>
              <div>
                <input type="number" className="input" min={0} style={{ maxWidth: 110 }}
                  value={offer.availability_hours}
                  onChange={(e) => updateOffer(activeTab, { availability_hours: parseInt(e.target.value) || 0 })} />
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 6 }}>hours</span>
              </div>
            </div>
          </div>

          {/* Occasional: activation schedule */}
          {activeTab === "occasional" && (
            <div style={{ marginBottom: 18 }}>
              <label className="label">Activation date &amp; time</label>
              <input
                type="datetime-local"
                className="input"
                style={{ maxWidth: 260 }}
                value={offer.activation_at ? toLocalInput(offer.activation_at) : ""}
                onChange={(e) => updateOffer(activeTab, { activation_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
          )}

          {/* Banner */}
          <div style={{ marginBottom: 18 }}>
            <label className="label">Promotional banner</label>
            {offer.banner_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={offer.banner_url} alt="Offer banner" style={{ maxWidth: 280, borderRadius: 10, marginBottom: 8, display: "block" }} />
            )}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid var(--color-border)", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>
              <Upload size={15} /> {uploading ? "Uploading..." : "Upload banner"}
              <input type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(activeTab, f) }} />
            </label>
          </div>

          {/* Category benefits */}
          <div style={{ marginBottom: 18 }}>
            <label className="label">Category benefits</label>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-primary-bg)" }}>
                  {["Looking For", "Discounted Price (paise)", "Bonus Duration (days)"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const b = benefits[activeTab]?.[cat]
                  return (
                    <tr key={cat} style={{ borderTop: "1px solid var(--color-border-light)" }}>
                      <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600 }}>{cat}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <input type="number" className="input" min={0} style={{ maxWidth: 130 }} placeholder="No discount"
                          value={b?.discounted_price ?? ""}
                          onChange={(e) => updateBenefit(activeTab, cat, "discounted_price", e.target.value)} />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <input type="number" className="input" min={0} style={{ maxWidth: 110 }}
                          value={b?.bonus_duration_days ?? "0"}
                          onChange={(e) => updateBenefit(activeTab, cat, "bonus_duration_days", e.target.value)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => void save(activeTab)}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Offer"}
          </button>
        </div>
      )}
    </div>
  )
}

// ISO -> value for <input type="datetime-local"> (local time, no seconds).
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
