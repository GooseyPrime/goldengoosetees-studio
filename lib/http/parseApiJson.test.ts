import { describe, expect, it } from 'vitest'
import { parseApiJson } from './parseApiJson'

describe('parseApiJson', () => {
  it('parses application/json', async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
    const j = await parseApiJson(res)
    expect(j.ok).toBe(true)
  })

  it('throws with text body when not json', async () => {
    const res = new Response('Request Entity Too Large', { status: 413 })
    await expect(parseApiJson(res)).rejects.toThrow(/Request Entity/i)
  })
})
