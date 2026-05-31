"use client"

import Image from "next/image"

interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: number
  className?: string
  initialsOverride?: string
}

export function Avatar({ name, photoUrl, size = 40, className = "", initialsOverride }: AvatarProps) {
  const initials = (initialsOverride ?? name)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase() || "?"

  const colors = [
    "#7C3AED", "#6D28D9", "#5B21B6",
    "#EC4899", "#DB2777", "#BE185D",
    "#8B5CF6", "#A78BFA",
  ]
  const colorIndex = name.charCodeAt(0) % colors.length
  const bgColor = colors[colorIndex]

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
        className={className}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        fontFamily: "var(--font-sans)",
      }}
      className={className}
    >
      {initials}
    </div>
  )
}
