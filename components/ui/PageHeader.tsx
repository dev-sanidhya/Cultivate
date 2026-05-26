"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  right?: React.ReactNode
}

export function PageHeader({ title, subtitle, showBack, right }: PageHeaderProps) {
  const router = useRouter()

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 0",
        marginBottom: 8,
      }}
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          className="btn-ghost"
          style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--color-primary-bg)" }}
        >
          <ArrowLeft size={18} color="var(--color-primary)" />
        </button>
      )}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}
