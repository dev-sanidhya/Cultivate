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
    void adjustCardMetric(supabase, cardId, "view_count", 1)
  }, [cardId])

  return null
}
