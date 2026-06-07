import type { Gender } from "@/types"

/**
 * Gender-specific "Looking For" options (hardcoded per product decision).
 * These do NOT show a gender sub-field. The mapped value is the implied
 * "contact gender": only users whose PROFILE gender equals it may contact
 * a card with this option, and it is the gender the counterpart card targets.
 */
export const GENDER_SPECIFIC_OPTIONS: Record<string, Gender> = {
  "Sugar Daddy": "male",
  "Sugar Mommy": "female",
}

/** Options that take part in complementary (special) matching. */
export const SUGAR_BABY = "Sugar Baby"

export function isGenderSpecificOption(lookingFor: string): boolean {
  return lookingFor in GENDER_SPECIFIC_OPTIONS
}

/** Implied contact gender for a gender-specific option, else null. */
export function impliedContactGender(lookingFor: string): Gender | null {
  return GENDER_SPECIFIC_OPTIONS[lookingFor] ?? null
}

/** Whether the card UI should ask the user to pick a target gender. */
export function requiresGenderSelection(lookingFor: string): boolean {
  return lookingFor !== "" && !isGenderSpecificOption(lookingFor)
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Display label for a card's "Looking For".
 * - Gender-specific options render as-is ("Sugar Daddy").
 * - Others render "<Gender> <Option>" when a target gender is set ("Male Best Friend").
 */
export function formatLookingFor(lookingFor: string, gender: Gender | null | undefined): string {
  if (!lookingFor) return ""
  if (isGenderSpecificOption(lookingFor)) return lookingFor
  if (!gender) return lookingFor
  return `${capitalize(gender)} ${lookingFor}`
}

export interface Counterpart {
  /** The "Looking For" category the viewer must own/unlock to contact the target. */
  looking_for: string
  /** The target gender on that counterpart card (null when counterpart is gender-specific). */
  looking_for_gender: Gender | null
  /** The viewer's PROFILE gender must equal this to be eligible to contact the target. */
  requiredViewerGender: Gender | null
}

/**
 * Given a target card and its owner's profile gender, returns what the viewer
 * needs (category + target gender) to contact it, plus the viewer profile gender
 * required for eligibility (per messaging rule §3 + special pairs).
 */
export function getCounterpart(
  target: { looking_for: string; looking_for_gender: Gender | null },
  targetOwnerGender: Gender,
): Counterpart {
  const L = target.looking_for

  // Special pair: target is Sugar Daddy / Sugar Mommy (gender-specific).
  if (isGenderSpecificOption(L)) {
    return {
      looking_for: SUGAR_BABY,
      looking_for_gender: targetOwnerGender, // baby targets the daddy/mommy seeker's gender
      requiredViewerGender: impliedContactGender(L), // only male can contact daddy, female mommy
    }
  }

  // Special pair: target is a Sugar Baby -> counterpart is the gender-specific Daddy/Mommy.
  if (L === SUGAR_BABY) {
    const counterpartLF =
      targetOwnerGender === "male" ? "Sugar Daddy" : targetOwnerGender === "female" ? "Sugar Mommy" : ""
    return {
      looking_for: counterpartLF, // empty for "other" owner -> no valid sugar counterpart
      looking_for_gender: null, // gender-specific counterpart
      requiredViewerGender: target.looking_for_gender, // viewer must be the gender the baby wants
    }
  }

  // Normal: same category; viewer targets the target owner's gender.
  return {
    looking_for: L,
    looking_for_gender: targetOwnerGender,
    requiredViewerGender: target.looking_for_gender, // target wants viewer's gender (§3)
  }
}

/** Whether a viewer with the given profile gender may contact the target card. */
export function viewerCanContact(
  target: { looking_for: string; looking_for_gender: Gender | null },
  targetOwnerGender: Gender,
  viewerGender: Gender,
): boolean {
  const counterpart = getCounterpart(target, targetOwnerGender)
  if (!counterpart.looking_for) return false
  if (!counterpart.requiredViewerGender) return true
  return counterpart.requiredViewerGender === viewerGender
}

/** Message shown when a viewer's gender is not allowed to contact the card. */
export function ineligibleContactMessage(
  target: { looking_for: string; looking_for_gender: Gender | null },
  targetOwnerGender: Gender,
): string {
  const counterpart = getCounterpart(target, targetOwnerGender)
  const g = counterpart.requiredViewerGender
  if (!g) return "You cannot chat with this user."
  return `Only ${capitalize(g)} users can chat with this user.`
}
