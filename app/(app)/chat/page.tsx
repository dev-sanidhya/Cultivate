"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { timeAgo } from "@/lib/utils/format"
import type { Chat, Profile, Card, Message } from "@/types"
import { MessageCircle } from "lucide-react"

interface ChatListItem {
  chat: Chat
  otherProfile: Profile
  otherCard: Card
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

    const { data: chatData } = await supabase
      .from("chats")
      .select(`
        *,
        initiator:initiator_id(id, first_name, last_name, photo_url),
        recipient:recipient_id(id, first_name, last_name, photo_url),
        initiator_card:initiator_card_id(id, card_id, looking_for),
        recipient_card:recipient_card_id(id, card_id, looking_for)
      `)
      .or(`initiator_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })

    const items: ChatListItem[] = []
    for (const chat of chatData ?? []) {
      const isInitiator = chat.initiator_id === user!.id
      const otherProfile = (isInitiator ? chat.recipient : chat.initiator) as unknown as Profile
      const otherCard = (isInitiator ? chat.recipient_card : chat.initiator_card) as unknown as Card

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      items.push({
        chat,
        otherProfile,
        otherCard,
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
          {chats.map(({ chat, otherProfile, otherCard, lastMessage, unread }) => (
            <button
              key={chat.id}
              onClick={() => router.push(`/chat/${chat.id}`)}
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
              }}
            >
              <Avatar
                name={`${otherProfile?.first_name ?? ""} ${otherProfile?.last_name ?? ""}`}
                photoUrl={otherProfile?.photo_url}
                size={48}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/card/${otherCard?.card_id}`) }}
                    style={{
                      fontSize: 14, fontWeight: 700, color: "var(--color-primary)",
                      background: "var(--color-primary-bg)", border: "none",
                      padding: "2px 8px", borderRadius: 20, cursor: "pointer",
                    }}
                  >
                    #{otherCard?.card_id}
                  </button>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {lastMessage ? timeAgo(lastMessage.created_at) : ""}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {lastMessage?.content ?? "No messages yet"}
                  </span>
                  <span style={{
                    fontSize: 11, color: "var(--color-accent)", fontWeight: 600,
                    marginLeft: 8, background: "var(--color-accent-bg)", padding: "1px 6px", borderRadius: 10,
                  }}>
                    {otherCard?.looking_for}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
