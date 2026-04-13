import { describe, expect, it } from 'vitest'
import { buildImagePromptFromParts, MAX_IMAGE_PROMPT_LENGTH, defaultImagePromptParts } from './imagePromptParts'

describe('imagePromptParts', () => {
  it('buildImagePromptFromParts includes subject and constraints', () => {
    const p = {
      ...defaultImagePromptParts(),
      subject: 'A goose wearing sunglasses',
      extraDetails: 'subtle halftone dots',
    }
    const out = buildImagePromptFromParts(p, { placementLabel: 'Front Print' })
    expect(out).toContain('goose')
    expect(out).toContain('Front Print')
    expect(out).toContain('direct-to-garment')
  })

  it('respects max length', () => {
    const p = {
      ...defaultImagePromptParts(),
      subject: 'x'.repeat(MAX_IMAGE_PROMPT_LENGTH + 500),
    }
    expect(buildImagePromptFromParts(p).length).toBeLessThanOrEqual(MAX_IMAGE_PROMPT_LENGTH)
  })

  it('includes print-clarity options when subject is empty', () => {
    const p = {
      ...defaultImagePromptParts(),
      subject: '',
      backgroundKey: 'solid_dark' as const,
      detailLevelKey: 'simple' as const,
    }
    const out = buildImagePromptFromParts(p)
    expect(out).toContain('solid dark')
    expect(out).toContain('simple bold')
  })
})
