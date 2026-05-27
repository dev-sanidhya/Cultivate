import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createMockSupabaseClient, hasSupabaseConfig } from "./mock"

export async function createClient() {
  if (!hasSupabaseConfig()) {
    return createMockSupabaseClient()
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceRoleMissing =
    !serviceRoleKey || serviceRoleKey === "your_service_role_key_here"

  if (!hasSupabaseConfig() || serviceRoleMissing) {
    throw new Error("Supabase admin is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and a real SUPABASE_SERVICE_ROLE_KEY to use OTP account creation/sign-in.")
  }

  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
