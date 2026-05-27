export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashBytes = Array.from(new Uint8Array(hashBuffer))
  return hashBytes.map((b) => b.toString(16).padStart(2, "0")).join("")
}
