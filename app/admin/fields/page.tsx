"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Trash2, Check, X, Pencil, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import type { FieldOption, CustomOptionRequest } from "@/types"

const FIELDS = ["looking_for", "personality_types", "qualities", "hobbies"]

export default function AdminFieldsPage() {
  const [options, setOptions] = useState<FieldOption[]>([])
  const [pendingRequests, setPendingRequests] = useState<(CustomOptionRequest & { profile?: { first_name: string; last_name: string } })[]>([])
  const [activeField, setActiveField] = useState(FIELDS[0])
  const [newValue, setNewValue] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const [{ data: opts }, { data: reqs }] = await Promise.all([
      supabase.from("field_options").select("*").order("field_name").order("value"),
      supabase.from("custom_option_requests")
        .select("*, profile:user_id(first_name, last_name)")
        .eq("status", "pending")
        .order("created_at"),
    ])
    setOptions(opts ?? [])
    setPendingRequests(reqs ?? [])
    setLoading(false)
  }

  async function addOption() {
    if (!newValue.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from("field_options").insert({
      field_name: activeField,
      value: newValue.trim(),
      is_approved: true,
    }).select().single()
    if (data) {
      setOptions((prev) => [...prev, data])
      setNewValue("")
      toast.success("Option added")
    }
  }

  async function deleteOption(id: string) {
    const supabase = createClient()
    await supabase.from("field_options").delete().eq("id", id)
    setOptions((prev) => prev.filter((o) => o.id !== id))
    toast.success("Option removed")
  }

  async function toggleHidden(opt: FieldOption) {
    const supabase = createClient()
    const nextHidden = !opt.is_hidden
    await supabase.from("field_options").update({ is_hidden: nextHidden }).eq("id", opt.id)
    setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, is_hidden: nextHidden } : o)))
    toast.success(nextHidden ? "Option hidden" : "Option visible")
  }

  async function handleRequest(
    req: CustomOptionRequest,
    action: "approve" | "reject" | "modify",
    modifiedValue?: string
  ) {
    const supabase = createClient()
    const finalValue = action === "modify" ? modifiedValue : req.value

    if (action === "reject") {
      await supabase.from("custom_option_requests").update({ status: "rejected" }).eq("id", req.id)
      // Remove from user's card
      const { data: card } = await supabase.from("cards").select("*").eq("id", req.card_id).single()
      const rejectedCardId = card?.card_id ?? req.card_id
      if (card) {
        const field = req.field_name as "personality_types" | "qualities" | "hobbies" | "looking_for"
        if (field === "looking_for") {
          await supabase.from("cards").update({ looking_for: null }).eq("id", req.card_id)
        } else {
          const arr = (card[field] as string[]) ?? []
          await supabase.from("cards").update({ [field]: arr.filter((v: string) => v !== req.value) }).eq("id", req.card_id)
        }
      }
      // Notify user
      await supabase.from("notifications").insert({
        user_id: req.user_id,
        message: `Your custom option "${req.value}" for the "${req.field_name}" field on card #${rejectedCardId} was not approved. Please update it.`,
        type: "custom_option_rejected",
        metadata: {
          card_id: rejectedCardId,
          field_name: req.field_name,
          value: req.value,
          request_id: req.id,
        },
      })
      toast.success("Request rejected")
    } else {
      // Approve (or modify+approve)
      const status = action === "modify" ? "modified" : "approved"
      await supabase.from("custom_option_requests").update({ status, modified_value: finalValue }).eq("id", req.id)

      // Add to field options
      await supabase.from("field_options").insert({
        field_name: req.field_name,
        value: finalValue,
        is_approved: true,
        submitted_by: req.user_id,
      })

      // Update card if modified
      if (action === "modify" && finalValue !== req.value) {
        const { data: card } = await supabase.from("cards").select("*").eq("id", req.card_id).single()
        if (card) {
          const field = req.field_name as "personality_types" | "qualities" | "hobbies" | "looking_for"
          if (field === "looking_for") {
            await supabase.from("cards").update({ looking_for: finalValue }).eq("id", req.card_id)
          } else {
            const arr = (card[field] as string[]) ?? []
            const updated = arr.map((v: string) => v === req.value ? finalValue! : v)
            await supabase.from("cards").update({ [field]: updated }).eq("id", req.card_id)
          }
        }
      }

      await supabase.from("notifications").insert({
        user_id: req.user_id,
        message: `Your custom option "${req.value}" has been approved and added to Strefo.`,
        type: "custom_option_approved",
      })
      toast.success("Request approved")
    }

    loadData()
  }

  const fieldOptions = options.filter((o) => o.field_name === activeField)

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginBottom: 24 }}>Card Fields</h1>

      {/* Pending custom options */}
      {pendingRequests.length > 0 && (
        <div className="card" style={{ padding: "20px", marginBottom: 24, border: "2px solid var(--color-warning)", background: "var(--color-warning-bg)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 16 }}>
            Pending Custom Options ({pendingRequests.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pendingRequests.map((req) => (
              <PendingRequestRow key={req.id} req={req} onHandle={handleRequest} />
            ))}
          </div>
        </div>
      )}

      {/* Field tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {FIELDS.map((f) => (
          <button
            key={f}
            className={`tag ${activeField === f ? "selected" : ""}`}
            onClick={() => setActiveField(f)}
            style={{ textTransform: "capitalize" }}
          >
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Add new option */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          className="input"
          placeholder={`Add new option for ${activeField.replace(/_/g, " ")}...`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addOption()}
          style={{ flex: 1 }}
        />
        <button
          onClick={addOption}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Options list */}
      <div className="card" style={{ padding: "16px" }}>
        {loading ? (
          <p style={{ color: "var(--color-text-muted)", padding: "20px 0", textAlign: "center" }}>Loading...</p>
        ) : fieldOptions.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", padding: "20px 0", textAlign: "center" }}>No options yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {fieldOptions.map((opt) => (
              <div key={opt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border-light)", opacity: opt.is_hidden ? 0.6 : 1 }}>
                <span style={{ fontSize: 14, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 8 }}>
                  {opt.value}
                  {opt.is_hidden && (
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", background: "#F3F4F6", padding: "2px 8px", borderRadius: 999 }}>
                      Hidden
                    </span>
                  )}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <button
                    onClick={() => toggleHidden(opt)}
                    className="btn-ghost"
                    style={{ padding: 6 }}
                    aria-label={opt.is_hidden ? "Unhide option" : "Hide option"}
                    title={opt.is_hidden ? "Unhide" : "Hide"}
                  >
                    {opt.is_hidden ? <EyeOff size={14} color="var(--color-text-secondary)" /> : <Eye size={14} color="var(--color-text-secondary)" />}
                  </button>
                  <button onClick={() => deleteOption(opt.id)} className="btn-ghost" style={{ padding: 6 }} aria-label="Delete option">
                    <Trash2 size={14} color="var(--color-error)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PendingRequestRow({
  req,
  onHandle,
}: {
  req: CustomOptionRequest & { profile?: { first_name: string; last_name: string } }
  onHandle: (req: CustomOptionRequest, action: "approve" | "reject" | "modify", val?: string) => void
}) {
  const [editMode, setEditMode] = useState(false)
  const [editValue, setEditValue] = useState(req.value)

  return (
    <div style={{ background: "white", borderRadius: 10, padding: "12px", border: "1px solid var(--color-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
            {req.field_name.replace(/_/g, " ")}
          </span>
          {editMode ? (
            <input
              className="input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={{ marginTop: 4, fontSize: 14 }}
            />
          ) : (
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginTop: 2 }}>&quot;{req.value}&quot;</p>
          )}
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
            by {req.profile?.first_name} {req.profile?.last_name}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => onHandle(req, "approve")}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "var(--color-success-bg)", color: "var(--color-success)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
        >
          <Check size={13} /> Approve
        </button>
        {editMode ? (
          <button
            onClick={() => { onHandle(req, "modify", editValue); setEditMode(false) }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "var(--color-warning-bg)", color: "var(--color-warning)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >
            <Check size={13} /> Save Modified
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "#F3F4F6", color: "var(--color-text-secondary)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >
            <Pencil size={13} /> Modify
          </button>
        )}
        <button
          onClick={() => onHandle(req, "reject")}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "var(--color-error-bg)", color: "var(--color-error)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
        >
          <X size={13} /> Reject
        </button>
      </div>
    </div>
  )
}
