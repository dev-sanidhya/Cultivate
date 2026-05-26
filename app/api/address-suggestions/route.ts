import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const field = searchParams.get("field")
  const q = searchParams.get("q") ?? ""

  if (!type || !field) {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from("tagged_address_suggestions")
    .select("value")
    .eq("address_type", type)
    .eq("field_name", field)
    .ilike("value", `${q}%`)
    .order("count", { ascending: false })
    .limit(5)

  return NextResponse.json({ suggestions: data?.map((d) => d.value) ?? [] })
}
