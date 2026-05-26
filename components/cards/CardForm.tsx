"use client"

import { useState, useEffect } from "react"
import { Plus, X, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { moderateNote } from "@/lib/utils/moderation"
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
  onCancel: () => void
  submitLabel?: string
  loading?: boolean
}

type MultiSelectField = "personality_types" | "qualities" | "hobbies"

export function CardForm({
  initialData,
  gender,
  fieldOptions,
  onSubmit,
  onCancel,
  submitLabel = "Create Card",
  loading = false,
}: CardFormProps) {
  const [age, setAge] = useState(initialData?.age ?? "")
  const [personalityTypes, setPersonalityTypes] = useState<string[]>(initialData?.personality_types ?? [])
  const [taggedAddress, setTaggedAddress] = useState<TaggedAddress | null>(initialData?.tagged_address ?? null)
  const [lookingFor, setLookingFor] = useState(initialData?.looking_for ?? "")
  const [qualities, setQualities] = useState<string[]>(initialData?.qualities ?? [])
  const [hobbies, setHobbies] = useState<string[]>(initialData?.hobbies ?? [])
  const [note, setNote] = useState(initialData?.note ?? "")
  const [noteError, setNoteError] = useState("")

  // Address type selection
  const [addressType, setAddressType] = useState<TaggedAddressType | null>(
    (initialData?.tagged_address?.type as TaggedAddressType) ?? null
  )
  const [addressFields, setAddressFields] = useState<Record<string, string>>({})
  const [addressSuggestions, setAddressSuggestions] = useState<Record<string, string[]>>({})

  // Custom option input
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [pendingCustomOptions, setPendingCustomOptions] = useState<{ field: string; value: string }[]>([])

  // Suggestions from existing data
  async function fetchAddressSuggestions(field: string, value: string) {
    if (value.length < 1) return
    const res = await fetch(`/api/address-suggestions?type=${addressType}&field=${field}&q=${encodeURIComponent(value)}`)
    if (res.ok) {
      const data = await res.json()
      setAddressSuggestions((prev) => ({ ...prev, [field]: data.suggestions }))
    }
  }

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

  function handleNoteChange(val: string) {
    setNote(val)
    const result = moderateNote(val)
    setNoteError(result.blocked ? result.reason || "Not allowed" : "")
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
    if (noteError) {
      toast.error("Fix the note field first")
      return
    }

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

  return (
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
          {getOptions("looking_for").map((opt) => (
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
        {lookingFor && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="tag selected">{lookingFor}</span>
          </div>
        )}
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
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Type your own..."
            value={customInputs.personality_types ?? ""}
            onChange={(e) => setCustomInputs((p) => ({ ...p, personality_types: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addCustomOption("personality_types", "personality_types")}
          />
          <button
            onClick={() => addCustomOption("personality_types", "personality_types")}
            style={{ padding: "10px 16px", background: "var(--color-primary-bg)", border: "1px solid var(--color-border)", borderRadius: 10, color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 }}
          >
            Add
          </button>
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
          <AddressFieldGroup
            fields={[
              { key: "college_name", label: "College Name", placeholder: "e.g. DTU" },
              { key: "graduation_year", label: "Graduation Year", placeholder: "e.g. 2028" },
              { key: "branch", label: "Branch", placeholder: "e.g. CE" },
              { key: "section", label: "Section", placeholder: "e.g. 2" },
            ]}
            values={addressFields}
            onChange={(k, v) => {
              setAddressFields((p) => ({ ...p, [k]: v }))
              fetchAddressSuggestions(k, v)
            }}
            suggestions={addressSuggestions}
          />
        )}
        {addressType === "school" && (
          <AddressFieldGroup
            fields={[
              { key: "school_name", label: "School Name", placeholder: "School name" },
              { key: "pin_code", label: "Pin Code", placeholder: "School pin code" },
              { key: "completion_year", label: "Expected Completion Year", placeholder: "e.g. 2026" },
            ]}
            values={addressFields}
            onChange={(k, v) => {
              setAddressFields((p) => ({ ...p, [k]: v }))
              fetchAddressSuggestions(k, v)
            }}
            suggestions={addressSuggestions}
          />
        )}
        {addressType === "workplace" && (
          <AddressFieldGroup
            fields={[
              { key: "company_name", label: "Company Name", placeholder: "Company name" },
              { key: "pin_code", label: "Office Pin Code", placeholder: "Pin code" },
              { key: "department", label: "Department", placeholder: "e.g. Engineering" },
            ]}
            values={addressFields}
            onChange={(k, v) => {
              setAddressFields((p) => ({ ...p, [k]: v }))
              fetchAddressSuggestions(k, v)
            }}
            suggestions={addressSuggestions}
          />
        )}
        {addressType === "general" && (
          <AddressFieldGroup
            fields={[
              { key: "pin_code", label: "Pin Code", placeholder: "Area pin code" },
              { key: "building_name", label: "Building / Premises", placeholder: "Name of place" },
            ]}
            values={addressFields}
            onChange={(k, v) => {
              setAddressFields((p) => ({ ...p, [k]: v }))
              fetchAddressSuggestions(k, v)
            }}
            suggestions={addressSuggestions}
          />
        )}
      </div>

      {/* Qualities */}
      <div>
        <label className="label">My Qualities</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {getOptions("qualities").map((opt) => (
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
          {getOptions("hobbies").map((opt) => (
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
          onChange={(e) => handleNoteChange(e.target.value)}
          rows={3}
          style={{ resize: "none" }}
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
          disabled={loading}
          style={{ flex: 2 }}
        >
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </div>
  )
}

function AddressFieldGroup({
  fields,
  values,
  onChange,
  suggestions,
}: {
  fields: { key: string; label: string; placeholder: string }[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  suggestions: Record<string, string[]>
}) {
  const [activeField, setActiveField] = useState<string | null>(null)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {fields.map(({ key, label, placeholder }) => (
        <div key={key} style={{ position: "relative" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>
            {label}
          </label>
          <input
            className="input"
            placeholder={placeholder}
            value={values[key] ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            onFocus={() => setActiveField(key)}
            onBlur={() => setTimeout(() => setActiveField(null), 150)}
          />
          {activeField === key && suggestions[key]?.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                boxShadow: "var(--shadow-md)",
                zIndex: 10,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {suggestions[key].map((s) => (
                <button
                  key={s}
                  onClick={() => { onChange(key, s); setActiveField(null) }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    fontSize: 14,
                    color: "var(--color-text)",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
