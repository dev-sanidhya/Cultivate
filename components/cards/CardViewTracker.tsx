"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { adjustCardMetric } from "@/lib/cardMetrics"

export function CardViewTracker({ cardId }: { cardId: string }) {
  const hasTrackedRef = useRef(false)

  useEffect(() => {
    if (hasTrackedRef.current) return
    hasTrackedRef.current = true

    const supabase = createClient()
    // Supabase query builders are lazy: the request is only sent when the
    // builder is awaited or `.then()` is called. A bare `void` never fires it.
    adjustCardMetric(supabase, cardId, "view_count", 1).then(({ error }) => {
      if (error) console.error("Failed to track card view", error)
    })
  }, [cardId])

  return null
}
