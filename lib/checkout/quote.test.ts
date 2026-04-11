import { describe, expect, it } from 'vitest'
import { computeRetailCents } from './quote'

describe('computeRetailCents', () => {
  it('charges only for placements with art keys passed', () => {
    const withBack = computeRetailCents(71, ['front', 'back'], 'M')
    const frontOnly = computeRetailCents(71, ['front'], 'M')
    expect(withBack).toBeGreaterThan(frontOnly)
  })

  it('applies size surcharge for 2XL when configured', () => {
    const m = computeRetailCents(71, ['front'], 'M')
    const xxl = computeRetailCents(71, ['front'], '2XL')
    expect(xxl).toBeGreaterThanOrEqual(m)
  })
})
