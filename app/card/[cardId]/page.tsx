import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import Link from "next/link"

export default async function PublicCardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params
  const supabase = await createClient()

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("card_id", cardId.toUpperCase())
    .eq("is_public", true)
    .eq("is_closed", false)
    .single()

  if (!card) notFound()

  // Increment view count
  await supabase.from("cards").update({ view_count: card.view_count + 1 }).eq("id", card.id)

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #F5F3FF 0%, #FDF2F8 50%, #FAFAFA 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Strefo
            </span>
          </Link>
        </div>

        <PersonalityCard card={card} mode="public" />

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            Find your people on Strefo
          </p>
          <Link href="/signup" className="btn-primary" style={{ textDecoration: "none", maxWidth: 280, margin: "0 auto" }}>
            Join Strefo
          </Link>
        </div>
      </div>
    </div>
  )
}
