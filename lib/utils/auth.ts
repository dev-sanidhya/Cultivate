import crypto from "crypto"

export function getSyntheticEmail(phone: string): string {
  const normalized = phone.replace(/\D/g, "")
  return `${normalized}@strefo.app`
}

export function getDerivedPassword(phone: string): string {
  const normalized = phone.replace(/\D/g, "")
  const secret = process.env.AUTH_SECRET || "fallback-secret"
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex")
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}
