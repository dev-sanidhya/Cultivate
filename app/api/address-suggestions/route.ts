import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const field = searchParams.get("field")
  const q = searchParams.get("q") ?? ""

  if (!type || !field) {
    return NextResponse.json({ suggestions: [] })
  }

  const normalizedQuery = q.trim().toLowerCase()
  if (!normalizedQuery) {
    return NextResponse.json({ suggestions: [] })
  }

  let supabase
  try {
    supabase = await createAdminClient()
  } catch {
    supabase = await createClient()
  }

  const { data, error } = await supabase
    .from("cards")
    .select("tagged_address")

  if (error) {
    return NextResponse.json({ suggestions: [] })
  }

  const counts = new Map<string, number>()

  for (const row of data ?? []) {
    const taggedAddress = row.tagged_address as Record<string, unknown> | null
    if (!taggedAddress || taggedAddress.type !== type) continue

    const rawValue = taggedAddress[field]
    if (typeof rawValue !== "string") continue

    const value = rawValue.trim()
    if (!value || !value.toLowerCase().startsWith(normalizedQuery)) continue

    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  const suggestions = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([value]) => value)

  return NextResponse.json({ suggestions })
}
