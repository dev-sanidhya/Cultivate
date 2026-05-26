"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { CardForm } from "@/components/cards/CardForm"
import { PageHeader } from "@/components/ui/PageHeader"
import { generateCardId } from "@/lib/utils/cardId"
import type { FieldOption, Gender } from "@/types"

export default function CreateCardPage() {
  const router = useRouter()
  const [fieldOptions, setFieldOptions] = useState<Record<string, FieldOption[]>>({})
  const [gender, setGender] = useState<Gender>("other")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: profile }, { data: options }] = await Promise.all([
        supabase.from("profiles").select("gender").eq("id", user!.id).single(),
        supabase.from("field_options").select("*").eq("is_approved", true).order("value"),
      ])

      if (profile) setGender(profile.gender as Gender)

      const grouped: Record<string, FieldOption[]> = {}
      for (const opt of options ?? []) {
        if (!grouped[opt.field_name]) grouped[opt.field_name] = []
        grouped[opt.field_name].push(opt)
      }
      setFieldOptions(grouped)
    }
    load()
  }, [])

  interface CardFormData {
    age: string
    personality_types: string[]
    tagged_address: import("@/types").TaggedAddress | null
    looking_for: string
    qualities: string[]
    hobbies: string[]
    note: string
  }

  async function handleSubmit(data: CardFormData, customOptions: { field: string; value: string }[]) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Generate unique card ID
      let cardId = generateCardId()
      let attempts = 0
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from("cards")
          .select("id")
          .eq("card_id", cardId)
          .single()
        if (!existing) break
        cardId = generateCardId()
        attempts++
      }

      const { data: card, error } = await supabase.from("cards").insert({
        card_id: cardId,
        user_id: user!.id,
        age: parseInt(data.age),
        gender,
        personality_types: data.personality_types,
        tagged_address: data.tagged_address,
        looking_for: data.looking_for,
        qualities: data.qualities,
        hobbies: data.hobbies,
        note: data.note || null,
        is_public: true,
      }).select().single()

      if (error) throw error

      // Submit custom option requests
      if (customOptions.length > 0) {
        await supabase.from("custom_option_requests").insert(
          customOptions.map((o) => ({
            user_id: user!.id,
            card_id: card.id,
            field_name: o.field,
            value: o.value,
          }))
        )
      }

      // Save address field suggestions
      if (data.tagged_address) {
        const { type, ...fields } = data.tagged_address
        for (const [k, v] of Object.entries(fields)) {
          if (v) {
            try {
              await supabase.rpc("upsert_address_suggestion", {
                p_type: type,
                p_field: k,
                p_value: v,
              })
            } catch {}
          }
        }
      }

      toast.success("Card created!")
      router.push("/cards")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create card")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container" style={{ paddingTop: 20 }}>
      <PageHeader title="Create Card" subtitle="Share who you are" showBack />
      <CardForm
        gender={gender}
        fieldOptions={fieldOptions}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="Create Card"
        loading={loading}
      />
    </div>
  )
}
