"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Phone } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/Spinner"

type Step = "phone" | "otp"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("phone")
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [authCreds, setAuthCreds] = useState<{ email: string; password: string } | null>(null)

  async function sendOtp() {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid phone number")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSessionId(data.sessionId)
      setStep("otp")
      if (data.dev) toast.info("Dev mode: enter any 6-digit OTP")
      else toast.success("OTP sent!")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) throw error

      if (!data.hasProfile) {
        // New user trying to login - redirect to signup to fill details
        setAuthCreds({ email: data.email, password: data.password })
        toast.info("Please complete your profile first.")
        router.push("/signup")
        return
      }

      router.push("/home")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "20px 24px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
        {step === "phone" ? (
          <Link href="/" style={{ display: "flex" }}>
            <button className="btn-ghost" style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: "1px solid var(--color-border)" }}>
              <ArrowLeft size={16} />
            </button>
          </Link>
        ) : (
          <button
            onClick={() => setStep("phone")}
            className="btn-ghost"
            style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: "1px solid var(--color-border)" }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>Sign In</span>
      </div>

      <div style={{ flex: 1 }}>
        {step === "phone" && (
          <div className="animate-fadeIn">
            <Phone size={32} color="var(--color-primary)" style={{ marginBottom: 16 }} />
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 32 }}>
              Enter your registered phone number.
            </p>
            <div style={{ marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, color: "var(--color-text-secondary)", fontWeight: 500,
                }}>+91</span>
                <input
                  className="input"
                  style={{ paddingLeft: 52 }}
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  maxLength={10}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={sendOtp} disabled={loading}>
              {loading ? <Spinner /> : "Get OTP"}
            </button>
            <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--color-text-secondary)" }}>
              New to Strefo?{" "}
              <Link href="/signup" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                Create account
              </Link>
            </p>
          </div>
        )}

        {step === "otp" && (
          <div className="animate-fadeIn">
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>
              Enter OTP
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 32 }}>
              Code sent to{" "}
              <strong style={{ color: "var(--color-text)" }}>+91 {phone}</strong>
            </p>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
              maxLength={6}
              style={{ letterSpacing: 8, fontSize: 22, textAlign: "center", fontWeight: 700 }}
            />
            <button className="btn-primary" style={{ marginTop: 24 }} onClick={verifyOtp} disabled={loading}>
              {loading ? <Spinner /> : "Sign In"}
            </button>
            <button
              onClick={sendOtp}
              style={{ width: "100%", marginTop: 12, padding: "12px", background: "transparent", border: "none", color: "var(--color-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
