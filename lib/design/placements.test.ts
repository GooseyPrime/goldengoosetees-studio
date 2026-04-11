import { describe, it, expect } from 'vitest'
import { resolveStudioPlacements } from './placements'

describe('resolveStudioPlacements', () => {
  it('intersects local placements with Printful when both exist', () => {
    const printful = [
      { placement: 'front', technique: 'dtg' },
      { placement: 'back', technique: 'dtg' },
    ]
    const r = resolveStudioPlacements(71, printful)
    expect(r.map((x) => x.id)).toEqual(['front', 'back'])
  })

  it('drops local-only placements not in Printful response', () => {
    const printful = [{ placement: 'front', technique: 'dtg' }]
    const r = resolveStudioPlacements(71, printful)
    expect(r.map((x) => x.id)).toEqual(['front'])
  })
})
