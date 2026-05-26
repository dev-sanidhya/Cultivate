import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/home")

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #F5F3FF 0%, #FDF2F8 50%, #FAFAFA 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 24px calc(24px + env(safe-area-inset-bottom))",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(124, 58, 237, 0.3)",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M18 6C11.4 6 6 11.4 6 18s5.4 12 12 12 12-5.4 12-12S24.6 6 18 6z" fill="rgba(255,255,255,0.2)" />
            <path d="M12 18c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6-6-2.7-6-6z" fill="white" />
            <circle cx="18" cy="18" r="3" fill="rgba(124,58,237,0.6)" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-1px",
          }}
        >
          Strefo
        </h1>
        <p style={{ fontSize: 16, color: "#6B7280", marginTop: 8, lineHeight: 1.5 }}>
          Find your people.<br />Bond with purpose.
        </p>
      </div>

      {/* Feature list */}
      <div style={{ width: "100%", marginBottom: 48, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { emoji: "✈️", text: "Travel partners" },
          { emoji: "🎮", text: "Gaming buddies" },
          { emoji: "🚀", text: "Co-founders" },
          { emoji: "💛", text: "Best friends" },
          { emoji: "🎓", text: "College connections" },
        ].map(({ emoji, text }) => (
          <div
            key={text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "white",
              borderRadius: 12,
              border: "1px solid #EDE9FE",
              boxShadow: "0 1px 4px rgba(109,40,217,0.06)",
            }}
          >
            <span style={{ fontSize: 20 }}>{emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: "#1E1B4B" }}>{text}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href="/signup" className="btn-primary" style={{ textDecoration: "none" }}>
          Get Started
        </Link>
        <Link href="/login" className="btn-secondary" style={{ textDecoration: "none" }}>
          Sign In
        </Link>
      </div>

      <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 24, textAlign: "center" }}>
        By continuing, you agree to Strefo&apos;s Terms of Service and Privacy Policy.
      </p>
    </main>
  )
}
