import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getCuratedCatalogProductIds } from './offerings'

describe('getCuratedCatalogProductIds', () => {
  const env = { ...process.env }

  beforeEach(() => {
    delete process.env.PRINTFUL_CURATED_PRODUCT_IDS
    delete process.env.ENABLED_PRODUCT_IDS
    delete process.env.NEXT_PUBLIC_ENABLED_PRODUCT_IDS
  })

  afterEach(() => {
    process.env = { ...env }
  })

  it('parses PRINTFUL_CURATED_PRODUCT_IDS', () => {
    process.env.PRINTFUL_CURATED_PRODUCT_IDS = '71, 19 , 380'
    expect(getCuratedCatalogProductIds()).toEqual([71, 19, 380])
  })

  it('falls back to ENABLED_PRODUCT_IDS', () => {
    process.env.ENABLED_PRODUCT_IDS = '19'
    expect(getCuratedCatalogProductIds()).toEqual([19])
  })

  it('defaults to full storefront lineup when env unset', () => {
    const ids = getCuratedCatalogProductIds()
    expect(ids).toContain(71)
    expect(ids).toContain(294)
    expect(ids.length).toBe(10)
  })
})
