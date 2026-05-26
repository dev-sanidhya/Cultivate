const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export function generateCardId(): string {
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return result
}

export function normalizeCardId(id: string): string {
  return id.toUpperCase().trim()
}
