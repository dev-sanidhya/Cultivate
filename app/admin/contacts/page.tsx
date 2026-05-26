"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Search, Save } from "lucide-react"

type GroupType = "college" | "school" | "workplace"

const GROUP_FIELDS: Record<GroupType, { key: string; label: string; placeholder: string }[]> = {
  college: [
    { key: "college_name", label: "College Name", placeholder: "e.g. DTU" },
    { key: "graduation_year", label: "Graduation Year", placeholder: "e.g. 2028" },
    { key: "branch", label: "Branch", placeholder: "e.g. CE" },
    { key: "section", label: "Section", placeholder: "e.g. 2" },
  ],
  school: [
    { key: "school_name", label: "School Name", placeholder: "School name" },
    { key: "pin_code", label: "Pin Code", placeholder: "Pin code" },
    { key: "graduation_year", label: "Graduation Year", placeholder: "Year" },
  ],
  workplace: [
    { key: "company_name", label: "Company Name", placeholder: "Company" },
    { key: "department", label: "Department", placeholder: "Department" },
  ],
}

export default function AdminContactsPage() {
  const [groupType, setGroupType] = useState<GroupType>("college")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [searching, setSearching] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [status, setStatus] = useState({ contacts_uploaded: false, outreach_completed: false })
  const [found, setFound] = useState(false)

  async function handleSearch() {
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("contact_groups")
      .select("*")
      .eq("group_type", groupType)
      .contains("details", fields)
      .single()

    if (data) {
      setExistingId(data.id)
      setStatus({ contacts_uploaded: data.contacts_uploaded, outreach_completed: data.outreach_completed })
    } else {
      setExistingId(null)
      setStatus({ contacts_uploaded: false, outreach_completed: false })
    }
    setFound(true)
    setSearching(false)
  }

  async function handleSave() {
    const supabase = createClient()
    if (existingId) {
      await supabase.from("contact_groups").update(status).eq("id", existingId)
    } else {
      await supabase.from("contact_groups").insert({
        group_type: groupType,
        details: fields,
        ...status,
      })
    }
    toast.success("Status updated")
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginBottom: 24 }}>Contact Status Management</h1>

      <div className="card" style={{ padding: "24px", maxWidth: 600 }}>
        <div style={{ marginBottom: 20 }}>
          <label className="label">Group Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["college", "school", "workplace"] as GroupType[]).map((t) => (
              <button
                key={t}
                className={`tag ${groupType === t ? "selected" : ""}`}
                onClick={() => { setGroupType(t); setFields({}); setFound(false) }}
                style={{ flex: 1, justifyContent: "center", textTransform: "capitalize" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {GROUP_FIELDS[groupType].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                className="input"
                placeholder={placeholder}
                value={fields[key] ?? ""}
                onChange={(e) => setFields((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSearch}
          disabled={searching}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, marginBottom: 24 }}
        >
          <Search size={16} /> {searching ? "Searching..." : "Find Group"}
        </button>

        {found && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 16 }}>
              {existingId ? "Group found - update status:" : "Group not found - create entry:"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              {[
                { key: "contacts_uploaded", label: "Contacts Uploaded" },
                { key: "outreach_completed", label: "Outreach Completed" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={status[key as keyof typeof status]}
                    onChange={(e) => setStatus((s) => ({ ...s, [key]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "var(--color-primary)" }}
                  />
                  <span style={{ fontSize: 15, color: "var(--color-text)" }}>{label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleSave}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--color-success)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}
            >
              <Save size={16} /> Save Status
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
