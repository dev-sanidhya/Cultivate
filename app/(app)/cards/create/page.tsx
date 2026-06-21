"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { CardForm } from "@/components/cards/CardForm"
import { PageHeader } from "@/components/ui/PageHeader"
import { generateCardId } from "@/lib/utils/cardId"
import { CONTACT_WARNING_LIMIT } from "@/lib/utils/moderation"
import { readStoredContactWarningCount, writeStoredContactWarningCount } from "@/lib/utils/contactWarnings"
import { getErrorMessage } from "@/lib/utils/errors"
import { startUserOfferWindow } from "@/lib/offers"
import { noteMeetsSearchLength } from "@/lib/cardRules"
import type { FieldOption, Gender } from "@/types"

export default function CreateCardPage() {
  const router = useRouter()
  const [fieldOptions, setFieldOptions] = useState<Record<string, FieldOption[]>>({})
  const [gender, setGender] = useState<Gender>("other")
  const [warningCount, setWarningCount] = useState(0)
  const [penaltyAmount, setPenaltyAmount] = useState("0")
  const [penaltyPaidAt, setPenaltyPaidAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: profile }, { data: options }, { data: penaltyConfig }, { data: warningEvents }] = await Promise.all([
        supabase.from("profiles").select("gender, contact_detail_warning_count, contact_penalty_paid_at").eq("id", user!.id).single(),
        supabase.from("field_options").select("*").eq("is_approved", true).order("value"),
        supabase.from("platform_config").select("value").eq("key", "contact_penalty_amount").single(),
        supabase.from("contact_detail_warnings").select("id").eq("user_id", user!.id),
      ])

      if (profile) {
        setGender(profile.gender as Gender)
        const storedCount = readStoredContactWarningCount(user!.id)
        const eventCount = Array.isArray(warningEvents) ? warningEvents.length : 0
        const mergedCount = Math.max(profile.contact_detail_warning_count ?? 0, storedCount, eventCount)
        setWarningCount(mergedCount)
        setPenaltyPaidAt(profile.contact_penalty_paid_at ?? null)
        writeStoredContactWarningCount(user!.id, mergedCount)
      }
      if (penaltyConfig?.value) setPenaltyAmount(penaltyConfig.value)

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
    looking_for_gender: Gender | null
    qualities: string[]
    interests: string[]
    weakness: string[]
    disinterests: string[]
    note: string
  }

  async function handleSubmit(data: CardFormData, customOptions: { field: string; value: string }[]) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (warningCount >= CONTACT_WARNING_LIMIT && !penaltyPaidAt) {
        toast.error(`You cannot create new cards until you pay the contact-details penalty of Rs. ${penaltyAmount}.`)
        return
      }

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
        looking_for_gender: data.looking_for_gender,
        qualities: data.qualities,
        interests: data.interests,
        weakness: data.weakness,
        disinterests: data.disinterests,
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

      // Card Creation offer: a card whose Note has 60+ chars starts (or restarts)
      // the card-creation offer window. Editing later never re-arms it.
      if (noteMeetsSearchLength(data.note)) {
        await startUserOfferWindow(supabase, user!.id, "card_creation", card.id)
      }

      toast.success("Card created!")
      router.push("/cards")
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to create card"))
    } finally {
      setLoading(false)
    }
  }

  async function handleContactDetailsDetected(reason: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const nextCount = warningCount + 1

    setWarningCount(nextCount)
    writeStoredContactWarningCount(user!.id, nextCount)
    await supabase
      .from("profiles")
      .update({ contact_detail_warning_count: nextCount, contact_penalty_paid_at: null })
      .eq("id", user!.id)
    await supabase.from("contact_detail_warnings").insert({
      user_id: user!.id,
      reason,
    })

    return {
      warningCount: nextCount,
      warningLimit: CONTACT_WARNING_LIMIT,
      penaltyAmount,
      blocked: nextCount >= CONTACT_WARNING_LIMIT && !penaltyPaidAt,
    }
  }

  const isPenaltyBlocked = warningCount >= CONTACT_WARNING_LIMIT && !penaltyPaidAt

  return (
    <div className="page-container" style={{ paddingTop: 5 }}>
      <PageHeader title="Create Card" subtitle="Share who you are" showBack />
      <CardForm
        gender={gender}
        fieldOptions={fieldOptions}
        onSubmit={handleSubmit}
        onContactDetailsDetected={handleContactDetailsDetected}
        onCancel={() => router.back()}
        submitLabel="Create Card"
        loading={loading}
        disabled={isPenaltyBlocked}
      />
    </div>
  )
}
