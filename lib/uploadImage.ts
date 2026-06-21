// Client helper: upload an image via the admin upload route, returns its public URL.
export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  form.append("folder", folder)
  const res = await fetch("/api/admin/upload-image", { method: "POST", body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Upload failed")
  return data.url as string
}
