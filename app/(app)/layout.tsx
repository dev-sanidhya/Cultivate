import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BottomNav } from "@/components/ui/BottomNav"
import { AppHeader } from "@/components/ui/AppHeader"
import { VisitTracker } from "@/components/VisitTracker"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/signup")

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>
        <VisitTracker userId={user.id} />
        <AppHeader profile={profile} />
        <main style={{ paddingTop: 64 }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
