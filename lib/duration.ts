// Human-friendly duration formatting.
// Per spec: when a chat-unlock duration (in days) is an exact multiple of 30,
// display it in months instead of days (60 days -> "2 months", 360 -> "12 months").

export function formatUnlockDuration(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return `${days} days`
  if (days % 30 === 0) {
    const months = days / 30
    return `${months} ${months === 1 ? "month" : "months"}`
  }
  return `${days} ${days === 1 ? "day" : "days"}`
}

// Combined base + bonus duration display, e.g. "6 Months + 1 Month Bonus".
export function formatDurationWithBonus(baseDays: number, bonusDays: number): string {
  const base = formatUnlockDuration(baseDays)
  if (!bonusDays || bonusDays <= 0) return base
  return `${base} + ${formatUnlockDuration(bonusDays)} Bonus`
}
