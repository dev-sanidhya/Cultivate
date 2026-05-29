import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { hasSupabaseConfig } from "./lib/supabase/mock"

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/card"]

function hasValidSupabaseConfig() {
  return (
    hasSupabaseConfig() &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0) >= 20
  )
}

export async function proxy(request: NextRequest) {
  if (!hasValidSupabaseConfig()) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  let supabase
  try {
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )
  } catch {
    return NextResponse.next()
  }

  let user = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    return NextResponse.next()
  }

  const path = request.nextUrl.pathname

  // Redirect signed-in users away from /login.
  // Keep /signup accessible for signed-in users who still need profile completion.
  if (user && path.startsWith("/login")) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  if (user && path.startsWith("/signup")) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      if (profile) {
        return NextResponse.redirect(new URL("/home", request.url))
      }
    } catch {
      return supabaseResponse
    }
  }

  // Protect app routes
  const isPublic =
    PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + "/")) ||
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/admin")

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Admin routes are protected separately via admin layout
  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
