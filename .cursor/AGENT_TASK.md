# Cursor agent: GoldenGooseTees completion

## Truth source (read first)

- **Stack:** Next.js 14 App Router (`app/`), not Vite. The **DETAILED_AUDIT_REPORT.md** (2026-04-06) describes an older **Vite + `/api/*.ts` serverless** layout; that structure is **not** in this repo anymore.
- **What exists:** `lib/printful/client.ts` (v2), `lib/config/products.config.ts`, `GET /api/printful/catalog`, `components/DesignStudio.tsx` fetches catalog; other `app/api/*` routes still stubs.
- **Product curation:** `PRINTFUL_CURATED_PRODUCT_IDS` (comma-separated catalog product IDs) per `PRINTFUL_SETUP.md` and `.env.example`. Code also accepts `ENABLED_PRODUCT_IDS` / `NEXT_PUBLIC_ENABLED_PRODUCT_IDS` in `getEnabledProducts()`.

## Audit findings vs current repo

| Audit item | Status in this repo |
|------------|---------------------|
| Next.js App Router + `app/api/*/route.ts` | **Done** (audit was wrong for current tree) |
| `lib/printful/client.ts` at repo root | **Done** |
| `lib/config/products.config.ts` | **Done** |
| Vite / `import.meta.env.VITE_ENABLED_PRODUCT_IDS` | **N/A** — use `process.env` / `NEXT_PUBLIC_*` |
| Wrong `/api/printful/catalog` vs `/list` duplicate | **Was Vite-era** — implement **one** canonical `GET /api/printful/catalog` (Next route) |
| Catalog calls Printful v2 + returns variants | **Implemented in** `app/api/printful/catalog/route.ts` (agent: keep in sync) |
| `products_catalog` DB cache + 24h TTL | **Outstanding** — optional perf layer; not required for first working catalog |
| Multi-placement schema migration `002_multi_placement_schema.sql` | **Exists** — verify applied on prod Supabase; base `designs` table in `schema.sql` may need alignment |
| Stripe webhook raw body + signature | **Outstanding** — `app/api/webhooks/stripe/route.ts` is still TODO |
| Printful webhook verify + mockup_task_finished | **Outstanding** — `app/api/webhooks/printful/route.ts` is still TODO |
| Real mockup: Printful upload + mockup-tasks | **Outstanding** — `app/api/mockup/generate/route.ts` is placeholder |
| Real AI generate/edit | **Outstanding** — `app/api/ai/*` are placeholders |
| Scripts: `printful-resolve-launch`, `seed-products` | **Partial** — `scripts/printful-resolve-launch-products.ts` added; expand as needed |
| `vercel.json` webhook `maxDuration` | **Partial** — `maxDuration` set for Stripe/Printful routes; tune as needed |
| `middleware.ts` auth | **Outstanding** |
| Per-placement AI **or** upload (any mix) | **Outstanding** — UX + API; see plan in prior conversation |

## Priority order for the next agent

1. **Catalog path:** Ensure `GET /api/printful/catalog` works with `PRINTFUL_API_KEY` + curated IDs; UI lists products.
2. **Design session:** Per-placement state (upload + AI slots), variant/color selection, align with `lib/config/products.config.ts` placements.
3. **Printful file upload + mockup-tasks** + poll or webhook; replace placeholder mockup route.
4. **Stripe:** Checkout session creation + webhook with **raw body** verification; server-side totals (see `Printful_Pricing_GoldenGooseTees.md`, `docs/pricing.md`).
5. **Printful order** after payment; webhook handlers.
6. **Optional:** `printful_variant_price_cache` cron, `products_catalog` cache, comprehensive migrations bundle.

## Commands

```bash
npm run build
npm run lint
npm test
npm run printful-resolve-launch   # needs PRINTFUL_API_KEY
```

## Files the implementing agent owns

- `app/api/printful/**` — Printful proxy routes
- `components/DesignStudio.tsx` — main UX (grow incrementally)
- `lib/offerings.ts` — curated ID resolution
- `app/api/webhooks/*` — payment + Printful
- `scripts/*` — CLI helpers

Do not expose `PRINTFUL_API_KEY` to the client. Prefer server routes for all Printful calls.
