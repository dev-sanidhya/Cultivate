"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Upload } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Modal } from "@/components/ui/Modal"
import { PageHeader } from "@/components/ui/PageHeader"

type GroupType = "college" | "school" | "workplace" | ""

interface GroupStatus {
  contacts_uploaded: boolean
  outreach_completed: boolean
}

export default function ContactsPage() {
  const router = useRouter()
  const [groupType, setGroupType] = useState<GroupType>("")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<GroupStatus | null>(null)
  const [searched, setSearched] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const GROUP_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
    college: [
      { key: "college_name", label: "College Name", placeholder: "e.g. DTU" },
      { key: "graduation_year", label: "Graduation Year", placeholder: "e.g. 2028" },
      { key: "branch", label: "Branch", placeholder: "e.g. CE" },
      { key: "section", label: "Section", placeholder: "e.g. 2" },
    ],
    school: [
      { key: "school_name", label: "School Name", placeholder: "School name" },
      { key: "pin_code", label: "Pin Code", placeholder: "School pin code" },
      { key: "graduation_year", label: "Graduation Year", placeholder: "e.g. 2026" },
    ],
    workplace: [
      { key: "company_name", label: "Company Name", placeholder: "Company" },
      { key: "department", label: "Department", placeholder: "Department" },
    ],
  }

  async function handleSearch() {
    if (!groupType) { toast.error("Select a group type first"); return }
    setSearching(true)
    const supabase = createClient()

    const { data } = await supabase
      .from("contact_groups")
      .select("contacts_uploaded, outreach_completed")
      .eq("group_type", groupType)
      .contains("details", fields)
      .single()

    setResult(data ?? null)
    setSearched(true)
    setSearching(false)
  }

  function openUploadMail() {
    const details = Object.entries(fields)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join(", ")
    const body = `Group Details: ${details}\n\n[Attach screenshot of WhatsApp group contacts here]`
    window.location.href = `mailto:ciarog2512@gmail.com?subject=Uploading Contacts&body=${encodeURIComponent(body)}`
    setUploadModalOpen(false)
  }

  return (
    <div className="page-container" style={{ paddingTop: 20 }}>
      <PageHeader title="Help Friends Join" subtitle="Check if your group's contacts are on Strefo" showBack />

      {/* Group Type */}
      <div style={{ marginBottom: 20 }}>
        <label className="label">Group Type</label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["college", "school", "workplace"] as GroupType[]).map((t) => (
            <button
              key={t}
              className={`tag ${groupType === t ? "selected" : ""}`}
              onClick={() => { setGroupType(t); setFields({}); setResult(null); setSearched(false) }}
              style={{ flex: 1, justifyContent: "center", textTransform: "capitalize" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {groupType && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {GROUP_FIELDS[groupType]?.map(({ key, label, placeholder }) => (
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
          <button className="btn-primary" onClick={handleSearch} disabled={searching}>
            <Search size={16} /> {searching ? "Searching..." : "Check Status"}
          </button>
        </div>
      )}

      {/* Result */}
      {searched && (
        <div className="card" style={{ padding: "20px", marginBottom: 20 }}>
          {result ? (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 16 }}>
                Status for this group
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <StatusRow
                  label="Contacts Uploaded"
                  done={result.contacts_uploaded}
                />
                <StatusRow
                  label="Outreach Completed"
                  done={result.outreach_completed}
                />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>
                Not uploaded yet
              </p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
                Be the first to help your group join Strefo!
              </p>
              <button
                onClick={() => setUploadModalOpen(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 20,
                  background: "var(--color-primary)", color: "white",
                  border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
                }}
              >
                <Upload size={14} /> Upload Contacts
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Instructions Modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="How to Upload Contacts"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--color-primary-bg)", borderRadius: 12, padding: "16px" }}>
            <p style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.6 }}>
              <strong>Before uploading:</strong>
            </p>
            <ol style={{ marginTop: 8, paddingLeft: 20, fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 2 }}>
              <li>Write complete group details in the email (college name, year, branch, section)</li>
              <li>Take a screenshot of your WhatsApp class/group contacts</li>
              <li>Attach the screenshot to the email</li>
            </ol>
          </div>
          <button className="btn-primary" onClick={openUploadMail}>
            <Upload size={16} /> Open Email to Upload
          </button>
        </div>
      </Modal>
    </div>
  )
}

function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{label}</span>
      <span
        style={{
          fontSize: 13, fontWeight: 600,
          color: done ? "var(--color-success)" : "var(--color-text-muted)",
          background: done ? "var(--color-success-bg)" : "#F3F4F6",
          padding: "3px 10px", borderRadius: 20,
        }}
      >
        {done ? "✓ Done" : "Pending"}
      </span>
    </div>
  )
}
