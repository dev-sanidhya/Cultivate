import type { PrioritizationType } from "@/types"

export function PrioritizationBadge({
  type,
  floating = true,
}: {
  type: PrioritizationType
  floating?: boolean
}) {
  const chipStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    width: "max-content",
    position: floating ? "absolute" : "static",
    top: floating ? -12 : undefined,
    right: floating ? 10 : undefined,
    zIndex: floating ? 3 : undefined,
    padding: floating ? "4px 10px" : "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    color: "var(--color-primary)",
    background: "var(--color-primary-bg)",
    border: "1px solid var(--color-border)",
    boxShadow: "none",
  } as const

  return (
    <div style={chipStyle}>
      {type}-Prioritized
    </div>
  )
}
