/**
 * Parse JSON API responses; surface plain-text errors (e.g. Vercel 413) without JSON.parse throwing.
 */
export async function parseApiJson(res: Response): Promise<Record<string, unknown>> {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    try {
      return (await res.json()) as Record<string, unknown>
    } catch {
      throw new Error('Invalid JSON response from server')
    }
  }
  const text = await res.text()
  throw new Error((text || `HTTP ${res.status}`).slice(0, 240))
}
