"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { CardForm } from "@/components/cards/CardForm"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"
import type { Card, FieldOption, Gender } from "@/types"

interface CardFormData {
  age: string
  personality_types: string[]
  tagged_address: import("@/types").TaggedAddress | null
  looking_for: string
  qualities: string[]
  hobbies: string[]
  note: string
}

export default function EditCardPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const router = useRouter()
  const [card, setCard] = useState<Card | null>(null)
  const [fieldOptions, setFieldOptions] = useState<Record<string, FieldOption[]>>({})
  const [gender, setGender] = useState<Gender>("other")
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: cardData }, { data: profile }, { data: options }] = await Promise.all([
        supabase.from("cards").select("*").eq("id", cardId).eq("user_id", user!.id).single(),
        supabase.from("profiles").select("gender").eq("id", user!.id).single(),
        supabase.from("field_options").select("*").eq("is_approved", true).order("value"),
      ])

      if (!cardData) { router.push("/cards"); return }

      setCard(cardData)
      if (profile) setGender(profile.gender as Gender)

      const grouped: Record<string, FieldOption[]> = {}
      for (const opt of options ?? []) {
        if (!grouped[opt.field_name]) grouped[opt.field_name] = []
        grouped[opt.field_name].push(opt)
      }
      setFieldOptions(grouped)
      setInitializing(false)
    }
    load()
  }, [cardId])

  async function handleSubmit(data: CardFormData, customOptions: { field: string; value: string }[]) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from("cards").update({
        age: parseInt(data.age),
        personality_types: data.personality_types,
        tagged_address: data.tagged_address,
        looking_for: card?.chat_enabled ? card.looking_for : data.looking_for,
        qualities: data.qualities,
        hobbies: data.hobbies,
        note: data.note || null,
        updated_at: new Date().toISOString(),
      }).eq("id", cardId)

      if (error) throw error

      if (customOptions.length > 0) {
        await supabase.from("custom_option_requests").insert(
          customOptions.map((o) => ({
            user_id: user!.id,
            card_id: cardId,
            field_name: o.field,
            value: o.value,
          }))
        )
      }

      toast.success("Card updated!")
      router.push("/cards")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update card")
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner size={32} color="primary" /></div>
  }

  if (!card) return null

  return (
    <div className="page-container" style={{ paddingTop: 20 }}>
      <PageHeader title="Edit Card" showBack />
      {card.chat_enabled && (
        <div style={{
          background: "var(--color-warning-bg)",
          border: "1px solid var(--color-warning)",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 20,
          fontSize: 13,
          color: "#92400E",
        }}>
          The <strong>Looking For</strong> field is locked because chat is active on this card.
        </div>
      )}
      <CardForm
        initialData={{
          age: card.age.toString(),
          personality_types: card.personality_types,
          tagged_address: card.tagged_address,
          looking_for: card.looking_for,
          qualities: card.qualities,
          hobbies: card.hobbies,
          note: card.note ?? "",
        }}
        gender={gender}
        fieldOptions={fieldOptions}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="Save Changes"
        loading={loading}
      />
    </div>
  )
}
