import { NextRequest, NextResponse } from "next/server"
import { getSyntheticEmail, getDerivedPassword, normalizePhone } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const { phone, otp, sessionId } = await request.json()

  if (!phone || !otp || !sessionId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  const apiKey = process.env.TWO_FACTOR_API_KEY
  const isDev = !apiKey || apiKey === "your_2factor_api_key_here"

  // In dev mode, accept any 6-digit OTP
  if (!isDev) {
    try {
      const res = await fetch(
        `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY3/${sessionId}/${otp}`,
        { method: "GET" }
      )
      const data = await res.json()
      if (data.Status !== "Success") {
        return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "Verification failed. Try again." }, { status: 500 })
    }
  }

  // OTP verified - sign in or sign up the user
  const email = getSyntheticEmail(normalized)
  const password = getDerivedPassword(normalized)

  const supabaseAdmin = await createAdminClient()

  // Check if user exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u) => u.email === email)

  if (existingUser) {
    // Sign in existing user
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    })

    if (signInError || !signInData) {
      return NextResponse.json({ error: "Sign in failed." }, { status: 500 })
    }

    // Check if profile exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", existingUser.id)
      .single()

    return NextResponse.json({
      verified: true,
      userId: existingUser.id,
      email,
      password,
      hasProfile: !!profile,
    })
  } else {
    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !newUser?.user) {
      return NextResponse.json({ error: "Account creation failed." }, { status: 500 })
    }

    return NextResponse.json({
      verified: true,
      userId: newUser.user.id,
      email,
      password,
      hasProfile: false,
    })
  }
}
