import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/home")

  return (
    <main style={{ minHeight: "100vh", background: "#0D0A1A", color: "white", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "16px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(13, 10, 26, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{
          fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #A78BFA, #F472B6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>Strefo</span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/login" style={{
            color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14, fontWeight: 500,
            padding: "8px 16px",
          }}>Sign in</Link>
          <Link href="/signup" style={{
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            color: "white", textDecoration: "none", fontSize: 14, fontWeight: 600,
            padding: "9px 20px", borderRadius: 999,
          }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: "100vh",
        display: "flex", alignItems: "center",
        padding: "120px 40px 80px",
        maxWidth: 1200, margin: "0 auto",
        gap: 64,
      }}>
        {/* Left */}
        <div style={{ flex: "0 0 520px", maxWidth: 520 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(124, 58, 237, 0.15)", border: "1px solid rgba(124, 58, 237, 0.3)",
            borderRadius: 999, padding: "6px 14px", marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A78BFA", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#A78BFA", letterSpacing: 0.5 }}>PERSONALITY-FIRST CONNECTIONS</span>
          </div>

          <h1 style={{
            fontSize: "clamp(40px, 5vw, 60px)", fontWeight: 800, lineHeight: 1.1,
            letterSpacing: "-1.5px", marginBottom: 24,
          }}>
            Find people who{" "}
            <span style={{
              background: "linear-gradient(135deg, #A78BFA, #F472B6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>actually get you</span>
          </h1>

          <p style={{
            fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.55)", marginBottom: 40,
            maxWidth: 440,
          }}>
            Create a personality card. Describe who you are and the kind of connection you&apos;re looking for. Let people find you - or go find them.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/signup" style={{
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
              color: "white", textDecoration: "none", fontSize: 16, fontWeight: 600,
              padding: "14px 32px", borderRadius: 999, display: "inline-block",
              boxShadow: "0 8px 32px rgba(124, 58, 237, 0.4)",
            }}>Create your card</Link>
            <Link href="/login" style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 16, fontWeight: 500,
              padding: "14px 32px", borderRadius: 999, display: "inline-block",
            }}>I already have an account</Link>
          </div>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>
            No swiping. No algorithms. Just honest connections.
          </p>
        </div>

        {/* Right - mock personality card */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minWidth: 0 }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 340 }}>
            {/* Glow */}
            <div style={{
              position: "absolute", inset: -40,
              background: "radial-gradient(ellipse at center, rgba(124,58,237,0.25) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Card */}
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24, padding: 28,
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
              position: "relative",
            }}>
              {/* Card top */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 4 }}>PERSONALITY CARD</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 2 }}>RX7A2K</p>
                </div>
                <div style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.3))",
                  border: "1px solid rgba(167,139,250,0.3)",
                  borderRadius: 999, padding: "5px 12px",
                  fontSize: 11, fontWeight: 700, color: "#A78BFA", letterSpacing: 0.5,
                }}>Co-founder</div>
              </div>

              {/* Meta */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <span style={{
                  background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "4px 10px",
                  fontSize: 12, color: "rgba(255,255,255,0.6)",
                }}>23</span>
                <span style={{
                  background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "4px 10px",
                  fontSize: 12, color: "rgba(255,255,255,0.6)",
                }}>Male</span>
                <span style={{
                  background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "4px 10px",
                  fontSize: 12, color: "rgba(255,255,255,0.6)",
                }}>Delhi, India</span>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {["INTJ", "Analytical", "Ambitious"].map(t => (
                  <span key={t} style={{
                    background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)",
                    borderRadius: 999, padding: "4px 10px",
                    fontSize: 11, fontWeight: 600, color: "#A78BFA",
                  }}>{t}</span>
                ))}
              </div>

              {/* Note */}
              <p style={{
                fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.5)",
                background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "10px 14px",
                borderLeft: "2px solid rgba(124,58,237,0.4)", marginBottom: 20,
              }}>
                &ldquo;Building in EdTech. Looking for someone obsessed with execution, not just ideas.&rdquo;
              </p>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{
                  flex: 1, textAlign: "center", padding: "10px",
                  background: "rgba(255,255,255,0.04)", borderRadius: 12,
                  fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}>Like</div>
                <div style={{
                  flex: 1, textAlign: "center", padding: "10px",
                  background: "rgba(255,255,255,0.04)", borderRadius: 12,
                  fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}>Save</div>
                <div style={{
                  flex: 1, textAlign: "center", padding: "10px",
                  background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.3))",
                  borderRadius: 12,
                  fontSize: 12, fontWeight: 600, color: "#A78BFA",
                  border: "1px solid rgba(167,139,250,0.2)",
                }}>Chat</div>
              </div>
            </div>

            {/* Second card peeking behind */}
            <div style={{
              position: "absolute", bottom: -16, left: 20, right: 20,
              height: 60, background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 24, zIndex: -1,
            }} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{
        padding: "100px 40px",
        background: "rgba(255,255,255,0.02)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#A78BFA", textAlign: "center", marginBottom: 16 }}>HOW IT WORKS</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, textAlign: "center", letterSpacing: "-1px", marginBottom: 64 }}>
            Three steps to your next real connection
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {[
              {
                n: "01",
                title: "Create your card",
                desc: "Fill in your personality type, hobbies, qualities, and what you're looking for. Be honest - the right people will find you.",
              },
              {
                n: "02",
                title: "Search or get found",
                desc: "Run a filtered search to find people who match your vibe, or share your card ID and let them come to you.",
              },
              {
                n: "03",
                title: "Unlock chat, connect",
                desc: "When you find someone interesting, unlock chat for your category. Exchange messages. Build something real.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 20, padding: 32,
              }}>
                <p style={{
                  fontSize: 48, fontWeight: 900, letterSpacing: -2, marginBottom: 20,
                  background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(244,114,182,0.3))",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  lineHeight: 1,
                }}>{n}</p>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.45)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connection types */}
      <section style={{ padding: "100px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#F472B6", textAlign: "center", marginBottom: 16 }}>WHAT ARE YOU LOOKING FOR?</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, textAlign: "center", letterSpacing: "-1px", marginBottom: 56 }}>
            Every kind of connection
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {[
              { icon: "✈️", label: "Travel Partner" },
              { icon: "🎮", label: "Gaming Buddy" },
              { icon: "🚀", label: "Co-founder" },
              { icon: "💛", label: "Best Friend" },
              { icon: "🎓", label: "Study Partner" },
              { icon: "💪", label: "Gym Partner" },
              { icon: "🎬", label: "Movie Partner" },
              { icon: "🎵", label: "Music Collaborator" },
              { icon: "🏔️", label: "Hiking Partner" },
              { icon: "💼", label: "Professional Mentor" },
            ].map(({ icon, label }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "20px 16px", textAlign: "center",
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: "100px 40px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 20, lineHeight: 1.1 }}>
            Your people are out there.{" "}
            <span style={{
              background: "linear-gradient(135deg, #A78BFA, #F472B6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Go find them.</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 40, lineHeight: 1.6 }}>
            Create your personality card in under 2 minutes. No email, no social login - just your phone number and your story.
          </p>
          <Link href="/signup" style={{
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            color: "white", textDecoration: "none", fontSize: 17, fontWeight: 700,
            padding: "16px 40px", borderRadius: 999, display: "inline-block",
            boxShadow: "0 12px 40px rgba(124, 58, 237, 0.45)",
          }}>Create my card, it&apos;s free</Link>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 20 }}>
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "32px 40px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 16,
      }}>
        <span style={{
          fontSize: 18, fontWeight: 800,
          background: "linear-gradient(135deg, #A78BFA, #F472B6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>Strefo</span>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          &copy; 2025 Strefo. All rights reserved.
        </p>
      </footer>
    </main>
  )
}
