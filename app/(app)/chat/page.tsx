"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { timeAgo } from "@/lib/utils/format"
import { getChatCardsForViewer, type ChatCardRelation } from "@/lib/chat"
import type { Chat, Profile, Card, Message } from "@/types"

interface ChatListItem {
  chat: Chat
  otherProfile: Profile
  theirCard: Card | null
  lastMessage: Message | null
  unread: number
}

export default function ChatPage() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatListItem[]>([])
  const [loading, setLoading] = useState(true)

  async function loadChats() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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

    const items: ChatListItem[] = []
    for (const chat of chatData ?? []) {
      const otherProfile = ((chat.initiator_id === user.id ? chat.recipient : chat.initiator) ?? null) as Profile | null
      const { theirCard } = getChatCardsForViewer(chat as ChatCardRelation, user.id)

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

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
        lastMessage: lastMsg ?? null,
        unread: 0,
      })
    }

    setChats(items)
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadChats()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div className="page-container">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginBottom: 12 }}>Messages</h1>
      </div>

      {chats.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>No messages yet</h3>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            Find someone on Search and start a conversation.
          </p>
        </div>
      ) : (
        <div>
          {chats.map(({ chat, otherProfile, theirCard, lastMessage }) => (
            <div
              key={chat.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/chat/${chat.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  router.push(`/chat/${chat.id}`)
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 20px",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--color-border-light)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s",
                outline: "none",
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
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>
                    #{theirCard?.card_id ?? "-"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      fontWeight: 600,
                      background: "var(--color-border-light)",
                      padding: "4px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {theirCard?.looking_for}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {lastMessage?.content ?? "No messages yet"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      marginTop: 1,
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
    </div>
  )
}
