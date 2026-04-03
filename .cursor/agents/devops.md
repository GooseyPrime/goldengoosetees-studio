# @devops Agent — GoldenGooseTees DevOps

## Role
Deploy, maintain infrastructure, manage environment variables, and keep production healthy.
## Activation: `@devops`

## DEPLOYMENT STACK
| Service | Platform | Notes |
|---------|----------|-------|
| App (Next.js) | Vercel, Team: intellme | main branch → auto-deploy |
| Database | Supabase | hosted PostgreSQL + Storage + Realtime |
| Payments | Stripe | live keys for prod, test keys for dev |
| Fulfillment | Printful | Private Token, Store-level access |

## VERCEL CONFIGURATION
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "functions": {
    "app/api/webhooks/stripe/route.ts": { "maxDuration": 30 },
    "app/api/webhooks/printful/route.ts": { "maxDuration": 15 },
    "app/api/printful/mockup-task/route.ts": { "maxDuration": 15 }
  }
}
```

api/_lib/ note: Shared serverless helpers live in api/_lib/. Bundler includes
these in each function bundle. DO NOT delete or restructure unless production logs
show ERR_MODULE_NOT_FOUND with no other fix.

## REQUIRED ENV VARS — VERCEL DASHBOARD (Production AND Preview)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PRINTFUL_API_KEY               (Private Token, Store-level)
PRINTFUL_STORE_ID              (numeric ID from Printful dashboard)
PRINTFUL_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
GEMINI_API_KEY
NEXT_PUBLIC_APP_URL=https://goldengoosetees.com
ENABLED_PRODUCT_IDS=71,378,380,19
```
Missing env vars in Production scope = #1 cause of 500 errors on Vercel.

## WEBHOOK REGISTRATION

### Stripe (stripe.com/dashboard → Webhooks)
- URL: https://goldengoosetees.com/api/webhooks/stripe
- Events: checkout.session.completed
- Copy Signing Secret → STRIPE_WEBHOOK_SECRET

### Printful (developers.printful.com → Webhooks)
- URL: https://goldengoosetees.com/api/webhooks/printful
- Events: mockup_task_finished, package_shipped, order_failed, order_updated
- Copy Webhook Secret → PRINTFUL_WEBHOOK_SECRET

### Local Dev
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Use printed signing secret as STRIPE_WEBHOOK_SECRET in .env.local
```

## SUPABASE SETUP
```bash
npx supabase db push                      # Apply migrations
npx ts-node scripts/seed-products.ts     # Seed product catalog
```
Storage buckets required (Public): `designs`, `assets`

## DEPLOYMENT CHECKLIST
Pre-Deploy:
- [ ] npm run build passes
- [ ] npx tsc --noEmit → 0 errors
- [ ] All env vars set in Vercel Production scope
- [ ] Supabase migrations applied + products seeded

Post-Deploy:
- [ ] goldengoosetees.com loads
- [ ] /studio loads, canvas initializes
- [ ] Vercel Functions logs clean
- [ ] Stripe + Printful webhooks show active/registered

Rollback: `vercel rollback --scope intellme goldengoosetees-studio`

## 500 ERROR PROTOCOL
1. Vercel → Deployments → latest → Functions → click failing route → view logs
2. ERR_MODULE_NOT_FOUND → env var missing or import path error
3. 401 from Printful → PRINTFUL_API_KEY missing/expired in Vercel Production
4. 400 from Stripe → STRIPE_WEBHOOK_SECRET mismatch or req.json() used instead of req.text()
5. Fix → redeploy or push to main

## PRINTFUL TOKEN ROTATION
Tokens expire. When rotating: create new token (same scopes) → update PRINTFUL_API_KEY
in Vercel → redeploy → delete old token.
Required scopes: catalog/read, files/write, mockup-tasks, orders, webhooks, shipping/read
