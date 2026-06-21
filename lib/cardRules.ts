// Shared card eligibility rules.

// A card's Note must contain at least this many characters for the card to be
// eligible to appear in search results (and to trigger the Card Creation offer).
export const MIN_SEARCHABLE_NOTE_LENGTH = 60

export function noteMeetsSearchLength(note: string | null | undefined): boolean {
  return (note?.trim().length ?? 0) >= MIN_SEARCHABLE_NOTE_LENGTH
}
