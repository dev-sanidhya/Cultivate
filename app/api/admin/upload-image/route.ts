import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

// Uploads an image to the public `banners` bucket and returns its public URL.
// Used by admin tooling (Offers + Home Banners), which has no Supabase auth
// session, so this runs with the service role.
export async function POST(request: NextRequest) {
  const form = await request.formData()
  const file = form.get("file")
  const folder = (form.get("folder") as string | null) ?? "misc"

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 })
  }

  let admin
  try {
    admin = await createAdminClient()
  } catch {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 })
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await admin.storage.from("banners").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = admin.storage.from("banners").getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
