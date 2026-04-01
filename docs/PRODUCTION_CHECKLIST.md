# Production deployment checklist

Use this before and after promoting to production on Vercel.

## Source of truth

| Item | Value |
|------|--------|
| **GitHub** | [GooseyPrime/goldengoosetees-studio](https://github.com/GooseyPrime/goldengoosetees-studio) |
| **Vercel** | Team **intellme** → project [goldengoosetees-studio](https://vercel.com/intellme/goldengoosetees-studio) |
| **Production branch** | `main` (pushes trigger builds) |

## Pre-deploy

- [ ] `npm run build` (or `pnpm run build`) passes locally
- [ ] `npm run test` / `npx vitest run` passes if you run unit tests
- [ ] `npm run lint` passes (or known issues documented)

## Vercel (Production environment)

- [ ] **Git** integration points at GooseyPrime repo; production branch is `main`
- [ ] All variables from [README.md](../README.md) are set for **Production** (not only Preview)
- [ ] `VITE_APP_URL` matches the canonical site URL (for OAuth redirects and absolute links)

## Supabase

- [ ] Migrations applied on the production project
- [ ] RLS and storage policies verified for production

## Stripe

- [ ] Live keys in Production env; webhooks target production domain
- [ ] Test one checkout path (test mode or small live transaction per policy)

## Printful

- [ ] API key and store ID set server-side only
- [ ] Admin or catalog path smoke-tested against live API

## Pricing v2 (optional)

When enabling dynamic pricing / server fulfillment, see [docs/pricing.md](./pricing.md).

- [ ] Run `supabase/migrations/001_pricing_system.sql` on production
- [ ] Set `PRICING_V2_ENABLED`, `VITE_PRICING_V2_ENABLED` together after smoke-testing quotes
- [ ] Set `SERVER_FULFILLMENT_ENABLED`, `VITE_SERVER_FULFILLMENT_ENABLED` together; verify Stripe webhook uses **raw body** (deployed handler)
- [ ] `CRON_SECRET` set if invoking cron manually; Vercel Cron hits `/api/cron/refresh-variant-cache`

## Post-deploy smoke tests

- [ ] Landing page loads; hero image and fonts render
- [ ] Gallery / product list loads (catalog API or KV fallback)
- [ ] Design flow: chat or brief → generate (or clear “unavailable” message if AI keys missing)
- [ ] `/api/ai/chat` or another lightweight API returns expected status (not 500)
- [ ] Checkout can be started (Stripe session creation)

## If `/api/*` returns 500

1. Vercel → Deployment → **Functions** / **Runtime logs** for the route.
2. Confirm secrets and Node runtime; do **not** delete `api/_lib` without evidence—see [.cursor/AGENT_TASK.md](../.cursor/AGENT_TASK.md).
