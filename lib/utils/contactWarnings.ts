const STORAGE_PREFIX = "strefo:contact-warning-count:"

export function getContactWarningStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

export function readStoredContactWarningCount(userId: string) {
  if (typeof window === "undefined") return 0
  const raw = window.localStorage.getItem(getContactWarningStorageKey(userId))
  const count = Number.parseInt(raw ?? "0", 10)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function writeStoredContactWarningCount(userId: string, count: number) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(getContactWarningStorageKey(userId), String(Math.max(0, count)))
}
