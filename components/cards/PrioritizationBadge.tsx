import type { PrioritizationType } from "@/types"

export function PrioritizationBadge({
  type,
  floating = true,
}: {
  type: PrioritizationType
  floating?: boolean
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        width: "max-content",
        position: floating ? "absolute" : "static",
        top: floating ? -12 : undefined,
        right: floating ? 10 : undefined,
        zIndex: floating ? 3 : undefined,
        padding: floating ? "5px 12px" : "4px 10px",
        borderRadius: 999,
        fontSize: floating ? 13 : 12,
        fontWeight: floating ? 600 : 700,
        letterSpacing: floating ? 0.3 : 1,
        color: "white",
        background: type === "S" ? "linear-gradient(135deg, #EC4899, #7C3AED)" : "var(--color-primary)",
        boxShadow: floating ? "0 6px 18px rgba(124, 58, 237, 0.28)" : "0 6px 18px rgba(124, 58, 237, 0.18)",
      }}
    >
      {type}-Prioritized
    </div>
  )
}
