# @qa Agent — GoldenGooseTees Quality Assurance

## Activation: `@qa`

---

## CRITICAL FLOWS TO TEST

Every PR that touches the following flows requires end-to-end verification:

### 1. Mockup Generation Flow
```typescript
// Test: POST /api/printful/mockup-task
describe('mockup task creation', () => {
  it('creates task for all selected placements', async () => {
    const design = await createTestDesign({
      selected_placements: ['front', 'back'],
      placement_file_ids: { front: 'pf_abc', back: 'pf_xyz' },
    })
    const res = await POST('/api/printful/mockup-task', { designId: design.id })
    expect(res.success).toBe(true)
    expect(res.data.taskId).toBeTypeOf('number')
    // Verify DB: mockup_status = 'pending', task ID stored
    const updated = await getDesign(design.id)
    expect(updated.mockup_status).toBe('pending')
    expect(updated.mockup_task_ids.combined).toBe(res.data.taskId)
  })

  it('rejects if any placement missing file_id', async () => {
    const design = await createTestDesign({
      selected_placements: ['front', 'back'],
      placement_file_ids: { front: 'pf_abc' },  // back missing
    })
    const res = await POST('/api/printful/mockup-task', { designId: design.id })
    expect(res.success).toBe(false)
    expect(res.code).toBe('MISSING_DESIGN_FILE')
  })
})
```

### 2. Stripe Webhook Handler
```typescript
describe('Stripe webhook', () => {
  it('requires valid signature', async () => {
    const res = await POST('/api/webhooks/stripe', {
      body: '{}',
      headers: { 'stripe-signature': 'invalid' },
    })
    expect(res.status).toBe(400)
  })

  it('is idempotent — does not double-process', async () => {
    const order = await createTestOrder({ status: 'paid' })
    // Fire webhook again for same session
    const res = await fireStripeWebhook('checkout.session.completed', { id: order.stripe_session_id })
    expect(res.received).toBe(true)
    // Verify printful was NOT called again
    expect(mockPrintfulPost).not.toHaveBeenCalled()
  })

  it('creates Printful order with all placement files', async () => {
    const design = await createTestDesign({
      selected_placements: ['front', 'back'],
      placement_file_ids: { front: 'pf_abc', back: 'pf_xyz' },
    })
    await fireStripeWebhook('checkout.session.completed', {
      metadata: { designId: design.id, variantId: '4011', quantity: '1' },
    })
    expect(mockPrintfulPost).toHaveBeenCalledWith('/v2/orders', {
      recipient: expect.any(Object),
      items: [{
        catalog_variant_id: 4011,
        quantity: 1,
        files: [
          { placement: 'front', file_id: 'pf_abc' },
          { placement: 'back', file_id: 'pf_xyz' },
        ],
      }],
    })
  })
})
```

### 3. Price Calculation
```typescript
describe('calculateRetailPrice', () => {
  it('returns base price for front only', () => {
    expect(calculateRetailPrice(71, ['front'], 'M')).toBe(28.00)
  })
  it('adds back print price', () => {
    expect(calculateRetailPrice(71, ['front', 'back'], 'M')).toBe(33.00)
  })
  it('adds size upcharge', () => {
    expect(calculateRetailPrice(71, ['front'], '2XL')).toBe(30.00)
  })
  it('never trusts client-provided price', () => {
    // Server always recalculates — this is enforcement by design
  })
})
```

---

## SECURITY REVIEW CHECKLIST (every PR)

- [ ] No `PRINTFUL_API_KEY` / `STRIPE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
      appears in any file under `/components/`, `/hooks/`, or `/app/(store)/` or `/app/(studio)/` (excluding api/)
- [ ] Stripe webhook verifies signature before processing
- [ ] Printful webhook verifies HMAC before processing
- [ ] Checkout session price calculated server-side (not from client request body)
- [ ] Order not created if design.mockup_status !== 'complete'
- [ ] No SQL injection: all Supabase queries use parameterized calls

---

## ASYNC PATTERN VERIFICATION

Any PR touching mockup generation must verify:
```
❌ const images = await createMockupTask(...)     // WRONG: task returns id, not images
✅ const { taskId } = await createMockupTask(...) // RIGHT: store taskId, wait for webhook
```

---

## BUG REPORT TEMPLATE (GGT)

```markdown
## Bug: [title]
**Severity**: P0 (checkout broken) | P1 (mockup broken) | P2 (UX issue) | P3 (cosmetic)
**Flow affected**: Design Session | Mockup Generation | Checkout | Order Fulfillment

### Steps to reproduce
### Expected behavior
### Actual behavior
### Printful task_id (if mockup-related):
### Stripe session_id (if checkout-related):
### Supabase design_id:
### Error from Vercel Functions log:
```

---
