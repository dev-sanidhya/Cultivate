"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { runExpiryNotifications } from "@/lib/expiryNotifications"

/**
 * Lazily generates expiry notifications (prioritization + chat unlock) on app load.
 * No cron: this runs once per mount for the signed-in user.
 */
export function ExpiryNotifier({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient()
    runExpiryNotifications(supabase, userId).catch((error) => {
      console.error("Failed to run expiry notifications", error)
    })
  }, [userId])

  return null
}
