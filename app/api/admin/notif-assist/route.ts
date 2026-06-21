import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

// Eligibility window: users whose active offer expires between 7h and 4h from now.
const MIN_HOURS = 4
const MAX_HOURS = 7

interface EligibleUser {
  user_id: string
  phone: string
  first_name: string
  last_name: string
  offer_type: string
  expires_at: string
  count: number
}

async function computeEligible(admin: Awaited<ReturnType<typeof createAdminClient>>): Promise<EligibleUser[]> {
  const now = Date.now()
  const windowStart = new Date(now + MIN_HOURS * 3600000).toISOString() // >= 4h remaining
  const windowEnd = new Date(now + MAX_HOURS * 3600000).toISOString()   // <= 7h remaining

  // Per-user offer windows (welcome / card_creation) expiring within the window.
  const { data: userOffers } = await admin
    .from("user_offers")
    .select("user_id, offer_type, expires_at, profile:profiles(id, phone, first_name, last_name)")
    .gte("expires_at", windowStart)
    .lte("expires_at", windowEnd)

  const rows = (userOffers ?? []) as unknown as {
    user_id: string
    offer_type: string
    expires_at: string
    profile: { id: string; phone: string; first_name: string; last_name: string } | { id: string; phone: string; first_name: string; last_name: string }[] | null
  }[]

  // Reconcile notification counts: keep only eligible users.
  const eligibleIds = rows.map((r) => r.user_id)
  const { data: countData } = await admin.from("notification_assist_counts").select("user_id, count")
  const countMap = new Map<string, number>((countData ?? []).map((c) => [c.user_id, c.count]))

  const staleIds = [...countMap.keys()].filter((id) => !eligibleIds.includes(id))
  if (staleIds.length > 0) {
    await admin.from("notification_assist_counts").delete().in("user_id", staleIds)
  }

  return rows.map((r) => {
    const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile
    return {
      user_id: r.user_id,
      phone: profile?.phone ?? "",
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      offer_type: r.offer_type,
      expires_at: r.expires_at,
      count: countMap.get(r.user_id) ?? 0,
    }
  })
}

export async function GET() {
  let admin
  try {
    admin = await createAdminClient()
  } catch {
    return NextResponse.json({ users: [] })
  }
  const users = await computeEligible(admin)
  return NextResponse.json({ users })
}

// Bulk adjust the notification count for all currently-eligible users (+1 / -1).
export async function POST(request: NextRequest) {
  const { delta } = await request.json()
  let admin
  try {
    admin = await createAdminClient()
  } catch {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }

  const users = await computeEligible(admin)
  const d = delta > 0 ? 1 : -1
  const rows = users.map((u) => ({ user_id: u.user_id, count: Math.max((u.count ?? 0) + d, 0), updated_at: new Date().toISOString() }))
  if (rows.length > 0) {
    await admin.from("notification_assist_counts").upsert(rows, { onConflict: "user_id" })
  }
  return NextResponse.json({ users: await computeEligible(admin) })
}
