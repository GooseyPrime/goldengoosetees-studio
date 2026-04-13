import { describe, expect, it } from 'vitest'
import { isLikelySupabaseProjectUrl } from './url'

describe('supabase url guard', () => {
  it('accepts supabase.co https', () => {
    expect(isLikelySupabaseProjectUrl('https://abc123.supabase.co')).toBe(true)
  })
  it('rejects app domain', () => {
    expect(isLikelySupabaseProjectUrl('https://www.goldengoosetees.com')).toBe(false)
  })
})
