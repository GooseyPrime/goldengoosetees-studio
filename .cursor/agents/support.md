# @support Agent — GoldenGooseTees Debugging

## Activation: `@support`

---

## COMMON ISSUE TRIAGE

### "Mockup not generating / stuck on pending"

```
1. Check designs table: what is mockup_status?
2. Check mockup_task_ids: is there a task ID?
3. Poll Printful: GET /v2/mockup-tasks?id={task_id}
   → If 'failed': check failure_reasons array in response
   → Common reasons: invalid file_id, file URL not publicly accessible,
                     unsupported image dimensions, wrong placement for product
4. Check Printful developer portal: is webhook registered and active?
5. Check /api/webhooks/printful in Vercel logs: any 401s (bad PRINTFUL_WEBHOOK_SECRET)?
6. Check Supabase Realtime: is client subscribed to the design's channel?
```

### "Stripe webhook 400 / payment not processing"
```
1. Vercel Functions log for /api/webhooks/stripe
2. Most common cause: STRIPE_WEBHOOK_SECRET in Vercel doesn't match Stripe dashboard
3. Second cause: route is using req.json() instead of req.text() (breaks sig verification)
4. Check Stripe dashboard → Webhooks → failed deliveries for the error detail
5. Local test: stripe trigger checkout.session.completed
```

### "Printful order not created after payment"
```
1. Stripe dashboard → Payments → find the charge → Events
   → Was checkout.session.completed sent? Was it received (200)?
2. Vercel log for /api/webhooks/stripe at the time of payment
3. Check orders table: status = 'paid' but no printful_order_id?
   → Printful POST /v2/orders failed — check PRINTFUL_API_KEY scope
   → Check PRINTFUL_STORE_ID is set in Vercel Production vars
4. Check design.placement_file_ids — if any placement is missing a file_id,
   the Printful order request will fail
```

### "Design file upload failing"
```
1. Check Supabase Storage bucket 'designs' exists and is set to Public
2. Check SUPABASE_SERVICE_ROLE_KEY is set in Vercel (upload uses service role)
3. Check the image data URL is valid PNG (not JPEG, not corrupted)
4. Check Supabase Storage policies aren't blocking public reads
5. After upload: verify Printful can fetch the URL
   (curl the Supabase public URL from outside the server to confirm public access)
```

### "Printful API 401 errors"
```
1. PRINTFUL_API_KEY missing or expired in Vercel Production vars
2. Token expired — check expiry date in Printful developer portal
3. Token is Store-level but missing X-PF-Store-Id header
4. Wrong token scope — verify catalog/read, files/write, mockup-tasks, orders/write
```

### "TypeScript build errors on Vercel"
```
1. Run: npx tsc --noEmit locally — fix all errors before pushing to main
2. Common: missing type imports from lib/printful/types.ts
3. Common: JSONB fields typed as 'any' — add proper types from the schema
```

---

## ESCALATION PATHS

| Issue | Escalate To |
|-------|-------------|
| Architecture change needed | @architect |
| Code fix required | @builder |
| Deployment/env issue | @devops |
| UI/UX degradation | @ux |
| New test coverage needed | @qa |

---
