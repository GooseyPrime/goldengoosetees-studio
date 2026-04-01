/** Parse JSON from a fetch Response; return null if empty or not JSON (e.g. HTML 404 from dev server). */
export async function parseResponseJson<T = Record<string, unknown>>(
  res: Response
): Promise<T | null> {
  const text = await res.text()
  if (!text?.trim()) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
