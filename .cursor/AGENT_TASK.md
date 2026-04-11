# Cursor agent: GoldenGooseTees completion

## Truth source (read first)

- **Stack:** Next.js 14 App Router (`app/`), not Vite. The **DETAILED_AUDIT_REPORT.md** (2026-04-06) describes an older **Vite + `/api/*.ts` serverless** layout; that structure is **not** in this repo anymore.
- **Studio flow:** `components/DesignStudio.tsx` + persistent `StudioChatPanel` — browse → variant → per-placement upload or AI → mockups → review → checkout. Chat calls `POST /api/ai/chat` (gpt-4o-mini + tools: select product/variant, navigate, placement focus, generate/edit via DALL·E, start mockups, prepare checkout). Requires `PRINTFUL_API_KEY`, `OPENAI_API_KEY`, Supabase bucket `design-uploads`, `STRIPE_SECRET_KEY`.
- **Product curation:** `PRINTFUL_CURATED_PRODUCT_IDS` per `PRINTFUL_SETUP.md` and `.env.example`. Also `ENABLED_PRODUCT_IDS` / `NEXT_PUBLIC_ENABLED_PRODUCT_IDS` in `getEnabledProducts()`.

## Audit findings vs current repo

| Audit item | Status in this repo |
|------------|---------------------|
| Next.js App Router + `app/api/*/route.ts` | **Done** |
| Catalog `GET /api/printful/catalog` | **Done** |
| Stripe webhook raw body + signature | **Done** — `app/api/webhooks/stripe/route.ts` |
| Printful webhook verify | **Partial** — HMAC if `PRINTFUL_WEBHOOK_SECRET` set; confirm header name vs Printful dashboard |
| Mockup: `POST /api/printful/mockup-task` + `GET ?id=` poll | **Done** |
| AI generate/edit | **Done** — `/api/ai/generate`, `/api/ai/edit` (OpenAI) |
| Supabase upload | **Done** — `/api/designs/upload` → bucket `design-uploads` |
| Printful file library | **Done** — `POST /api/printful/files` |
| Checkout | **Done** — `POST /api/checkout` Stripe session; metadata for fulfillment |
| Printful order after payment | **Partial** — webhook creates draft order; confirm v2 payload + confirm step for production |
| `products_catalog` DB cache | **Optional** |
| `middleware.ts` auth | **Outstanding** if accounts required |
| Pricing v2 / estimate-costs | **Outstanding** — see `docs/pricing.md` |

## Next hardening (suggested)

1. Validate Printful webhook signature header against live docs; persist orders in Supabase from webhooks.
2. Replace retail heuristic with `POST /orders/estimate-costs` when pricing v2 ships.
3. Add automated tests for `computeRetailCents` and mockup payload shape.

## Commands

```bash
npm run build
npm run lint
npm test
npm run printful-resolve-launch   # needs PRINTFUL_API_KEY
```

Do not expose `PRINTFUL_API_KEY` to the client.
