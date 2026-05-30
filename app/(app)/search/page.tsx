"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/Spinner"
import type { Search as SearchType } from "@/types"
import { formatTaggedAddress } from "@/lib/utils/format"

export default function SearchPage() {
  const router = useRouter()
  const [searches, setSearches] = useState<SearchType[]>([])
  const [loading, setLoading] = useState(true)

  async function loadSearches() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from("searches")
      .select("*")
      .eq("user_id", user!.id)
      .order("last_searched_at", { ascending: false })
    setSearches(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadSearches()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  async function deleteSearch(id: string) {
    const supabase = createClient()
    await supabase.from("searches").delete().eq("id", id)
    setSearches((prev) => prev.filter((s) => s.id !== id))
    toast.success("Search deleted")
  }

  async function reSearch(search: SearchType) {
    const supabase = createClient()
    await supabase.from("searches")
      .update({ last_searched_at: new Date().toISOString(), new_cards_count: 0 })
      .eq("id", search.id)
    router.push(`/search/results?id=${search.id}`)
  }

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>
  }

  return (
    <div className="page-container" style={{ paddingTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)" }}>Search</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>Find matching people</p>
        </div>
        <button
          onClick={() => router.push("/search/new")}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            background: "var(--color-primary)", color: "white", border: "none",
            borderRadius: 20, fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}
        >
          <Plus size={16} /> New Search
        </button>
      </div>

      {searches.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>No searches yet</h3>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>Create a search to find people matching your vibe.</p>
          <button className="btn-primary" style={{ maxWidth: 200, margin: "0 auto" }} onClick={() => router.push("/search/new")}>
            Create Search
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {searches.map((s) => (
            <SearchHistoryCard
              key={s.id}
              search={s}
              onSearch={() => reSearch(s)}
              onEdit={() => router.push(`/search/new?edit=${s.id}`)}
              onDelete={() => deleteSearch(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SearchHistoryCard({
  search,
  onSearch,
  onEdit,
  onDelete,
}: { search: SearchType; onSearch: () => void; onEdit: () => void; onDelete: () => void }) {
  if (search.search_type === "card_id") {
    return (
      <div
        className="card"
        onClick={onSearch}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSearch()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Re-search card ID ${search.card_id_query}`}
        style={{ padding: "16px 20px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={16} color="var(--color-primary)" />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>
            Card ID: {search.card_id_query}
          </span>
          <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 size={14} color="var(--color-error)" />
          </button>
        </div>
      </div>
    )
  }

  const ageLabel = typeof search.age === "number" ? `${search.age}y` : null
  const genderLabel = search.gender ? search.gender.charAt(0).toUpperCase() + search.gender.slice(1) : null
  const lookingForLabel = search.looking_for ? `Looking for: ${search.looking_for}` : null
  const addressLabel = search.tagged_address ? formatTaggedAddress(search.tagged_address) : null

  return (
    <div
      className="card"
      onClick={onSearch}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSearch()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Re-search this history item"
      style={{ padding: "16px 20px", cursor: "pointer" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                background: "var(--color-primary-bg)",
                color: "var(--color-primary)",
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                border: "1px solid var(--color-border)",
              }}
            >
              Filter Search
            </span>
            {search.new_cards_count > 0 && (
              <span style={{
                fontSize: 12, fontWeight: 600, color: "var(--color-success)",
                background: "var(--color-success-bg)", padding: "3px 8px", borderRadius: 20,
              }}>
                {search.new_cards_count} New Cards
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit">
              <Pencil size={15} />
            </button>
            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
              <Trash2 size={14} color="var(--color-error)" />
            </button>
          </div>
        </div>

        {lookingForLabel && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              color: "white",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              width: "fit-content",
            }}
          >
            {lookingForLabel}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ageLabel && (
            <span className="tag selected" style={{ background: "#EDE9FE", color: "#6D28D9", border: "none" }}>
              {ageLabel}
            </span>
          )}
          {genderLabel && (
            <span className="tag selected" style={{ background: "#EDE9FE", color: "#6D28D9", border: "none", textTransform: "capitalize" }}>
              {genderLabel}
            </span>
          )}
          {search.personality_types?.map((p) => (
            <span key={p} className="tag">
              {p}
            </span>
          ))}
        </div>

        {addressLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Location:</span>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{addressLabel}</span>
          </div>
        )}

        {!!search.qualities?.length && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>Qualities</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {search.qualities.map((q) => (
                <span key={q} className="tag" style={{ fontSize: 12, flex: "0 0 auto" }}>
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}

        {!!search.hobbies?.length && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>Hobbies</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {search.hobbies.map((h) => (
                <span key={h} className="tag" style={{ fontSize: 12, flex: "0 0 auto" }}>
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
