import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrioritizationType } from "@/types"

type SupabaseLike = Pick<SupabaseClient, "from">

export type ActivePrioritization = {
  plan_type: PrioritizationType
  created_at: string
}

export type PrioritizationByCard = Record<string, ActivePrioritization>

export async function fetchActivePrioritizationsForCards(
  supabase: SupabaseLike,
  cardIds: string[],
): Promise<PrioritizationByCard> {
  if (cardIds.length === 0) return {}

  const { data } = await supabase
    .from("card_prioritizations")
    .select("card_id, plan_type, created_at")
    .in("card_id", cardIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  const priorityMap: PrioritizationByCard = {}

  for (const row of (data ?? []) as { card_id: string; plan_type: PrioritizationType; created_at: string }[]) {
    const existing = priorityMap[row.card_id]
    // Prefer S over N for the badge; keep the most recent prioritization time.
    if (!existing || (existing.plan_type !== "S" && row.plan_type === "S")) {
      priorityMap[row.card_id] = { plan_type: row.plan_type, created_at: row.created_at }
    }
  }

  return priorityMap
}
