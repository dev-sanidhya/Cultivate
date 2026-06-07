"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/PageHeader"
import { TaggedAddressFieldGroup } from "@/components/cards/TaggedAddressFieldGroup"
import { normalizeCardId } from "@/lib/utils/cardId"
import { requiresGenderSelection } from "@/lib/lookingFor"
import type { FieldOption, Gender, TaggedAddress, TaggedAddressType } from "@/types"
import { Search } from "lucide-react"

const TARGET_GENDERS: Gender[] = ["male", "female", "other"]

function NewSearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")

  const [fieldOptions, setFieldOptions] = useState<Record<string, FieldOption[]>>({})
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"filter" | "card_id">("filter")

  // Card ID search
  const [cardIdQuery, setCardIdQuery] = useState("")

  // Filter fields
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [lookingFor, setLookingFor] = useState("")
  const [lookingForGender, setLookingForGender] = useState<Gender | "">("")
  const [personalityTypes, setPersonalityTypes] = useState<string[]>([])
  const [qualities, setQualities] = useState<string[]>([])
  const [hobbies, setHobbies] = useState<string[]>([])
  const [addressType, setAddressType] = useState<TaggedAddressType | null>(null)
  const [addressFields, setAddressFields] = useState<Record<string, string>>({})
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: options } = await supabase
        .from("field_options")
        .select("*")
        .eq("is_approved", true)
        .order("value")

      const grouped: Record<string, FieldOption[]> = {}
      for (const opt of options ?? []) {
        if (!grouped[opt.field_name]) grouped[opt.field_name] = []
        grouped[opt.field_name].push(opt)
      }
      setFieldOptions(grouped)

      if (editId) {
        const { data: existingSearch } = await supabase
          .from("searches")
          .select("*")
          .eq("id", editId)
          .single()

        if (existingSearch) {
          setMode(existingSearch.search_type)
          setCardIdQuery(existingSearch.card_id_query ?? "")
          setAge(existingSearch.age?.toString() ?? "")
          setGender(existingSearch.gender ?? "")
          setLookingFor(existingSearch.looking_for ?? "")
          setLookingForGender(existingSearch.looking_for_gender ?? "")
          setPersonalityTypes(existingSearch.personality_types ?? [])
          setQualities(existingSearch.qualities ?? [])
          setHobbies(existingSearch.hobbies ?? [])
          if (existingSearch.tagged_address) {
            setAddressType(existingSearch.tagged_address.type)
            const fields = { ...existingSearch.tagged_address }
            delete fields.type
            setAddressFields(fields as Record<string, string>)
          }
        }
      }
    }
    load()
  }, [editId])

  function toggleMulti(
    field: "personality_types" | "qualities" | "hobbies",
    value: string
  ) {
    const setters = { personality_types: setPersonalityTypes, qualities: setQualities, hobbies: setHobbies }
    const getters = { personality_types: personalityTypes, qualities: qualities, hobbies: hobbies }
    const current = getters[field]
    setters[field](current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
  }

  function selectLookingFor(value: string) {
    setLookingFor(value)
    if (!requiresGenderSelection(value)) setLookingForGender("")
  }

  function addCustom(field: "looking_for" | "personality_types" | "qualities" | "hobbies") {
    const value = customInputs[field]?.trim()
    if (!value) return
    setCustomOptions((prev) => ({ ...prev, [field]: [...(prev[field] ?? []), value] }))
    if (field === "looking_for") {
      selectLookingFor(value)
    } else {
      toggleMulti(field, value)
    }
    setCustomInputs((prev) => ({ ...prev, [field]: "" }))
  }

  function buildTaggedAddress(): TaggedAddress | null {
    if (!addressType) return null
    const f = addressFields
    const trim = (value?: string) => value?.trim() ?? ""
    let data: TaggedAddress
    switch (addressType) {
      case "college":
        data = { type: "college", college_name: trim(f.college_name), graduation_year: trim(f.graduation_year), branch: trim(f.branch), section: trim(f.section) }
        break
      case "school":
        data = { type: "school", school_name: trim(f.school_name), pin_code: trim(f.pin_code), completion_year: trim(f.completion_year) }
        break
      case "workplace":
        data = { type: "workplace", company_name: trim(f.company_name), pin_code: trim(f.pin_code), department: trim(f.department) }
        break
      case "general":
        data = { type: "general", pin_code: trim(f.pin_code), building_name: trim(f.building_name) }
        break
    }
    const hasAtLeastOneField = Object.entries(data).some(([key, value]) => key !== "type" && value.trim().length > 0)
    return hasAtLeastOneField ? data : null
  }

  async function handleSearch() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please sign in again")

      const taggedAddress = buildTaggedAddress()
      const hasAnyFilter =
        !!age ||
        !!gender ||
        !!lookingFor ||
        personalityTypes.length > 0 ||
        qualities.length > 0 ||
        hobbies.length > 0 ||
        !!taggedAddress

      if (mode === "filter" && !hasAnyFilter) {
        toast.error("Please select at least one filter before searching")
        return
      }

      const searchData = mode === "card_id"
        ? {
            user_id: user!.id,
            search_type: "card_id" as const,
            card_id_query: normalizeCardId(cardIdQuery),
            last_searched_at: new Date().toISOString(),
          }
        : {
            user_id: user!.id,
            search_type: "filter" as const,
            age: age ? parseInt(age) : null,
            gender: gender || null,
            looking_for: lookingFor || null,
            looking_for_gender: requiresGenderSelection(lookingFor) ? (lookingForGender || null) : null,
            personality_types: personalityTypes,
            qualities,
            hobbies,
            tagged_address: taggedAddress,
            last_searched_at: new Date().toISOString(),
          }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload = searchData as any

      let searchId = editId
      if (editId) {
        const { error: updateError } = await supabase
          .from("searches")
          .update({ ...insertPayload, new_cards_count: 0 })
          .eq("id", editId)
        if (updateError) throw updateError
      } else {
        let existingSearchId: string | null = null

        if (mode === "card_id") {
          const { data: existing } = await supabase
            .from("searches")
            .select("id")
            .eq("user_id", user.id)
            .eq("search_type", "card_id")
            .eq("card_id_query", searchData.card_id_query)
            .limit(1)
            .maybeSingle()

          existingSearchId = existing?.id ?? null
        } else {
          const { data: existingFilters } = await supabase
            .from("searches")
            .select("id, age, gender, looking_for, personality_types, qualities, hobbies, tagged_address")
            .eq("user_id", user.id)
            .eq("search_type", "filter")

          const normalizeArray = (arr?: string[] | null) =>
            (arr ?? []).map((v) => v.trim()).filter(Boolean).sort()
          const normalizeAddress = (value?: TaggedAddress | null) => {
            if (!value) return null
            const entries = Object.entries(value)
              .filter(([key, val]) => key === "type" || (typeof val === "string" && val.trim().length > 0))
              .sort(([a], [b]) => a.localeCompare(b))
            return Object.fromEntries(entries)
          }

          const currentSignature = JSON.stringify({
            age: searchData.age ?? null,
            gender: searchData.gender ?? null,
            looking_for: searchData.looking_for ?? null,
            personality_types: normalizeArray(searchData.personality_types),
            qualities: normalizeArray(searchData.qualities),
            hobbies: normalizeArray(searchData.hobbies),
            tagged_address: normalizeAddress(searchData.tagged_address),
          })

          const existingMatch = (existingFilters ?? []).find((item: {
            id: string
            age: number | null
            gender: string | null
            looking_for: string | null
            personality_types?: string[] | null
            qualities?: string[] | null
            hobbies?: string[] | null
            tagged_address?: TaggedAddress | null
          }) => {
            const itemSignature = JSON.stringify({
              age: item.age ?? null,
              gender: item.gender ?? null,
              looking_for: item.looking_for ?? null,
              personality_types: normalizeArray(item.personality_types),
              qualities: normalizeArray(item.qualities),
              hobbies: normalizeArray(item.hobbies),
              tagged_address: normalizeAddress(item.tagged_address as TaggedAddress | null),
            })
            return itemSignature === currentSignature
          })

          existingSearchId = existingMatch?.id ?? null
        }

        if (existingSearchId) {
          const { error: moveToTopError } = await supabase
            .from("searches")
            .update({ last_searched_at: new Date().toISOString(), new_cards_count: 0 })
            .eq("id", existingSearchId)
          if (moveToTopError) throw moveToTopError
          searchId = existingSearchId
        } else {
          const { data, error: insertError } = await supabase
            .from("searches")
            .insert(insertPayload)
            .select("id")
            .single()
          if (insertError) throw insertError
          searchId = data?.id
        }
      }

      if (!searchId) throw new Error("Could not create search. Please try again.")

      router.push(`/search/results?id=${searchId}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const getOpts = (field: string) =>
    fieldOptions[field]?.filter((o) => !o.is_hidden).map((o) => o.value) ?? []

  const getDisplayOpts = (field: string, selected: string[]) =>
    Array.from(new Set([...getOpts(field), ...(customOptions[field] ?? []), ...selected.filter(Boolean)]))

  return (
    <div className="page-container" style={{ paddingTop: 20 }}>
      <PageHeader title={editId ? "Edit Search" : "New Search"} showBack />

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "var(--color-primary-bg)", padding: 4, borderRadius: 12 }}>
        {[{ key: "filter", label: "Filter Search" }, { key: "card_id", label: "By Card ID" }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key as "filter" | "card_id")}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600,
              background: mode === key ? "white" : "transparent",
              color: mode === key ? "var(--color-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
              boxShadow: mode === key ? "var(--shadow-sm)" : "none",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "card_id" ? (
        <div style={{ marginBottom: 24 }}>
          <label className="label">Card ID</label>
          <input
            className="input"
            placeholder="Enter 6-character card ID"
            value={cardIdQuery}
            onChange={(e) => setCardIdQuery(e.target.value.toUpperCase().slice(0, 6))}
            style={{ letterSpacing: 4, fontSize: 18, textAlign: "center", fontWeight: 700 }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Age */}
          <div>
            <label className="label">Age</label>
            <input className="input" type="number" placeholder="Any age" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>

          {/* Gender */}
          <div>
            <label className="label">Gender</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["any", "male", "female", "other"].map((g) => (
                <button
                  key={g}
                  className={`tag ${(gender || "any") === g ? "selected" : ""}`}
                  onClick={() => setGender(g === "any" ? "" : g)}
                  style={{ textTransform: "capitalize", flex: 1, justifyContent: "center" }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Looking For */}
          <div>
            <label className="label">Looking For</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className={`tag ${!lookingFor ? "selected" : ""}`} onClick={() => selectLookingFor("")}>Any</button>
              {getDisplayOpts("looking_for", [lookingFor]).map((opt) => (
                <button key={opt} className={`tag ${lookingFor === opt ? "selected" : ""}`} onClick={() => selectLookingFor(lookingFor === opt ? "" : opt)}>
                  {opt}
                </button>
              ))}
            </div>
            <CustomOptionInput field="looking_for" value={customInputs.looking_for ?? ""} onChange={(v) => setCustomInputs((p) => ({ ...p, looking_for: v }))} onAdd={() => addCustom("looking_for")} />
          </div>

          {/* Looking For gender */}
          {requiresGenderSelection(lookingFor) && (
            <div>
              <label className="label">Looking For - Gender</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`tag ${!lookingForGender ? "selected" : ""}`} onClick={() => setLookingForGender("")} style={{ flex: 1, justifyContent: "center" }}>Any</button>
                {TARGET_GENDERS.map((g) => (
                  <button
                    key={g}
                    className={`tag ${lookingForGender === g ? "selected" : ""}`}
                    onClick={() => setLookingForGender(lookingForGender === g ? "" : g)}
                    style={{ textTransform: "capitalize", flex: 1, justifyContent: "center" }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Personality Type */}
          <div>
            <label className="label">Personality Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {getDisplayOpts("personality_types", personalityTypes).map((opt) => (
                <button key={opt} className={`tag ${personalityTypes.includes(opt) ? "selected" : ""}`} onClick={() => toggleMulti("personality_types", opt)}>
                  {opt}
                </button>
              ))}
            </div>
            <CustomOptionInput field="personality_types" value={customInputs.personality_types ?? ""} onChange={(v) => setCustomInputs((p) => ({ ...p, personality_types: v }))} onAdd={() => addCustom("personality_types")} />
          </div>

          {/* Tagged Address */}
          <div>
            <label className="label">Tagged Address</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {(["college", "school", "workplace", "general"] as TaggedAddressType[]).map((t) => (
                <button key={t} className={`tag ${addressType === t ? "selected" : ""}`} onClick={() => { setAddressType(t === addressType ? null : t); setAddressFields({}) }} style={{ textTransform: "capitalize" }}>
                  {t === "general" ? "General" : t}
                </button>
              ))}
            </div>
            {addressType && (
              <TaggedAddressFieldGroup
                key={addressType}
                addressType={addressType}
                fields={getAddressFields(addressType)}
                values={addressFields}
                onChange={(key, value) => setAddressFields((p) => ({ ...p, [key]: value }))}
              />
            )}
          </div>

          {/* Qualities */}
          <div>
            <label className="label">Qualities</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {getDisplayOpts("qualities", qualities).map((opt) => (
                <button key={opt} className={`tag ${qualities.includes(opt) ? "selected" : ""}`} onClick={() => toggleMulti("qualities", opt)}>{opt}</button>
              ))}
            </div>
            <CustomOptionInput field="qualities" value={customInputs.qualities ?? ""} onChange={(v) => setCustomInputs((p) => ({ ...p, qualities: v }))} onAdd={() => addCustom("qualities")} />
          </div>

          {/* Hobbies */}
          <div>
            <label className="label">Hobbies</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {getDisplayOpts("hobbies", hobbies).map((opt) => (
                <button key={opt} className={`tag ${hobbies.includes(opt) ? "selected" : ""}`} onClick={() => toggleMulti("hobbies", opt)}>{opt}</button>
              ))}
            </div>
            <CustomOptionInput field="hobbies" value={customInputs.hobbies ?? ""} onChange={(v) => setCustomInputs((p) => ({ ...p, hobbies: v }))} onAdd={() => addCustom("hobbies")} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, paddingBottom: 24 }}>
        <button className="btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : <><Search size={16} /> Search</>}
        </button>
      </div>
    </div>
  )
}

function CustomOptionInput({
  field,
  value,
  onChange,
  onAdd,
}: {
  field: string
  value: string
  onChange: (value: string) => void
  onAdd: () => void
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <input
        className="input"
        placeholder={`Add your own ${field.replace(/_/g, " ")}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
      />
      <button
        onClick={onAdd}
        style={{ padding: "10px 16px", background: "var(--color-primary-bg)", border: "1px solid var(--color-border)", borderRadius: 10, color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 }}
      >
        Add
      </button>
    </div>
  )
}

function getAddressFields(type: TaggedAddressType) {
  switch (type) {
    case "college": return [
      { key: "college_name", label: "College Name", placeholder: "e.g. DTU" },
      { key: "graduation_year", label: "Graduation Year", placeholder: "e.g. 2028" },
      { key: "branch", label: "Branch", placeholder: "e.g. CE" },
      { key: "section", label: "Section", placeholder: "e.g. 2" },
    ]
    case "school": return [
      { key: "school_name", label: "School Name", placeholder: "School name" },
      { key: "pin_code", label: "Pin Code", placeholder: "Pin code" },
      { key: "completion_year", label: "Completion Year", placeholder: "e.g. 2026" },
    ]
    case "workplace": return [
      { key: "company_name", label: "Company Name", placeholder: "Company" },
      { key: "pin_code", label: "Pin Code", placeholder: "Pin code" },
      { key: "department", label: "Department", placeholder: "Department" },
    ]
    case "general": return [
      { key: "pin_code", label: "Pin Code", placeholder: "Pin code" },
      { key: "building_name", label: "Building/Premises", placeholder: "Building name" },
    ]
  }
}

export default function NewSearchPage() {
  return (
    <Suspense>
      <NewSearchContent />
    </Suspense>
  )
}
