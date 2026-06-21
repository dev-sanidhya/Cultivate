"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Phone, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { normalizePhone } from "@/lib/utils/auth"
import { Spinner } from "@/components/ui/Spinner"
import type { Gender } from "@/types"

type Step = "phone" | "otp" | "details"

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("phone")
  const [loading, setLoading] = useState(false)

  // Step 1
  const [phone, setPhone] = useState("")
  const [sessionId, setSessionId] = useState("")

  // Step 2
  const [otp, setOtp] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [userId, setUserId] = useState("")

  // Step 3
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [gender, setGender] = useState<Gender | "">("")
  const [dob, setDob] = useState("")

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
        body: JSON.stringify({ phone, purpose: "signup" }),
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

      if (data.hasProfile) {
        // Existing user - sign them in
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
        router.push("/home")
        return
      }

      setAuthEmail(data.email)
      setAuthPassword(data.password)
      setUserId(data.userId)
      setStep("details")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  async function completeSignup() {
    if (!firstName.trim()) { toast.error("Enter your first name"); return }
    if (!gender) { toast.error("Select your gender"); return }
    if (!dob) { toast.error("Enter your date of birth"); return }

    setLoading(true)
    try {
      const supabase = createClient()

      // Sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      })
      if (signInError) throw signInError

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        phone: normalizePhone(phone),
        first_name: firstName.trim(),
        last_name: lastName.trim() || "",
        gender,
        date_of_birth: dob,
      })
      if (profileError) throw profileError

      router.push("/home")
      toast.success("Welcome to Strefo!")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "20px 24px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
        {step === "phone" ? (
          <Link href="/" style={{ display: "flex" }}>
            <button className="btn-ghost" style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: "1px solid var(--color-border)" }}>
              <ArrowLeft size={16} />
            </button>
          </Link>
        ) : (
          <button
            onClick={() => setStep(step === "otp" ? "phone" : "otp")}
            className="btn-ghost"
            style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: "1px solid var(--color-border)" }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["phone", "otp", "details"] as Step[]).map((s, i) => (
              <div
                key={s}
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 2,
                  background: ["phone", "otp", "details"].indexOf(step) >= i ? "var(--color-primary)" : "var(--color-border)",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {step === "phone" && (
          <div className="animate-fadeIn">
            <Phone size={32} color="var(--color-primary)" style={{ marginBottom: 16 }} />
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>
              What&apos;s your number?
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 32 }}>
              We&apos;ll send you a one-time verification code.
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
              {loading ? <Spinner /> : <>Send OTP <ChevronRight size={16} /></>}
            </button>
            <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--color-text-secondary)" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          </div>
        )}

        {step === "otp" && (
          <div className="animate-fadeIn">
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>
              Verify your number
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 32 }}>
              Enter the 6-digit code sent to{" "}
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
              {loading ? <Spinner /> : "Verify"}
            </button>
            <button
              onClick={sendOtp}
              style={{ width: "100%", marginTop: 12, padding: "12px", background: "transparent", border: "none", color: "var(--color-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Resend OTP
            </button>
          </div>
        )}

        {step === "details" && (
          <div className="animate-fadeIn">
            <div style={{ fontSize: 32, marginBottom: 16 }}>👋</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>
              Tell us about you
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 32 }}>
              These details are permanent and visible on your profile.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              <div>
                <label className="label">First Name</label>
                <input
                  className="input"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Last Name </label>
                <input
                  className="input"
                  placeholder="Last name "
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Gender</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["male", "female", "other"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: `2px solid ${gender === g ? "var(--color-primary)" : "var(--color-border)"}`,
                        background: gender === g ? "var(--color-primary-bg)" : "white",
                        color: gender === g ? "var(--color-primary)" : "var(--color-text-secondary)",
                        fontWeight: gender === g ? 700 : 500,
                        fontSize: 14,
                        cursor: "pointer",
                        textTransform: "capitalize",
                        transition: "all 0.15s",
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input
                  className="input"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <button className="btn-primary" onClick={completeSignup} disabled={loading}>
              {loading ? <Spinner /> : "Create Account"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
