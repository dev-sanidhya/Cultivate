"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Send, Lock } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { timeAgo } from "@/lib/utils/format"
import type { Message, Profile, Card, ChatUnlock } from "@/types"

export default function ChatConversationPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState("")
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [otherCard, setOtherCard] = useState<Card | null>(null)
  const [chatUnlock, setChatUnlock] = useState<ChatUnlock | null>(null)
  const [canReply, setCanReply] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lookingForCategory, setLookingForCategory] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload: { new: Message }) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId])

  async function loadChat() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user!.id)

    const { data: chat } = await supabase
      .from("chats")
      .select(`
        *,
        initiator:initiator_id(id, first_name, last_name, photo_url, gender, date_of_birth, phone),
        recipient:recipient_id(id, first_name, last_name, photo_url, gender, date_of_birth, phone),
        recipient_card:recipient_card_id(*)
      `)
      .eq("id", chatId)
      .single()

    if (!chat) { router.push("/chat"); return }

    const isInitiator = chat.initiator_id === user!.id
    const other = (isInitiator ? chat.recipient : chat.initiator) as unknown as Profile
    const card = chat.recipient_card as unknown as Card

    setOtherProfile(other)
    setOtherCard(card)
    setLookingForCategory(chat.looking_for_category)

    // Check if user has chat unlock
    const { data: unlock } = await supabase
      .from("chat_unlocks")
      .select("*")
      .eq("user_id", user!.id)
      .eq("looking_for_category", chat.looking_for_category)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single()

    setChatUnlock(unlock ?? null)
    setCanReply(!!unlock)

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })

    setMessages(msgs ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadChat()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [chatId])

  async function sendMessage() {
    if (!newMessage.trim()) return
    if (!canReply) {
      toast.error("Unlock chat to send messages")
      return
    }

    // Check 3-message rule
    const myMessages = messages.filter((m) => m.sender_id === userId)
    const otherMessages = messages.filter((m) => m.sender_id !== userId)
    if (myMessages.length >= 3 && otherMessages.length === 0) {
      toast.error("You can only send 3 messages until the other person replies.")
      return
    }

    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: userId,
      content: newMessage.trim(),
    })

    if (!error) {
      await supabase.from("chats").update({
        last_message_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      }).eq("id", chatId)
      setNewMessage("")
    } else {
      toast.error("Failed to send message")
    }
    setSending(false)
  }

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>Loading...</div>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--color-bg)" }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button className="btn-ghost" onClick={() => router.push("/chat")}>
          <ArrowLeft size={20} />
        </button>
        <Avatar
          name={`${otherProfile?.first_name} ${otherProfile?.last_name}`}
          photoUrl={otherProfile?.photo_url}
          size={40}
        />
        <div style={{ flex: 1 }}>
          <button
            onClick={() => router.push(`/card/${otherCard?.card_id}`)}
            style={{
              fontSize: 15, fontWeight: 700, color: "var(--color-primary)",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            #{otherCard?.card_id}
          </button>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {lookingForCategory}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: isMine ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMine ? "var(--color-primary)" : "var(--color-surface)",
                  color: isMine ? "white" : "var(--color-text)",
                  border: isMine ? "none" : "1px solid var(--color-border)",
                  fontSize: 15,
                  lineHeight: 1.4,
                }}
              >
                <p>{msg.content}</p>
                <p style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>
                  {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canReply ? (
        <div
          style={{
            padding: "12px 16px",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            gap: 10,
          }}
        >
          <input
            className="input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            style={{ flex: 1 }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: newMessage.trim() ? "var(--color-primary)" : "var(--color-border)",
              border: "none", cursor: newMessage.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s",
            }}
          >
            <Send size={18} color="white" />
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: "16px",
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            Unlock chat to reply to messages
          </p>
          <button
            onClick={() => router.push("/cards")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 20,
              background: "var(--color-primary)", color: "white",
              border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
            }}
          >
            <Lock size={14} /> Unlock Chat
          </button>
        </div>
      )}
    </div>
  )
}
