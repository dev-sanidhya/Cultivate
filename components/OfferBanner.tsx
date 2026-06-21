"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchActiveOffersForUser, primaryCountdownOffer, type ActiveOffer } from "@/lib/offers"

function countdownText(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return "Ending..."
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${d}d ${h % 24}h left`
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} left`
}

/**
 * Shows the active offer's promotional banner popup (once per browser session)
 * and a floating countdown for the earliest-started active offer.
 */
export function OfferBanner({ userId }: { userId: string }) {
  const router = useRouter()
  const [primary, setPrimary] = useState<ActiveOffer | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      try {
        const active = await fetchActiveOffersForUser(supabase, userId)
        const p = primaryCountdownOffer(active)
        setPrimary(p)
        if (p) {
          const key = `offer_popup_seen_${p.offer.id}_${p.startedAt}`
          if (!sessionStorage.getItem(key)) {
            setShowPopup(true)
            sessionStorage.setItem(key, "1")
          }
        }
      } catch {
        // offers are non-critical; ignore failures
      }
    })()
  }, [userId])

  // Re-render the countdown every second while an offer is active.
  useEffect(() => {
    if (!primary) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [primary])

  if (!primary) return null
  if (new Date(primary.expiresAt).getTime() <= Date.now()) return null

  return (
    <>
      {/* Promotional popup banner */}
      {showPopup && (
        <div
          onClick={() => setShowPopup(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 18, maxWidth: 360, width: "100%", overflow: "hidden", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <button
              onClick={() => setShowPopup(false)}
              aria-label="Close"
              style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}
            >
              <X size={16} />
            </button>
            {primary.offer.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primary.offer.banner_url}
                alt="Offer"
                style={{ width: "100%", display: "block", cursor: "pointer" }}
                onClick={() => { setShowPopup(false); router.push("/subscriptions") }}
              />
            ) : (
              <div style={{ padding: 28, textAlign: "center", background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))", color: "white" }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Limited-time offer!</h3>
                <p style={{ fontSize: 14, opacity: 0.95 }}>Unlock chats at a discount. {countdownText(primary.expiresAt)}.</p>
              </div>
            )}
            <div style={{ padding: 16 }}>
              <button
                onClick={() => { setShowPopup(false); router.push("/subscriptions") }}
                style={{ width: "100%", padding: "12px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
              >
                Grab the offer · {countdownText(primary.expiresAt)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating countdown */}
      <button
        onClick={() => router.push("/subscriptions")}
        style={{
          position: "fixed", bottom: 84, right: 14, zIndex: 80,
          background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
          color: "white", border: "none", borderRadius: 999, padding: "8px 14px",
          fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
        }}
      >
        🎉 Offer · {countdownText(primary.expiresAt)}
      </button>
    </>
  )
}
