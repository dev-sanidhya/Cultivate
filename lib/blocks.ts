import type { SupabaseClient } from "@supabase/supabase-js"
import type { UserBlock } from "@/types"

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">

function isMissingUserBlocksTableError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : ""

  return message.includes("user_blocks") && (message.includes("schema cache") || message.includes("Could not find the table"))
}

export interface ConversationBlockStatus {
  blockedByMe: boolean
  blockedByOther: boolean
}

export async function getConversationBlockStatus(
  supabase: SupabaseLike,
  params: { userId: string; otherUserId: string },
) {
  if (!params.userId || !params.otherUserId) {
    return {
      blockedByMe: false,
      blockedByOther: false,
    }
  }

  const { data, error } = await supabase.rpc("can_contact_user", {
    p_other_user_id: params.otherUserId,
  })

  if (error) {
    if (isMissingUserBlocksTableError(error)) {
      return {
        blockedByMe: false,
        blockedByOther: false,
      }
    }
    throw error
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    blockedByMe: Boolean((row as { blocked_by_me?: boolean } | null)?.blocked_by_me),
    blockedByOther: Boolean((row as { blocked_by_other?: boolean } | null)?.blocked_by_other),
  }
}

export async function blockUser(
  supabase: SupabaseLike,
  params: { blockerId: string; blockedUserId: string; blockedCardId: string },
) {
  const { error: upsertError } = await supabase
    .from("user_blocks")
    .upsert(
      {
        blocker_id: params.blockerId,
        blocked_user_id: params.blockedUserId,
        blocked_card_id: params.blockedCardId,
      },
      { onConflict: "blocker_id,blocked_user_id" },
    )

  if (upsertError) {
    if (isMissingUserBlocksTableError(upsertError)) {
      throw new Error("The block feature database migration has not been applied yet. Run `supabase/user-blocks-migration.sql` in Supabase SQL Editor.")
    }
    throw upsertError
  }

  const { error: deleteError } = await supabase
    .from("chats")
    .delete()
    .or(
      `and(initiator_id.eq.${params.blockerId},recipient_id.eq.${params.blockedUserId}),and(initiator_id.eq.${params.blockedUserId},recipient_id.eq.${params.blockerId})`,
    )

  if (deleteError) {
    if (isMissingUserBlocksTableError(deleteError)) {
      throw new Error("The block feature database migration has not been applied yet. Run `supabase/user-blocks-migration.sql` in Supabase SQL Editor.")
    }
    throw deleteError
  }
}

export async function fetchBlockedUsers(supabase: SupabaseLike, blockerId: string) {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("*")
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false })

  if (error) {
    if (isMissingUserBlocksTableError(error)) {
      return []
    }
    throw error
  }
  return (data ?? []) as UserBlock[]
}

export async function unblockUser(
  supabase: SupabaseLike,
  params: { blockerId: string; blockedUserId: string },
) {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", params.blockerId)
    .eq("blocked_user_id", params.blockedUserId)

  if (error) {
    if (isMissingUserBlocksTableError(error)) {
      throw new Error("The block feature database migration has not been applied yet. Run `supabase/user-blocks-migration.sql` in Supabase SQL Editor.")
    }
    throw error
  }
}
