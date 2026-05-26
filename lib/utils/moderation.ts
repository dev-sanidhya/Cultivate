// Regex patterns to detect personal contact information in the Note field
const PHONE_PATTERN = /(\+?[\d\s\-().]{7,})/g
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const SOCIAL_HANDLE_PATTERN = /@[a-zA-Z0-9_.]{3,}/g
const URL_PATTERN = /(https?:\/\/|www\.)[^\s]+/gi
const WHATSAPP_PATTERN = /wa\.me|whatsapp/gi
const INSTAGRAM_PATTERN = /instagram|insta|ig\s*[:=@]/gi
const SNAPCHAT_PATTERN = /snapchat|snap\s*[:=@]/gi
const TELEGRAM_PATTERN = /telegram|t\.me/gi

export interface ModerationResult {
  blocked: boolean
  reason?: string
}

export function moderateNote(text: string): ModerationResult {
  if (!text) return { blocked: false }

  if (PHONE_PATTERN.test(text)) {
    // Reset lastIndex after test
    PHONE_PATTERN.lastIndex = 0
    // Filter out short numbers that might be ages, years, etc.
    const matches = text.match(PHONE_PATTERN) || []
    const phoneMatches = matches.filter((m) => m.replace(/\D/g, "").length >= 7)
    if (phoneMatches.length > 0) {
      return { blocked: true, reason: "Phone numbers are not allowed in the Note field." }
    }
  }

  if (EMAIL_PATTERN.test(text)) {
    return { blocked: true, reason: "Email addresses are not allowed in the Note field." }
  }

  if (SOCIAL_HANDLE_PATTERN.test(text)) {
    return { blocked: true, reason: "Social media handles are not allowed in the Note field." }
  }

  if (URL_PATTERN.test(text)) {
    return { blocked: true, reason: "URLs are not allowed in the Note field." }
  }

  if (WHATSAPP_PATTERN.test(text)) {
    return { blocked: true, reason: "Contact details are not allowed in the Note field." }
  }

  if (INSTAGRAM_PATTERN.test(text)) {
    return { blocked: true, reason: "Social media usernames are not allowed in the Note field." }
  }

  if (SNAPCHAT_PATTERN.test(text)) {
    return { blocked: true, reason: "Social media usernames are not allowed in the Note field." }
  }

  if (TELEGRAM_PATTERN.test(text)) {
    return { blocked: true, reason: "Contact details are not allowed in the Note field." }
  }

  return { blocked: false }
}
