import Link from "next/link"
import { PersonalityCard } from "@/components/cards/PersonalityCard"
import type { Card } from "@/types"

const demoCard: Card = {
  id: "landing-demo-card",
  card_id: "KFOKNS",
  user_id: "landing-demo-user",
  age: 19,
  gender: "male",
  personality_types: ["INTJ"],
  tagged_address: null,
  looking_for: "Co-founder",
  qualities: ["Funny", "Pragmatic"],
  hobbies: ["Coding", "Travelling"],
  note: "acha",
  is_public: true,
  is_closed: false,
  closed_with_profile_id: null,
  chat_enabled: false,
  view_count: 0,
  save_count: 0,
  like_count: 0,
  created_at: "",
  updated_at: "",
}

export default async function LandingPage() {
  return (
    <main className="landing-page" style={{ minHeight: "100vh", background: "#FAFAFA", color: "#1E1B4B", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
      <nav className="landing-nav" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "0 48px",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(250, 250, 250, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #EDE9FE",
      }}>
        <span style={{
          fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #7C3AED, #EC4899)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>Strefo</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/login" style={{
            color: "#6B7280", textDecoration: "none", fontSize: 14, fontWeight: 500,
            padding: "8px 16px", borderRadius: 999,
          }}>Sign in</Link>
          <Link href="/signup" style={{
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            color: "white", textDecoration: "none", fontSize: 14, fontWeight: 600,
            padding: "9px 22px", borderRadius: 999,
            boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
          }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero" style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #F5F3FF 0%, #FDF2F8 55%, #FAFAFA 100%)",
        display: "flex", alignItems: "center",
        padding: "100px 48px 80px",
      }}>
        <div className="landing-hero-inner" style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 72 }}>

          {/* Left */}
          <div className="landing-hero-copy" style={{ flex: "0 0 500px", maxWidth: 500, minWidth: 0 }}>

            <h1 className="landing-hero-title" style={{
              fontSize: "clamp(38px, 4.5vw, 58px)", fontWeight: 800, lineHeight: 1.1,
              letterSpacing: "-1.5px", marginBottom: 22,
            }}>
              Find people who{" "}
              <span style={{
                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>actually get you</span>
            </h1>

            <p className="landing-hero-description" style={{
              fontSize: 17, lineHeight: 1.75, color: "#6B7280", maxWidth: 420,
            }}>
              Create a personality card. Describe who you are and the kind of connection you&apos;re looking for. Let people find you - or go find them.
            </p>

            <div className="landing-hero-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/signup" style={{
                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                color: "white", textDecoration: "none", fontSize: 16, fontWeight: 600,
                padding: "14px 32px", borderRadius: 999, display: "inline-block",
                boxShadow: "0 8px 28px rgba(124, 58, 237, 0.35)",
              }}>Create your card</Link>
              <Link href="/login" style={{
                background: "white", border: "1.5px solid #EDE9FE",
                color: "#7C3AED", textDecoration: "none", fontSize: 16, fontWeight: 600,
                padding: "13px 28px", borderRadius: 999, display: "inline-block",
              }}>Sign in</Link>
            </div>

            <p className="landing-hero-note" style={{ fontSize: 13, color: "#9CA3AF", marginTop: 20 }}>
              No swiping. No algorithms. Just honest connections.
            </p>
          </div>

          {/* Right - mock card */}
          <div className="landing-hero-visual" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minWidth: 0 }}>
            <div className="landing-mock-shell" style={{ position: "relative", width: "100%", maxWidth: 390 }}>
              <div className="landing-mock-glow" style={{
                position: "absolute",
                inset: "-28px -18px -24px",
                background: "radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 68%)",
                pointerEvents: "none",
              }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <PersonalityCard card={demoCard} mode="search" showBrandMark />
              </div>
            </div>
          </div>

        </div>
      </section>

      <section className="landing-mobile-card-section">
        <p className="landing-mobile-card-note">No swiping. No algorithms. Just honest connections.</p>
        <div className="landing-mobile-card-shell">
          <div className="landing-mock-glow" style={{
            position: "absolute",
            inset: "-28px -18px -24px",
            background: "radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 68%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <PersonalityCard card={demoCard} mode="search" showBrandMark />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section" style={{ padding: "96px 48px", background: "white", borderTop: "1px solid #EDE9FE" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#7C3AED", textAlign: "center", marginBottom: 14 }}>HOW IT WORKS</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, textAlign: "center", letterSpacing: "-1px", marginBottom: 60 }}>
            Three steps to your next real connection
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              { n: "01", title: "Create your card", desc: "Fill in your personality type, hobbies, qualities, and what you're looking for. Be honest - the right people will find you." },
              { n: "02", title: "Search or get found", desc: "Run a filtered search to find people who match your vibe, or share your card ID and let them come to you." },
              { n: "03", title: "Unlock chat, connect", desc: "When you find someone interesting, unlock chat for your category. Exchange messages. Build something real." },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{
                background: "#F9FAFB", border: "1.5px solid #EDE9FE",
                borderRadius: 20, padding: "32px 28px",
              }}>
                <p style={{
                  fontSize: 44, fontWeight: 900, letterSpacing: -2, marginBottom: 18, lineHeight: 1,
                  background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>{n}</p>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#1E1B4B" }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: "#6B7280" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connection types */}
      <section className="landing-section landing-section-accent" style={{ padding: "96px 48px", background: "#F5F3FF", borderTop: "1px solid #EDE9FE" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#EC4899", textAlign: "center", marginBottom: 14 }}>WHAT ARE YOU LOOKING FOR?</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, textAlign: "center", letterSpacing: "-1px", marginBottom: 52 }}>
            Every kind of connection
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { icon: "✈️", label: "Travel Partner" },
              { icon: "🎮", label: "Gaming Buddy" },
              { icon: "🚀", label: "Co-founder" },
              { icon: "💛", label: "Best Friend" },
              { icon: "📚", label: "Study Partner" },
              { icon: "💪", label: "Gym Partner" },
              { icon: "🎬", label: "Movie Partner" },
              { icon: "🎵", label: "Music Collaborator" },
              { icon: "🏔️", label: "Hiking Partner" },
              { icon: "💼", label: "Professional Mentor" },
            ].map(({ icon, label }) => (
              <div key={label} style={{
                background: "white", border: "1.5px solid #EDE9FE",
                borderRadius: 16, padding: "22px 16px", textAlign: "center",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.04)",
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#4B5563" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-section landing-cta" style={{
        padding: "96px 48px",
        background: "linear-gradient(160deg, #F5F3FF 0%, #FDF2F8 100%)",
        borderTop: "1px solid #EDE9FE",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(30px, 4.5vw, 48px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 18, lineHeight: 1.15 }}>
            Your people are out there.{" "}
            <span style={{
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Go find them.</span>
          </h2>
          <p style={{ fontSize: 16, color: "#6B7280", marginBottom: 40, lineHeight: 1.7 }}>
            Create your personality card in under 2 minutes. No email, no social login - just your phone number and your story.
          </p>
          <Link href="/signup" style={{
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            color: "white", textDecoration: "none", fontSize: 17, fontWeight: 700,
            padding: "16px 40px", borderRadius: 999, display: "inline-block",
            boxShadow: "0 8px 32px rgba(124, 58, 237, 0.35)",
          }}>Create my card, it&apos;s free</Link>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 20 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer" style={{
        padding: "28px 48px",
        borderTop: "1px solid #EDE9FE",
        background: "white",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <span style={{
          fontSize: 18, fontWeight: 800,
          background: "linear-gradient(135deg, #7C3AED, #EC4899)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>Strefo</span>
        <p style={{ fontSize: 12, color: "#9CA3AF" }}>&copy; 2025 Strefo. All rights reserved.</p>
      </footer>

    </main>
  )
}
