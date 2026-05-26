"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const VISIT_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

export function VisitTracker({ userId }: { userId: string }) {
  useEffect(() => {
    const lastVisit = localStorage.getItem("last_visit")
    const now = Date.now()

    if (!lastVisit || now - parseInt(lastVisit) > VISIT_THRESHOLD_MS) {
      localStorage.setItem("last_visit", now.toString())
      const supabase = createClient()
      supabase.from("visit_logs").insert({ user_id: userId }).then(() => {})
    }
  }, [userId])

  return null
}
