"use client"

export function Spinner({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color === "white" ? "rgba(255,255,255,0.3)" : "rgba(124,58,237,0.2)"} strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color === "white" ? "white" : "#7C3AED"} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
