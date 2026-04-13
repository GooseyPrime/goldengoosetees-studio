import { describe, expect, it } from 'vitest'
import { isOpenAIBillingOrQuotaError, OpenAIImageServiceUnavailableError } from './openaiImageErrors'

describe('openaiImageErrors', () => {
  it('detects billing hard limit message', () => {
    expect(isOpenAIBillingOrQuotaError(new Error('400 Billing hard limit has been reached'))).toBe(true)
  })

  it('detects insufficient quota', () => {
    expect(isOpenAIBillingOrQuotaError(new Error('insufficient_quota'))).toBe(true)
  })

  it('detects 429', () => {
    const e = new Error('rate limit')
    ;(e as Error & { status: number }).status = 429
    expect(isOpenAIBillingOrQuotaError(e)).toBe(true)
  })

  it('OpenAIImageServiceUnavailableError has httpStatus 503 and code', () => {
    const err = new OpenAIImageServiceUnavailableError('test')
    expect(err.httpStatus).toBe(503)
    expect(err.errorCode).toBe('openai_billing_or_quota')
  })
})
