"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { moderateNote } from "@/lib/utils/moderation"
import { PopupModal } from "@/components/ui/PopupModal"
import { TaggedAddressFieldGroup } from "@/components/cards/TaggedAddressFieldGroup"
import type { TaggedAddress, TaggedAddressType, Gender, FieldOption } from "@/types"

interface CardFormData {
  age: string
  personality_types: string[]
  tagged_address: TaggedAddress | null
  looking_for: string
  qualities: string[]
  hobbies: string[]
  note: string
}

interface CardFormProps {
  initialData?: Partial<CardFormData>
  gender: Gender
  fieldOptions: Record<string, FieldOption[]>
  onSubmit: (data: CardFormData, customOptions: { field: string; value: string }[]) => Promise<void>
  onContactDetailsDetected?: (reason: string) => Promise<ContactViolationResult>
  onCancel: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
}

interface ContactViolationResult {
  warningCount: number
  warningLimit: number
  penaltyAmount: string
  blocked: boolean
}

type MultiSelectField = "personality_types" | "qualities" | "hobbies"

export function CardForm({
  initialData,
  gender,
  fieldOptions,
  onSubmit,
  onContactDetailsDetected,
  onCancel,
  submitLabel = "Create Card",
  loading = false,
  disabled = false,
}: CardFormProps) {
  const [age, setAge] = useState(initialData?.age ?? "")
  const [personalityTypes, setPersonalityTypes] = useState<string[]>(initialData?.personality_types ?? [])
  const [lookingFor, setLookingFor] = useState(initialData?.looking_for ?? "")
  const [qualities, setQualities] = useState<string[]>(initialData?.qualities ?? [])
  const [hobbies, setHobbies] = useState<string[]>(initialData?.hobbies ?? [])
  const [note, setNote] = useState(initialData?.note ?? "")
  const [noteError, setNoteError] = useState("")
  const [violationState, setViolationState] = useState<{
    open: boolean
    reason: string
    warningCount: number
    warningLimit: number
    penaltyAmount: string
    blocked: boolean
  }>({
    open: false,
    reason: "",
    warningCount: 0,
    warningLimit: 0,
    penaltyAmount: "0",
    blocked: false,
  })

  // Address type selection
  const [addressType, setAddressType] = useState<TaggedAddressType | null>(
    (initialData?.tagged_address?.type as TaggedAddressType) ?? null
  )
  const [addressFields, setAddressFields] = useState<Record<string, string>>({})

  // Custom option input
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [pendingCustomOptions, setPendingCustomOptions] = useState<{ field: string; value: string }[]>([])

  function toggleMultiSelect(field: MultiSelectField, value: string) {
    const setter = field === "personality_types" ? setPersonalityTypes : field === "qualities" ? setQualities : setHobbies
    const current = field === "personality_types" ? personalityTypes : field === "qualities" ? qualities : hobbies
    if (field === "personality_types") {
      // Single selection for personality type
      setPersonalityTypes(personalityTypes.includes(value) ? [] : [value])
      return
    }
    setter(current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
  }

  function addCustomOption(field: string, setterField: MultiSelectField | "looking_for") {
    const value = customInputs[field]?.trim()
    if (!value) return
    if (setterField === "looking_for") {
      setLookingFor(value)
    } else {
      toggleMultiSelect(setterField, value)
    }
    setPendingCustomOptions((prev) => [...prev, { field, value }])
    setCustomInputs((prev) => ({ ...prev, [field]: "" }))
    toast.info("Custom option submitted for review")
  }

  function buildTaggedAddress(): TaggedAddress | null {
    if (!addressType) return null
    switch (addressType) {
      case "college":
        return {
          type: "college",
          college_name: addressFields.college_name ?? "",
          graduation_year: addressFields.graduation_year ?? "",
          branch: addressFields.branch ?? "",
          section: addressFields.section ?? "",
        }
      case "school":
        return {
          type: "school",
          school_name: addressFields.school_name ?? "",
          pin_code: addressFields.pin_code ?? "",
          completion_year: addressFields.completion_year ?? "",
        }
      case "workplace":
        return {
          type: "workplace",
          company_name: addressFields.company_name ?? "",
          pin_code: addressFields.pin_code ?? "",
          department: addressFields.department ?? "",
        }
      case "general":
        return {
          type: "general",
          pin_code: addressFields.pin_code ?? "",
          building_name: addressFields.building_name ?? "",
        }
    }
  }

  async function handleSubmit() {
    if (!age || isNaN(Number(age)) || Number(age) < 13 || Number(age) > 100) {
      toast.error("Enter a valid age (13-100)")
      return
    }
    if (!lookingFor) {
      toast.error("Select what you're looking for")
      return
    }

    const noteModeration = moderateNote(note)
    if (noteModeration.blocked) {
      const reason = noteModeration.reason || "Contact details are not allowed in the Note field."
      setNoteError(reason)
      const result = await onContactDetailsDetected?.(reason)
      if (result) {
        setViolationState({
          open: true,
          reason,
          warningCount: result.warningCount,
          warningLimit: result.warningLimit,
          penaltyAmount: result.penaltyAmount,
          blocked: result.blocked,
        })
      }
      return
    }
    setNoteError("")

    const data: CardFormData = {
      age,
      personality_types: personalityTypes,
      tagged_address: buildTaggedAddress(),
      looking_for: lookingFor,
      qualities,
      hobbies,
      note,
    }

    await onSubmit(data, pendingCustomOptions)
  }

  const getOptions = (field: string) =>
    fieldOptions[field]?.map((o) => o.value) ?? []

  function getDisplayOptions(field: string, selectedValues: string[] | string) {
    const baseOptions = getOptions(field)
    const selectedList = Array.isArray(selectedValues) ? selectedValues : [selectedValues]
    const customValues = pendingCustomOptions
      .filter((opt) => opt.field === field)
      .map((opt) => opt.value)
    return Array.from(new Set([...baseOptions, ...selectedList.filter(Boolean), ...customValues]))
  }

  const warningsLeft = Math.max(violationState.warningLimit - violationState.warningCount, 0)
  const warningWord = warningsLeft === 1 ? "warning" : "warnings"

  return (
    <>
      <PopupModal
        open={violationState.open}
        tone={violationState.blocked ? "danger" : "warning"}
        title={`Warning ${violationState.warningCount}/${violationState.warningLimit}`}
        message={
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0 }}>
              Sharing your contact details in the Notes field is strictly prohibited, as it violates the platform&apos;s policy.
            </p>
            <p style={{ margin: 0 }}>
              {violationState.blocked
                ? `Penalty of ₹${violationState.penaltyAmount} is imposed on your account for violating platform's policy multiple times.`
                : `After ${warningsLeft} more ${warningWord}, a penalty of ₹${violationState.penaltyAmount} will be imposed on your account.`}
            </p>
          </div>
        }
        confirmLabel={violationState.blocked ? "Understood" : "I'll fix it"}
        onConfirm={() => setViolationState((prev) => ({ ...prev, open: false }))}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Age */}
      <div>
        <label className="label">Age *</label>
        <input
          className="input"
          type="number"
          placeholder="Your age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          min={13}
          max={100}
        />
      </div>

      {/* Gender (auto) */}
      <div>
        <label className="label">Gender</label>
        <div
          style={{
            padding: "10px 14px",
            background: "#F9FAFB",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            fontSize: 15,
            color: "var(--color-text-secondary)",
            textTransform: "capitalize",
          }}
        >
          {gender} (from your profile)
        </div>
      </div>

      {/* Looking For */}
      <div>
        <label className="label">Looking For *</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {getDisplayOptions("looking_for", lookingFor).map((opt) => (
            <button
              key={opt}
              className={`tag ${lookingFor === opt ? "selected" : ""}`}
              onClick={() => setLookingFor(lookingFor === opt ? "" : opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Type your own..."
            value={customInputs.looking_for ?? ""}
            onChange={(e) => setCustomInputs((p) => ({ ...p, looking_for: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addCustomOption("looking_for", "looking_for")}
          />
          <button
            onClick={() => addCustomOption("looking_for", "looking_for")}
            style={{ padding: "10px 16px", background: "var(--color-primary-bg)", border: "1px solid var(--color-border)", borderRadius: 10, color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Personality Type */}
      <div>
        <label className="label">Personality Type</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {getOptions("personality_types").map((opt) => (
            <button
              key={opt}
              className={`tag ${personalityTypes.includes(opt) ? "selected" : ""}`}
              onClick={() => toggleMultiSelect("personality_types", opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Tagged Address */}
      <div>
        <label className="label">Tagged Address</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {(["college", "school", "workplace", "general"] as TaggedAddressType[]).map((t) => (
            <button
              key={t}
              className={`tag ${addressType === t ? "selected" : ""}`}
              onClick={() => { setAddressType(t); setAddressFields({}) }}
              style={{ textTransform: "capitalize" }}
            >
              {t === "general" ? "General Location" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {addressType && (
            <button className="tag" onClick={() => { setAddressType(null); setAddressFields({}) }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {addressType === "college" && (
          <TaggedAddressFieldGroup
            key={addressType}
            addressType={addressType}
            fields={[
              { key: "college_name", label: "College Name", placeholder: "e.g. DTU" },
              { key: "graduation_year", label: "Graduation Year", placeholder: "e.g. 2028" },
              { key: "branch", label: "Branch", placeholder: "e.g. CE" },
              { key: "section", label: "Section", placeholder: "e.g. 2" },
            ]}
            values={addressFields}
            onChange={(k, v) => {
              setAddressFields((p) => ({ ...p, [k]: v }))
            }}
          />
        )}
        {addressType === "school" && (
          <TaggedAddressFieldGroup
            key={addressType}
            addressType={addressType}
            fields={[
              { key: "school_name", label: "School Name", placeholder: "School name" },
              { key: "pin_code", label: "Pin Code", placeholder: "School pin code" },
              { key: "completion_year", label: "Expected Completion Year", placeholder: "e.g. 2026" },
            ]}
            values={addressFields}
            onChange={(k, v) => {
              setAddressFields((p) => ({ ...p, [k]: v }))
            }}
          />
        )}
        {addressType === "workplace" && (
          <TaggedAddressFieldGroup
            key={addressType}
            addressType={addressType}
            fields={[
              { key: "company_name", label: "Company Name", placeholder: "Company name" },
              { key: "pin_code", label: "Office Pin Code", placeholder: "Pin code" },
              { key: "department", label: "Department", placeholder: "e.g. Engineering" },
            ]}
            values={addressFields}
            onChange={(k, v) => {
              setAddressFields((p) => ({ ...p, [k]: v }))
            }}
          />
        )}
        {addressType === "general" && (
          <TaggedAddressFieldGroup
            key={addressType}
            addressType={addressType}
            fields={[
              { key: "pin_code", label: "Pin Code", placeholder: "Area pin code" },
              { key: "building_name", label: "Building / Premises", placeholder: "Name of place" },
            ]}
            values={addressFields}
            onChange={(k, v) => {
              setAddressFields((p) => ({ ...p, [k]: v }))
            }}
          />
        )}
      </div>

      {/* Qualities */}
      <div>
        <label className="label">My Qualities</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {getDisplayOptions("qualities", qualities).map((opt) => (
            <button
              key={opt}
              className={`tag ${qualities.includes(opt) ? "selected" : ""}`}
              onClick={() => toggleMultiSelect("qualities", opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Type your own..."
            value={customInputs.qualities ?? ""}
            onChange={(e) => setCustomInputs((p) => ({ ...p, qualities: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addCustomOption("qualities", "qualities")}
          />
          <button
            onClick={() => addCustomOption("qualities", "qualities")}
            style={{ padding: "10px 16px", background: "var(--color-primary-bg)", border: "1px solid var(--color-border)", borderRadius: 10, color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Hobbies */}
      <div>
        <label className="label">My Hobbies</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {getDisplayOptions("hobbies", hobbies).map((opt) => (
            <button
              key={opt}
              className={`tag ${hobbies.includes(opt) ? "selected" : ""}`}
              onClick={() => toggleMultiSelect("hobbies", opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Type your own..."
            value={customInputs.hobbies ?? ""}
            onChange={(e) => setCustomInputs((p) => ({ ...p, hobbies: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addCustomOption("hobbies", "hobbies")}
          />
          <button
            onClick={() => addCustomOption("hobbies", "hobbies")}
            style={{ padding: "10px 16px", background: "var(--color-primary-bg)", border: "1px solid var(--color-border)", borderRadius: 10, color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="label">Note</label>
        <textarea
          className="input"
          placeholder="Anything extra you'd like to share..."
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            if (noteError) setNoteError("")
          }}
          rows={3}
          style={{ resize: "none" }}
          disabled={disabled}
        />
        {noteError && (
          <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4 }}>{noteError}</p>
        )}
        <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
          Contact details (phone, handles, URLs) are not allowed.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, paddingBottom: 24 }}>
        <button className="btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading || disabled}
          style={{ flex: 2 }}
        >
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
      </div>
    </>
  )
}
