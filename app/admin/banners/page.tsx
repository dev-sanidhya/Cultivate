"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Plus, Trash2, Eye, EyeOff, Upload, ArrowUp, ArrowDown } from "lucide-react"
import { uploadAdminImage } from "@/lib/uploadImage"
import type { BannerSection, BannerImage } from "@/types"

export default function AdminBannersPage() {
  const [sections, setSections] = useState<BannerSection[]>([])
  const [images, setImages] = useState<Record<string, BannerImage[]>>({})
  const [loading, setLoading] = useState(true)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [])

  async function load() {
    const supabase = createClient()
    const [{ data: sectionData }, { data: imageData }] = await Promise.all([
      supabase.from("banner_sections").select("*").order("display_order"),
      supabase.from("banner_images").select("*").order("display_order"),
    ])
    setSections((sectionData ?? []) as BannerSection[])
    const bySection: Record<string, BannerImage[]> = {}
    for (const img of (imageData ?? []) as BannerImage[]) {
      ;(bySection[img.section_id] ??= []).push(img)
    }
    setImages(bySection)
    setLoading(false)
  }

  async function addSection() {
    const supabase = createClient()
    const order = sections.length
    const { data } = await supabase.from("banner_sections").insert({ title: "New Section", display_order: order }).select("*").single()
    if (data) setSections((prev) => [...prev, data as BannerSection])
  }

  async function updateSection(id: string, patch: Partial<BannerSection>) {
    const supabase = createClient()
    await supabase.from("banner_sections").update(patch).eq("id", id)
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  async function deleteSection(id: string) {
    const supabase = createClient()
    await supabase.from("banner_sections").delete().eq("id", id)
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  async function moveSection(id: string, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sections.length) return
    const a = sections[idx], b = sections[swapIdx]
    await Promise.all([updateSection(a.id, { display_order: b.display_order }), updateSection(b.id, { display_order: a.display_order })])
    setSections((prev) => [...prev].sort((x, y) => (x.id === a.id ? b.display_order : x.id === b.id ? a.display_order : x.display_order) - (y.id === a.id ? b.display_order : y.id === b.id ? a.display_order : y.display_order)))
  }

  async function addImage(sectionId: string, file: File) {
    setUploadingFor(sectionId)
    try {
      const url = await uploadAdminImage(file, `banners/${sectionId}`)
      const supabase = createClient()
      const order = (images[sectionId]?.length ?? 0)
      const { data } = await supabase.from("banner_images").insert({ section_id: sectionId, image_url: url, display_order: order }).select("*").single()
      if (data) setImages((prev) => ({ ...prev, [sectionId]: [...(prev[sectionId] ?? []), data as BannerImage] }))
      toast.success("Image added")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploadingFor(null)
    }
  }

  async function updateImage(sectionId: string, id: string, patch: Partial<BannerImage>) {
    const supabase = createClient()
    await supabase.from("banner_images").update(patch).eq("id", id)
    setImages((prev) => ({ ...prev, [sectionId]: (prev[sectionId] ?? []).map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  }

  async function deleteImage(sectionId: string, id: string) {
    const supabase = createClient()
    await supabase.from("banner_images").delete().eq("id", id)
    setImages((prev) => ({ ...prev, [sectionId]: (prev[sectionId] ?? []).filter((i) => i.id !== id) }))
  }

  if (loading) return <div style={{ padding: 40, color: "var(--color-text-secondary)" }}>Loading...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)" }}>Home Banners</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
            Sections shown on the Home page (above &quot;Help Your Friends Join&quot;). Images auto-rotate in a carousel.
          </p>
        </div>
        <button onClick={addSection} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>
          <Plus size={16} /> Add Section
        </button>
      </div>

      {sections.length === 0 && <p style={{ color: "var(--color-text-muted)" }}>No sections yet.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {sections.map((section, idx) => (
          <div key={section.id} className="card" style={{ padding: 20, maxWidth: 760, opacity: section.is_hidden ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <input
                className="input"
                value={section.title}
                onChange={(e) => setSections((prev) => prev.map((s) => s.id === section.id ? { ...s, title: e.target.value } : s))}
                onBlur={(e) => updateSection(section.id, { title: e.target.value })}
                style={{ flex: 1 }}
                placeholder="Section title"
              />
              <button onClick={() => moveSection(section.id, -1)} disabled={idx === 0} aria-label="Move up" className="btn-ghost" style={{ padding: 6 }}><ArrowUp size={16} /></button>
              <button onClick={() => moveSection(section.id, 1)} disabled={idx === sections.length - 1} aria-label="Move down" className="btn-ghost" style={{ padding: 6 }}><ArrowDown size={16} /></button>
              <button onClick={() => updateSection(section.id, { is_hidden: !section.is_hidden })} aria-label="Toggle visibility" className="btn-ghost" style={{ padding: 6 }}>
                {section.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button onClick={() => deleteSection(section.id)} aria-label="Delete section" style={{ padding: 6, background: "var(--color-error-bg)", color: "var(--color-error)", border: "none", borderRadius: 8, cursor: "pointer" }}><Trash2 size={16} /></button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {(images[section.id] ?? []).map((img) => (
                <div key={img.id} style={{ width: 180, border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden", opacity: img.is_hidden ? 0.5 : 1 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.image_url} alt="Banner" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: 8 }}>
                    <input
                      className="input"
                      placeholder="Destination URL"
                      defaultValue={img.link_url ?? ""}
                      onBlur={(e) => updateImage(section.id, img.id, { link_url: e.target.value || null })}
                      style={{ fontSize: 12, marginBottom: 6 }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => updateImage(section.id, img.id, { is_hidden: !img.is_hidden })} className="btn-ghost" style={{ padding: 4, flex: 1 }}>
                        {img.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => deleteImage(section.id, img.id)} style={{ padding: 4, flex: 1, background: "var(--color-error-bg)", color: "var(--color-error)", border: "none", borderRadius: 6, cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}

              <label style={{ width: 180, height: 162, border: "2px dashed var(--color-border)", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13 }}>
                <Upload size={20} />
                {uploadingFor === section.id ? "Uploading..." : "Add image"}
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void addImage(section.id, f) }} />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
