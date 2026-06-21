import { NextRequest, NextResponse } from "next/server"
import { normalizePhone } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/server"

// OTP rate limits (per spec): per phone number, with IP as a secondary guard.
const COOLDOWN_SECONDS = 60
const MAX_PER_HOUR = 5
const MAX_PER_DAY = 20
const MAX_PER_IP_PER_HOUR = 15 // looser cross-number guard

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return request.headers.get("x-real-ip")
}

export async function POST(request: NextRequest) {
  const { phone, purpose } = await request.json()

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  const ip = clientIp(request)
  const apiKey = process.env.TWO_FACTOR_API_KEY

  // Rate limiting + duplicate-account checks use the service role (bypasses RLS).
  let admin: Awaited<ReturnType<typeof createAdminClient>> | null = null
  try {
    admin = await createAdminClient()
  } catch {
    admin = null
  }

  if (admin) {
    // Block signing up with a number that is already registered.
    if (purpose === "signup") {
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", normalized)
        .maybeSingle()
      if (existing) {
        return NextResponse.json(
          { error: "This number is already registered. Please log in instead." },
          { status: 409 },
        )
      }
    }

    const now = Date.now()
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString()
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const cooldownAgo = new Date(now - COOLDOWN_SECONDS * 1000).toISOString()

    const [{ count: lastMinute }, { count: hourCount }, { count: dayCount }, { count: ipHourCount }] =
      await Promise.all([
        admin.from("otp_requests").select("id", { count: "exact", head: true })
          .eq("phone", normalized).gt("created_at", cooldownAgo),
        admin.from("otp_requests").select("id", { count: "exact", head: true })
          .eq("phone", normalized).gt("created_at", hourAgo),
        admin.from("otp_requests").select("id", { count: "exact", head: true })
          .eq("phone", normalized).gt("created_at", dayAgo),
        ip
          ? admin.from("otp_requests").select("id", { count: "exact", head: true })
              .eq("ip", ip).gt("created_at", hourAgo)
          : Promise.resolve({ count: 0 }),
      ])

    if ((lastMinute ?? 0) > 0) {
      return NextResponse.json(
        { error: `Please wait ${COOLDOWN_SECONDS} seconds before requesting another OTP.` },
        { status: 429 },
      )
    }
    if ((hourCount ?? 0) >= MAX_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again in an hour." },
        { status: 429 },
      )
    }
    if ((dayCount ?? 0) >= MAX_PER_DAY) {
      return NextResponse.json(
        { error: "Daily OTP limit reached. Please try again tomorrow." },
        { status: 429 },
      )
    }
    if ((ipHourCount ?? 0) >= MAX_PER_IP_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many OTP requests from this device. Please try again later." },
        { status: 429 },
      )
    }

    // Record this request before sending.
    await admin.from("otp_requests").insert({ phone: normalized, ip })
  }

  if (!apiKey || apiKey === "your_2factor_api_key_here") {
    // Dev mode: return a fake session
    return NextResponse.json({ sessionId: "dev-session", dev: true })
  }

  try {
    const res = await fetch(
      `https://2factor.in/API/V1/${apiKey}/SMS/${normalized}/AUTOGEN`,
      { method: "GET" }
    )
    const data = await res.json()

    if (data.Status !== "Success") {
      return NextResponse.json({ error: "Failed to send OTP. Try again." }, { status: 500 })
    }

    return NextResponse.json({ sessionId: data.Details })
  } catch {
    return NextResponse.json({ error: "Failed to send OTP. Try again." }, { status: 500 })
  }
}
