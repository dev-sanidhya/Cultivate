"use client"

import { useEffect, useState } from "react"
import type { TaggedAddressType } from "@/types"

type FieldConfig = {
  key: string
  label: string
  placeholder: string
}

interface TaggedAddressFieldGroupProps {
  addressType: TaggedAddressType | null
  fields: FieldConfig[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function TaggedAddressFieldGroup({
  addressType,
  fields,
  values,
  onChange,
}: TaggedAddressFieldGroupProps) {
  const [activeField, setActiveField] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({})
  const activeValue = activeField ? values[activeField] ?? "" : ""

  useEffect(() => {
    if (!addressType || !activeField) return

    const value = activeValue.trim()
    if (!value) {
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      const fetchSuggestions = async () => {
        const params = new URLSearchParams({
          type: addressType,
          field: activeField,
          q: value,
        })

        try {
          const res = await fetch(`/api/address-suggestions?${params.toString()}`, {
            signal: controller.signal,
          })
          if (!res.ok) return

          const data = await res.json()
          const nextSuggestions = Array.isArray(data?.suggestions)
            ? data.suggestions.filter((item: unknown): item is string => typeof item === "string")
            : []

          setSuggestions((prev) => ({ ...prev, [activeField]: nextSuggestions }))
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return
        }
      }

      void fetchSuggestions()
    }, 180)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [addressType, activeField, activeValue])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {fields.map(({ key, label, placeholder }) => (
        <div key={key} style={{ position: "relative" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>
            {label}
          </label>
          <input
            className="input"
            placeholder={placeholder}
            value={values[key] ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            onFocus={() => setActiveField(key)}
            onBlur={() => setTimeout(() => setActiveField(null), 150)}
            autoComplete="off"
          />
          {activeField === key && activeValue.trim().length > 0 && suggestions[key]?.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                boxShadow: "var(--shadow-md)",
                zIndex: 10,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {suggestions[key].map((suggestion) => (
                <button
                  key={suggestion}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onChange(key, suggestion)
                    setActiveField(null)
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    fontSize: 14,
                    color: "var(--color-text)",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
