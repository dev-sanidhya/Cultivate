import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import { PublicCardViewer } from "@/components/cards/PublicCardViewer"
import { CardViewTracker } from "@/components/cards/CardViewTracker"
import Link from "next/link"

export default async function PublicCardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("card_id", cardId.toUpperCase())
    .eq("is_public", true)
    .eq("is_closed", false)
    .single()

  if (!card) notFound()

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #F5F3FF 0%, #FDF2F8 50%, #FAFAFA 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "70px 16px 24px",
      }}
    >
      {user?.id !== card.user_id && <CardViewTracker cardId={card.id} />}
      <div style={{ width: "100%", maxWidth: 390, marginTop: 4 }}>
        {user ? (
          <PublicCardViewer card={card} />
        ) : (
          <>
            <PersonalityCard card={card} mode="public" showBrandMark />

            <div style={{ marginTop: 28, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 12 }}>
                Find your people on Strefo
              </p>
              <Link href="/signup" className="btn-primary" style={{ textDecoration: "none", maxWidth: 280, margin: "0 auto" }}>
                Join Strefo
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
