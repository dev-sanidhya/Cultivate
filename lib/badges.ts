import type { SupabaseClient } from "@supabase/supabase-js"

type SupabaseLike = Pick<SupabaseClient, "from">

interface ChatRow {
  id: string
  initiator_id: string
  recipient_id: string
}

interface ChatReadRow {
  chat_id: string
  last_read_at: string | null
}

interface MessageRow {
  chat_id: string
  sender_id: string
  created_at: string
}

export async function fetchUnreadNotificationCount(supabase: SupabaseLike, userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) throw error
  return count ?? 0
}

export async function fetchUnreadChatCount(supabase: SupabaseLike, userId: string) {
  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select("id, initiator_id, recipient_id")
    .or(`initiator_id.eq.${userId},recipient_id.eq.${userId}`)

  if (chatsError) throw chatsError

  const chatRows = (chats ?? []) as ChatRow[]
  if (chatRows.length === 0) return 0

  const chatIds = chatRows.map((chat) => chat.id)

  const [{ data: messages, error: messagesError }, { data: reads, error: readsError }] = await Promise.all([
    supabase
      .from("messages")
      .select("chat_id, sender_id, created_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("chat_reads")
      .select("chat_id, last_read_at")
      .eq("user_id", userId),
  ])

  if (messagesError) throw messagesError
  if (readsError) throw readsError

  const latestMessageByChat = new Map<string, MessageRow>()
  for (const message of (messages ?? []) as MessageRow[]) {
    if (!latestMessageByChat.has(message.chat_id)) {
      latestMessageByChat.set(message.chat_id, message)
    }
  }

  const lastReadByChat = new Map<string, string | null>()
  for (const read of (reads ?? []) as ChatReadRow[]) {
    lastReadByChat.set(read.chat_id, read.last_read_at)
  }

  let unreadCount = 0
  for (const chat of chatRows) {
    const latestMessage = latestMessageByChat.get(chat.id)
    if (!latestMessage || latestMessage.sender_id === userId) continue

    const lastReadAt = lastReadByChat.get(chat.id)
    if (!lastReadAt || new Date(latestMessage.created_at) > new Date(lastReadAt)) {
      unreadCount += 1
    }
  }

  return unreadCount
}

export async function markChatAsRead(
  supabase: SupabaseLike,
  chatId: string,
  userId: string,
  lastReadAt = new Date().toISOString(),
) {
  const { error } = await supabase.from("chat_reads").upsert(
    {
      chat_id: chatId,
      user_id: userId,
      last_read_at: lastReadAt,
    },
    {
      onConflict: "chat_id,user_id",
    },
  )

  if (error) throw error
}
