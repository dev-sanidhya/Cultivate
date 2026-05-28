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
  myCard: Card | null
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
      const { myCard, theirCard } = getChatCardsForViewer(chat as ChatCardRelation, user.id)

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
        myCard,
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
    <div style={{ paddingTop: 24 }}>
      <div className="page-container">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginBottom: 20 }}>Messages</h1>
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
          {chats.map(({ chat, otherProfile, myCard, theirCard, lastMessage }) => (
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
                name={`${otherProfile?.first_name ?? ""} ${otherProfile?.last_name ?? ""}`}
                photoUrl={otherProfile?.photo_url}
                size={48}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>
                    {otherProfile?.first_name} {otherProfile?.last_name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {lastMessage ? timeAgo(lastMessage.created_at) : ""}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
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
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-primary)",
                      fontWeight: 700,
                      background: "var(--color-primary-bg)",
                      padding: "4px 8px",
                      borderRadius: 999,
                    }}
                  >
                    My card #{myCard?.card_id ?? "-"}
                  </span>
                  <button
                    disabled={!theirCard?.card_id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (theirCard?.card_id) router.push(`/card/${theirCard.card_id}`)
                    }}
                    style={{
                      fontSize: 11,
                      color: "var(--color-accent)",
                      fontWeight: 700,
                      background: "var(--color-accent-bg)",
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      opacity: theirCard?.card_id ? 1 : 0.5,
                    }}
                  >
                    Their card #{theirCard?.card_id ?? "-"}
                  </button>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      fontWeight: 600,
                      marginLeft: "auto",
                      background: "var(--color-border-light)",
                      padding: "4px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {theirCard?.looking_for}
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
