"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/PageHeader"
import { normalizeCardId } from "@/lib/utils/cardId"
import type { FieldOption, TaggedAddress, TaggedAddressType } from "@/types"
import { Search } from "lucide-react"

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
  const [personalityTypes, setPersonalityTypes] = useState<string[]>([])
  const [qualities, setQualities] = useState<string[]>([])
  const [hobbies, setHobbies] = useState<string[]>([])
  const [addressType, setAddressType] = useState<TaggedAddressType | null>(null)
  const [addressFields, setAddressFields] = useState<Record<string, string>>({})

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
          setPersonalityTypes(existingSearch.personality_types ?? [])
          setQualities(existingSearch.qualities ?? [])
          setHobbies(existingSearch.hobbies ?? [])
          if (existingSearch.tagged_address) {
            setAddressType(existingSearch.tagged_address.type)
            const { type, ...fields } = existingSearch.tagged_address
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

  function buildTaggedAddress(): TaggedAddress | null {
    if (!addressType) return null
    const f = addressFields
    switch (addressType) {
      case "college": return { type: "college", college_name: f.college_name ?? "", graduation_year: f.graduation_year ?? "", branch: f.branch ?? "", section: f.section ?? "" }
      case "school": return { type: "school", school_name: f.school_name ?? "", pin_code: f.pin_code ?? "", completion_year: f.completion_year ?? "" }
      case "workplace": return { type: "workplace", company_name: f.company_name ?? "", pin_code: f.pin_code ?? "", department: f.department ?? "" }
      case "general": return { type: "general", pin_code: f.pin_code ?? "", building_name: f.building_name ?? "" }
    }
  }

  async function handleSearch() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

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
            personality_types: personalityTypes,
            qualities,
            hobbies,
            tagged_address: buildTaggedAddress(),
            last_searched_at: new Date().toISOString(),
          }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload = searchData as any

      let searchId = editId
      if (editId) {
        await supabase.from("searches").update({ ...insertPayload, new_cards_count: 0 }).eq("id", editId)
      } else {
        const { data } = await supabase.from("searches").insert(insertPayload).select().single()
        searchId = data?.id
      }

      router.push(`/search/results?id=${searchId}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const getOpts = (field: string) => fieldOptions[field]?.map((o) => o.value) ?? []

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
              <button className={`tag ${!lookingFor ? "selected" : ""}`} onClick={() => setLookingFor("")}>Any</button>
              {getOpts("looking_for").map((opt) => (
                <button key={opt} className={`tag ${lookingFor === opt ? "selected" : ""}`} onClick={() => setLookingFor(lookingFor === opt ? "" : opt)}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Personality Type */}
          <div>
            <label className="label">Personality Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {getOpts("personality_types").map((opt) => (
                <button key={opt} className={`tag ${personalityTypes.includes(opt) ? "selected" : ""}`} onClick={() => toggleMulti("personality_types", opt)}>
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
                <button key={t} className={`tag ${addressType === t ? "selected" : ""}`} onClick={() => { setAddressType(t === addressType ? null : t); setAddressFields({}) }} style={{ textTransform: "capitalize" }}>
                  {t === "general" ? "General" : t}
                </button>
              ))}
            </div>
            {addressType && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {getAddressFields(addressType).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>{label}</label>
                    <input className="input" placeholder={placeholder} value={addressFields[key] ?? ""} onChange={(e) => setAddressFields((p) => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Qualities */}
          <div>
            <label className="label">Qualities</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {getOpts("qualities").map((opt) => (
                <button key={opt} className={`tag ${qualities.includes(opt) ? "selected" : ""}`} onClick={() => toggleMulti("qualities", opt)}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Hobbies */}
          <div>
            <label className="label">Hobbies</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {getOpts("hobbies").map((opt) => (
                <button key={opt} className={`tag ${hobbies.includes(opt) ? "selected" : ""}`} onClick={() => toggleMulti("hobbies", opt)}>{opt}</button>
              ))}
            </div>
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
