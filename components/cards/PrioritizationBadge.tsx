import type { PrioritizationType } from "@/types"

export function PrioritizationBadge({ type }: { type: PrioritizationType }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        width: "max-content",
        position: "absolute",
        top: -12,
        right: 10,
        zIndex: 3,
        padding: "5px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.3,
        color: "white",
        background: type === "S" ? "linear-gradient(135deg, #EC4899, #7C3AED)" : "var(--color-primary)",
        boxShadow: "0 6px 18px rgba(124, 58, 237, 0.28)",
      }}
    >
      {type}-Prioritized
    </div>
  )
}
