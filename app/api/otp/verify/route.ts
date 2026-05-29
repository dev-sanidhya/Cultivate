import { NextRequest, NextResponse } from "next/server"
import { getSyntheticEmail, getDerivedPassword, normalizePhone } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/server"

async function findUserByEmail(
  supabaseAdmin: Awaited<ReturnType<typeof createAdminClient>>,
  email: string
) {
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) return null

    const user = data.users.find((u) => u.email === email)
    if (user) return user

    if (data.users.length < perPage) return null
    page += 1
  }
}

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

  try {
    const supabaseAdmin = await createAdminClient()

    // Try create first. If the user already exists, resolve them as an existing user.
    let newUser
    let createError = null
    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      newUser = result.data
      createError = result.error
    } catch {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable. Please try again." },
        { status: 503 },
      )
    }

    if (!createError && newUser?.user) {
      return NextResponse.json({
        verified: true,
        userId: newUser.user.id,
        email,
        password,
        hasProfile: false,
      })
    }

    const duplicateEmail =
      createError?.message?.toLowerCase().includes("already") ||
      createError?.message?.toLowerCase().includes("registered")

    if (!duplicateEmail) {
      return NextResponse.json({ error: createError?.message || "Account creation failed." }, { status: 500 })
    }

    const existingUser = await findUserByEmail(supabaseAdmin, email)
    if (!existingUser) {
      return NextResponse.json({ error: "Sign in failed." }, { status: 500 })
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", existingUser.id)
      .maybeSingle()

    return NextResponse.json({
      verified: true,
      userId: existingUser.id,
      email,
      password,
      hasProfile: !!profile,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed. Try again."
    if (message.toLowerCase().includes("supabase admin is not configured")) {
      return NextResponse.json(
        { error: "Authentication service is not configured in this environment." },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
