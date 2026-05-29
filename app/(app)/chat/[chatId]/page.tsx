"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Send, Lock } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { PopupModal } from "@/components/ui/PopupModal"
import { timeAgo } from "@/lib/utils/format"
import { getChatCardsForViewer, type ChatCardRelation } from "@/lib/chat"
import { markChatAsRead } from "@/lib/badges"
import type { Message, Profile, Card } from "@/types"

export default function ChatConversationPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState("")
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [myCard, setMyCard] = useState<Card | null>(null)
  const [theirCard, setTheirCard] = useState<Card | null>(null)
  const [canReply, setCanReply] = useState(false)
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (loading || !userId || !chatId || messages.length === 0) return

    const supabase = createClient()
    const lastMessage = messages[messages.length - 1]
    void markChatAsRead(supabase, chatId, userId, lastMessage?.created_at ?? new Date().toISOString())
  }, [loading, userId, chatId, messages])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload: { new: Message }) => {
          const nextMessage = payload.new as Message
          setMessages((prev) => (prev.some((message) => message.id === nextMessage.id) ? prev : [...prev, nextMessage]))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId])

  const loadChat = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user!.id)

    const { data: chat } = await supabase
      .from("chats")
      .select(`
        *,
        initiator:initiator_id(id, first_name, last_name, photo_url, gender, date_of_birth, phone),
        recipient:recipient_id(id, first_name, last_name, photo_url, gender, date_of_birth, phone),
        initiator_card:initiator_card_id(*),
        recipient_card:recipient_card_id(*)
      `)
      .eq("id", chatId)
      .single()

    if (!chat) { router.push("/chat"); return }

    const isInitiator = chat.initiator_id === user!.id
    const other = (isInitiator ? chat.recipient : chat.initiator) as unknown as Profile
    const { myCard, theirCard } = getChatCardsForViewer(chat as ChatCardRelation, user!.id)

    setOtherProfile(other)
    setMyCard(myCard)
    setTheirCard(theirCard)

    // Check if user has chat unlock
    const { data: unlock } = await supabase
      .from("chat_unlocks")
      .select("*")
      .eq("user_id", user!.id)
      .eq("looking_for_category", chat.looking_for_category)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single()

    if (!unlock) {
      setCanReply(false)
      setShowUnlockPrompt(true)
      setLoading(false)
      return
    }

    setCanReply(true)

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })

    setMessages(msgs ?? [])
    const latestVisibleMessage = (msgs ?? [])[msgs?.length ? msgs.length - 1 : -1] as Message | undefined
    void markChatAsRead(
      supabase,
      chatId,
      user.id,
      latestVisibleMessage?.created_at ?? new Date().toISOString(),
    )
    setLoading(false)
  }, [chatId, router])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadChat()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [loadChat])

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
    const messageText = newMessage.trim()
    const { data: insertedMessage, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: userId,
        content: messageText,
      })
      .select("*")
      .single()

    if (!error && insertedMessage) {
      setMessages((prev) =>
        prev.some((message) => message.id === insertedMessage.id) ? prev : [...prev, insertedMessage as Message]
      )
      setNewMessage("")
      void supabase
        .from("chats")
        .update({
          last_message_at: insertedMessage.created_at,
          last_activity_at: insertedMessage.created_at,
        })
        .eq("id", chatId)
    } else {
      toast.error("Failed to send message")
    }
    setSending(false)
  }

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>Loading...</div>
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "100dvh" : "calc(100dvh - 64px)",
        minHeight: isMobile ? "100dvh" : "calc(100dvh - 64px)",
        background: "var(--color-bg)",
        marginTop: isMobile ? -64 : 0,
      }}
    >
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
          top: isMobile ? 0 : 64,
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
            <button
              disabled={!theirCard?.card_id}
              onClick={() => {
                if (theirCard?.card_id) router.push(`/card/${theirCard.card_id}`)
              }}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-accent)",
                background: "var(--color-accent-bg)",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 999,
                opacity: theirCard?.card_id ? 1 : 0.5,
              }}
            >
              Their card #{theirCard?.card_id ?? "-"}
            </button>
            <span
              style={{
                display: "inline-flex",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-primary)",
                background: "var(--color-primary-bg)",
                padding: "4px 8px",
                borderRadius: 999,
              }}
            >
              My card #{myCard?.card_id ?? "-"}
            </span>
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

      <PopupModal
        open={showUnlockPrompt}
        title="Unlock chat first"
        message={
          <>
            You need an active unlock for the <strong>{theirCard?.looking_for ?? "this"}</strong> category before opening this conversation.
          </>
        }
        confirmLabel="Go to cards"
        onConfirm={() => router.push("/cards")}
        onClose={() => router.push("/chat")}
        tone="warning"
      />
    </div>
  )
}
