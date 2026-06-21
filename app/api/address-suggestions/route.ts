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

  // Query the pre-aggregated, indexed suggestions table (prefix match on the
  // trigram-indexed `value`) instead of scanning every card on each keystroke.
  const prefix = normalizedQuery.replace(/[%_\\]/g, (m) => `\\${m}`)
  const { data, error } = await supabase
    .from("tagged_address_suggestions")
    .select("value, count")
    .eq("address_type", type)
    .eq("field_name", field)
    .ilike("value", `${prefix}%`)
    .order("count", { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ suggestions: [] })
  }

  const suggestions = ((data ?? []) as { value: string }[]).map((row) => row.value)
  return NextResponse.json({ suggestions })
}
