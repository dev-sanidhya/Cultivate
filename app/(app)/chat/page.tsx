"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { PopupModal } from "@/components/ui/PopupModal"
import { timeAgo } from "@/lib/utils/format"
import { getChatCardsForViewer, type ChatCardRelation } from "@/lib/chat"
import { markChatAsRead } from "@/lib/badges"
import type { Chat, ChatUnlock, Profile, Card, Message } from "@/types"

interface ChatListItem {
  chat: Chat
  otherProfile: Profile
  theirCard: Card | null
  lastMessage: Message | null
  unread: number
  canOpen: boolean
}

export default function ChatPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [chats, setChats] = useState<ChatListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [unlockPrompt, setUnlockPrompt] = useState<{
    open: boolean
    lookingForCategory: string
  }>({
    open: false,
    lookingForCategory: "",
  })

  type ChatRow = Chat & ChatCardRelation & {
    initiator: Profile | null
    recipient: Profile | null
  }

  const loadChats = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserId(user.id)

    const { data: chatData } = await supabase
      .from("chats")
      .select(`
        *,
        initiator:initiator_id(id, first_name, last_name, photo_url),
        recipient:recipient_id(id, first_name, last_name, photo_url),
        initiator_card:initiator_card_id(id, card_id, looking_for),
        recipient_card:recipient_card_id(id, card_id, looking_for)
      `)
      .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })

    const chatRows = (chatData ?? []) as ChatRow[]

    if (chatRows.length === 0) {
      setChats([])
      setLoading(false)
      return
    }

    const chatIds = chatRows.map((chat) => chat.id)
    const [{ data: messagesData }, { data: readsData }, { data: unlocksData }] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("chat_reads")
        .select("chat_id, last_read_at")
        .eq("user_id", user.id),
      supabase
        .from("chat_unlocks")
        .select("looking_for_category, expires_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString()),
    ])

    const latestMessageByChat = new Map<string, Message>()
    const unreadCountByChat = new Map<string, number>()
    const lastReadByChat = new Map<string, string | null>()
    const activeUnlockCategories = new Set(
      ((unlocksData ?? []) as ChatUnlock[]).map((unlock) => unlock.looking_for_category),
    )

    for (const read of (readsData ?? []) as { chat_id: string; last_read_at: string | null }[]) {
      lastReadByChat.set(read.chat_id, read.last_read_at)
    }

    for (const message of (messagesData ?? []) as Message[]) {
      if (!latestMessageByChat.has(message.chat_id)) {
        latestMessageByChat.set(message.chat_id, message)
      }

      const lastReadAt = lastReadByChat.get(message.chat_id)
      if (
        message.sender_id !== user.id &&
        (!lastReadAt || new Date(message.created_at) > new Date(lastReadAt))
      ) {
        unreadCountByChat.set(message.chat_id, (unreadCountByChat.get(message.chat_id) ?? 0) + 1)
      }
    }

    const items: ChatListItem[] = []
    for (const chat of chatRows) {
      const otherProfile = ((chat.initiator_id === user.id ? chat.recipient : chat.initiator) ?? null) as Profile | null
      const { theirCard } = getChatCardsForViewer(chat as ChatCardRelation, user.id)

      items.push({
        chat,
        otherProfile: otherProfile ?? {
          id: "",
          phone: "",
          first_name: "",
          last_name: "",
          gender: "other",
          date_of_birth: "",
          photo_url: null,
          contact_detail_warning_count: 0,
          contact_penalty_paid_at: null,
          created_at: "",
        },
        theirCard,
        lastMessage: latestMessageByChat.get(chat.id) ?? null,
        unread: unreadCountByChat.get(chat.id) ?? 0,
        canOpen: activeUnlockCategories.has(chat.looking_for_category),
      })
    }

    items.sort((a, b) => {
      const aTime = new Date(a.lastMessage?.created_at ?? a.chat.last_message_at ?? a.chat.created_at).getTime()
      const bTime = new Date(b.lastMessage?.created_at ?? b.chat.last_message_at ?? b.chat.created_at).getTime()
      return bTime - aTime
    })

    setChats(items)
    setLoading(false)
  }, [])

  const openChat = useCallback(
    async (chatId: string, lastMessageAt?: string | null, canOpen = true, lookingForCategory = "") => {
      if (!canOpen) {
        setUnlockPrompt({
          open: true,
          lookingForCategory,
        })
        return
      }

      if (userId) {
        const supabase = createClient()
        await markChatAsRead(supabase, chatId, userId, lastMessageAt ?? new Date().toISOString())
      }

      router.push(`/chat/${chatId}`)
    },
    [router, userId],
  )

  useEffect(() => {
    if (pathname !== "/chat") return

    const timeoutId = setTimeout(() => {
      void loadChats()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [loadChats, pathname])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-list:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void loadChats()
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads", filter: `user_id=eq.${userId}` },
        () => {
          void loadChats()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadChats, userId])

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div className="page-container" style={{ paddingBottom: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginBottom: 12 }}>Messages</h1>
      </div>

      {chats.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>ðŸ’¬</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>No messages yet</h3>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            Find someone on Search and start a conversation.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
          {chats.map(({ chat, otherProfile, theirCard, lastMessage, unread, canOpen }) => (
            <div
              key={chat.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                void openChat(chat.id, lastMessage?.created_at, canOpen, chat.looking_for_category)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  void openChat(chat.id, lastMessage?.created_at, canOpen, chat.looking_for_category)
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 14,
                background: "var(--color-surface)",
                borderRadius: 18,
                boxShadow: "0 2px 10px rgba(124, 58, 237, 0.08)",
                cursor: canOpen ? "pointer" : "not-allowed",
                textAlign: "left",
                transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                outline: "none",
                opacity: canOpen ? 1 : 0.88,
                overflow: "hidden",
              }}
            >
              <Avatar
                name={theirCard?.card_id ?? ""}
                photoUrl={otherProfile?.photo_url}
                size={48}
                initialsOverride={theirCard?.card_id?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "--"}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  {theirCard?.card_id ? (
                    <Link
                      href={`/card/${theirCard.card_id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        color: "var(--color-primary)",
                        background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(236,72,153,0.12))",
                        border: "1px solid rgba(124,58,237,0.14)",
                        padding: "3px 10px",
                        borderRadius: 999,
                        textDecoration: "none",
                        boxShadow: "0 1px 2px rgba(109, 40, 217, 0.04)",
                      }}
                      aria-label={`Open card ${theirCard.card_id}`}
                      title={`Open card ${theirCard.card_id}`}
                    >
                      #{theirCard.card_id}
                    </Link>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        color: "var(--color-text-muted)",
                        background: "var(--color-border-light)",
                        padding: "5px 10px",
                        borderRadius: 999,
                      }}
                    >
                      #-
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-primary)",
                      fontWeight: 600,
                      background: "var(--color-primary-bg)",
                      border: "1px solid var(--color-border)",
                      padding: "4px 8px",
                      borderRadius: 999,
                      flexShrink: 0,
                    }}
                  >
                    {theirCard?.looking_for}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: unread > 0 ? "var(--color-primary)" : "var(--color-text-secondary)",
                      fontWeight: unread > 0 ? 700 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      paddingRight: 8,
                    }}
                  >
                    {unread > 0
                      ? `${unread} New message${unread === 1 ? "" : "s"}`
                      : lastMessage?.content ?? "No messages yet"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      marginTop: 1,
                      background: "rgba(255,255,255,0.7)",
                      padding: "2px 6px",
                      borderRadius: 999,
                    }}
                  >
                    {lastMessage ? timeAgo(lastMessage.created_at) : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PopupModal
        open={unlockPrompt.open}
        title="Unlock chat first"
        message={
          <>
            This conversation is locked until you unlock chat for the <strong>{unlockPrompt.lookingForCategory}</strong> category.
          </>
        }
        confirmLabel="Go to cards"
        onConfirm={() => {
          setUnlockPrompt({ open: false, lookingForCategory: "" })
          router.push("/cards")
        }}
        onClose={() => setUnlockPrompt({ open: false, lookingForCategory: "" })}
        tone="warning"
      />
    </div>
  )
}
