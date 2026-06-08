import type { SupabaseClient } from "@supabase/supabase-js"

export type CardMetricField = "view_count" | "like_count" | "save_count"

export interface OwnCardMetricRow {
  card_id: string
  view_count: number
  like_count: number
  save_count: number
}

export function adjustCardMetric(
  supabase: SupabaseClient,
  cardId: string,
  metric: CardMetricField,
  delta: number,
) {
  return supabase.rpc("adjust_card_metric", {
    p_card_id: cardId,
    p_metric: metric,
    p_delta: delta,
  })
}

export function fetchOwnCardMetrics(supabase: SupabaseClient) {
  return supabase.rpc("get_own_card_metrics")
}

/** Bump view counters unless the authenticated viewer owns the card. */
export function recordCardView(supabase: SupabaseClient, cardId: string) {
  return supabase.rpc("record_card_view", { p_card_id: cardId })
}
