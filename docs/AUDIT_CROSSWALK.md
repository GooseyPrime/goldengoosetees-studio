# DETAILED_AUDIT_REPORT.md vs this repository (2026-04-11)

The audit dated **2026-04-06** assumed a **Vite SPA** with **`/api/*.ts` Vercel functions** and paths like `src/hooks/usePrintfulCatalog.ts`. **This repository is Next.js 14** with `app/` and `app/api/**/route.ts`. Treat the audit as a **functional checklist**, not a file path map.

## Findings that no longer apply (architecture)

- Vite vs Next mismatch — **resolved**: Next App Router is in use.
- `api/_lib/printful-client.ts` vs `lib/printful/client.ts` — **resolved**: client lives at `lib/printful/client.ts`.
- Wrong `/api/printful/catalog` returning only static config — **addressed**: canonical route is `GET app/api/printful/catalog/route.ts`, which calls Printful v2 and merges `lib/config/products.config.ts`.
- `VITE_ENABLED_PRODUCT_IDS` — **N/A**; use `PRINTFUL_CURATED_PRODUCT_IDS` or `ENABLED_PRODUCT_IDS` / `NEXT_PUBLIC_ENABLED_PRODUCT_IDS` (see `lib/offerings.ts`, `getEnabledProducts()`).

## Still outstanding (from audit + product goals)

| Item | Notes |
|------|--------|
| Stripe webhook | Raw body + signature verification; create sessions with server totals |
| Printful webhook | Verify signature; `mockup_task_finished`, order lifecycle |
| Mockup pipeline | Replace placeholder `app/api/mockup/generate` with file upload + v2 mockup tasks |
| AI routes | Replace placeholders in `app/api/ai/*` |
| `products_catalog` DB cache | Optional 24h cache (audit suggested); not required for minimal catalog |
| Unified initial migration | `schema.sql` + fragmented migrations; align `designs` with `002_multi_placement_schema.sql` on prod |
| `vercel.json` | Add `functions` `maxDuration` for webhook routes when implemented |
| `middleware.ts` | Auth / protected routes if required |
| Scripts | `seed-products.ts` still missing if you need DB seeding |
| Per-placement upload + AI mix | Full studio UX (see `.cursor/AGENT_TASK.md`) |

## Implemented in this iteration

- `lib/offerings.ts` — curated ID resolution
- `GET /api/printful/catalog` — Printful v2 product + variants + local config merge
- `components/DesignStudio.tsx` — fetches catalog and renders product cards
- `scripts/printful-resolve-launch-products.ts` — verify IDs against API
- `tsconfig.json` — `@/*` → repo root for clean imports
- `getEnabledProducts()` — reads `PRINTFUL_CURATED_PRODUCT_IDS` first
