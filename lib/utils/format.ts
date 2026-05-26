import type { TaggedAddress } from "@/types"

export function formatTaggedAddress(addr: TaggedAddress): string {
  switch (addr.type) {
    case "college":
      return [addr.college_name, addr.branch, addr.section, addr.graduation_year]
        .filter(Boolean)
        .join(", ")
    case "school":
      return [addr.school_name, addr.pin_code, addr.completion_year]
        .filter(Boolean)
        .join(", ")
    case "workplace":
      return [addr.company_name, addr.department, addr.pin_code]
        .filter(Boolean)
        .join(", ")
    case "general":
      return [addr.building_name, addr.pin_code]
        .filter(Boolean)
        .join(", ")
    default:
      return ""
  }
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(dateStr)
}
