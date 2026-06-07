/** Whole-year age from an ISO date-of-birth string. */
export function ageFromDateOfBirth(dob: string | null | undefined): number {
  if (!dob) return 0
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return 0
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return Math.max(age, 0)
}
