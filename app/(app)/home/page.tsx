import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Users, MessageSquarePlus } from "lucide-react"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", user.id)
    .single()

  return (
    <div className="page-container" style={{ paddingTop: 10 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)" }}>
          Hey, {profile?.first_name} 👋
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>
          Find your people on Strefo.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Upload Contacts Card */}
        <Link href="/contacts" style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{
              padding: "20px",
              background: "linear-gradient(135deg, #F5F3FF, #FDF2F8)",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Users size={22} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  Help Your Friends Join
                </h3>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  Check if your college class or group contacts are already on Strefo, or help us reach them.
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Feedback Card */}
        <a
          href={`mailto:ciarog2512@gmail.com?subject=Parseen Feedback/Suggestion`}
          style={{ textDecoration: "none" }}
        >
          <div
            className="card"
            style={{
              padding: "20px",
              background: "linear-gradient(135deg, #FDF2F8, #FFF8F0)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MessageSquarePlus size={22} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  Share Feedback
                </h3>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  Got suggestions or spotted something? We&apos;d love to hear from you.
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </a>

        {/* Quick actions */}
        <div style={{ marginTop: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>
            Quick Actions
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { href: "/cards/create", emoji: "✨", label: "Create Card", sub: "Share who you are" },
              { href: "/search/new", emoji: "🔍", label: "Find People", sub: "Search for matches" },
            ].map(({ href, emoji, label, sub }) => (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div
                  className="card"
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{label}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
