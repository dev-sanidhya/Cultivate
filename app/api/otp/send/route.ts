import { NextRequest, NextResponse } from "next/server"
import { normalizePhone } from "@/lib/utils/auth"

export async function POST(request: NextRequest) {
  const { phone } = await request.json()

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  const apiKey = process.env.TWO_FACTOR_API_KEY

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
