"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { BannerImage, BannerSection } from "@/types"

type SectionWithImages = BannerSection & { images: BannerImage[] }

function BannerCarousel({ images }: { images: BannerImage[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), 3500)
    return () => clearInterval(id)
  }, [images.length])

  if (images.length === 0) return null
  const img = images[index]

  const content = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img.image_url}
      alt="Banner"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 14 }}
    />
  )

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7", borderRadius: 14, overflow: "hidden", background: "var(--color-primary-bg)" }}>
      {img.link_url ? (
        <a href={img.link_url} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", height: "100%" }}>{content}</a>
      ) : content}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
          {images.map((_, i) => (
            <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === index ? "white" : "rgba(255,255,255,0.5)" }} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Home-page banner sections (admin-managed), rendered above the help-friends box. */
export function HomeBanners() {
  const [sections, setSections] = useState<SectionWithImages[]>([])

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      const [{ data: sectionData }, { data: imageData }] = await Promise.all([
        supabase.from("banner_sections").select("*").eq("is_hidden", false).order("display_order"),
        supabase.from("banner_images").select("*").eq("is_hidden", false).order("display_order"),
      ])
      const imgs = (imageData ?? []) as BannerImage[]
      const withImages = ((sectionData ?? []) as BannerSection[]).map((s) => ({
        ...s,
        images: imgs.filter((i) => i.section_id === s.id),
      })).filter((s) => s.images.length > 0)
      setSections(withImages)
    })()
  }, [])

  if (sections.length === 0) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
      {sections.map((section) => (
        <div key={section.id}>
          {section.title && (
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>{section.title}</h2>
          )}
          <BannerCarousel images={section.images} />
        </div>
      ))}
    </div>
  )
}
