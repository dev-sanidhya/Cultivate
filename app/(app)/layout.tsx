import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BottomNav } from "@/components/ui/BottomNav"
import { AppHeader } from "@/components/ui/AppHeader"
import { VisitTracker } from "@/components/VisitTracker"
import { ExpiryNotifier } from "@/components/ExpiryNotifier"
import { DesktopSidebarNav } from "@/components/ui/DesktopSidebarNav"

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
    <div className="app-shell">
      <DesktopSidebarNav />
      <div className="app-content-frame">
        <VisitTracker userId={user.id} />
        <ExpiryNotifier userId={user.id} />
        <AppHeader profile={profile} />
        <main className="app-main">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
