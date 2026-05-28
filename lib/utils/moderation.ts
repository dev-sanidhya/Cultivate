const PHONE_PATTERN = /(?:\+?\d[\d\s\-().]{6,}\d)/
const EMAIL_PATTERN = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i
const EMAIL_WORD_PATTERN = /\b[a-z0-9._%+\-]{2,}\s+(?:at|@)\s+[a-z0-9.\-]{2,}\s+(?:dot|\.)\s+[a-z]{2,}\b/i
const SOCIAL_HANDLE_PATTERN = /(?:^|\s)@[a-z0-9_.]{3,}\b/i
const URL_PATTERN = /(?:https?:\/\/|www\.|(?:^|\s)[a-z0-9-]+\.(?:com|in|net|org|io|co|me|app|link|gg|xyz)\b)/i
const CONTACT_PLATFORM_PATTERN = /\b(?:whatsapp|wa\.me|telegram|t\.me|instagram|insta|snapchat|discord|linktree|bio\.link)\b/i
const HANDLE_HINT_PATTERN = /\b(?:ig|insta|snap|telegram|discord|handle|username|user\s*id)\s*[:=@-]?\s*[a-z0-9_.]{3,}\b/i
const DIGIT_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
}

export interface ModerationResult {
  blocked: boolean
  reason?: string
}

export const CONTACT_WARNING_LIMIT = 4

export function normalizeNoteForModeration(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*/g, " at ")
    .replace(/\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*/g, " dot ")
    .replace(/\b(?:slash|forward slash)\b/g, "/")
    .replace(/\b(?:underscore)\b/g, "_")
    .replace(/\b(?:dash|hyphen)\b/g, "-")
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g, (word) => DIGIT_WORDS[word] ?? word)
    .replace(/[^\S\r\n]+/g, " ")
    .trim()
}

function hasPhoneLikeNumber(text: string): boolean {
  if (PHONE_PATTERN.test(text)) {
    const matches = text.match(new RegExp(PHONE_PATTERN.source, "g")) ?? []
    if (matches.some((match) => match.replace(/\D/g, "").length >= 7)) return true
  }

  const digitRuns = text.match(/(?:\d[\s\-().]*){7,}/g) ?? []
  return digitRuns.some((match) => match.replace(/\D/g, "").length >= 7)
}

export function moderateNote(text: string): ModerationResult {
  if (!text) return { blocked: false }

  const normalized = normalizeNoteForModeration(text)

  if (hasPhoneLikeNumber(normalized)) {
    return { blocked: true, reason: "Phone numbers are not allowed in the Note field." }
  }

  if (EMAIL_PATTERN.test(normalized) || EMAIL_WORD_PATTERN.test(normalized)) {
    return { blocked: true, reason: "Email addresses are not allowed in the Note field." }
  }

  if (SOCIAL_HANDLE_PATTERN.test(normalized) || HANDLE_HINT_PATTERN.test(normalized)) {
    return { blocked: true, reason: "Social media handles are not allowed in the Note field." }
  }

  if (URL_PATTERN.test(normalized)) {
    return { blocked: true, reason: "URLs are not allowed in the Note field." }
  }

  if (CONTACT_PLATFORM_PATTERN.test(normalized)) {
    return { blocked: true, reason: "Contact details are not allowed in the Note field." }
  }

  return { blocked: false }
}
