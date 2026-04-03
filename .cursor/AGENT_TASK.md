# GoldenGooseTees Studio — Agent Architecture Reference
# .cursor/AGENT_TASK.md

## Repository & Deployment

- **GitHub:** GooseyPrime/goldengoosetees-studio
- **Vercel:** Team `intellme` → project `goldengoosetees-studio`
- **Production branch:** `main` → auto-deploys on push
- **Domain:** goldengoosetees.com
- **Stack:** Next.js 14 App Router + TypeScript + Supabase + Stripe + Printful API v2

---

## API Layout — DO NOT RESTRUCTURE

Serverless handlers live in `api/` and import shared code from `api/_lib/`.
The bundler includes `_lib` files in each function bundle — this is correct and intentional.

**Do NOT:**
- Inline `_lib` code into every handler
- Delete `api/_lib/`
- Move shared utilities unless you have production logs proving an import failure

**If a route returns 500 on Vercel:**
1. Vercel Dashboard → Deployments → latest → Functions → Logs for the specific route
2. Confirm ALL env vars are set for Production scope (not just Preview)
   Required: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, PRINTFUL_API_KEY, PRINTFUL_STORE_ID,
   PRINTFUL_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL, ENABLED_PRODUCT_IDS
3. Reproduce locally: `vercel dev` or `npm run build && npm start`

---

## System Architecture

```
[Browser]
  └─ Next.js 14 App Router (Vercel)
       ├─ /app/(store)/        ← customer pages (landing, shop, order success)
       ├─ /app/(studio)/       ← design editor (canvas, mockup review)
       ├─ /app/api/            ← ALL server-side API routes
       └─ /components/

[Backend Services]
  ├─ Supabase          ← Auth + PostgreSQL + Storage (design files) + Realtime
  ├─ Stripe            ← Checkout sessions + Webhooks
  ├─ Printful API v2   ← Catalog + File upload + Mockup tasks + Orders
  └─ Google Gemini     ← AI design generation (prompts in api/_lib/)
```

---

## Critical Data Flows

### Flow 1: Design Session Start
```
1. User selects product
2. App calls GET /api/printful/catalog → products_catalog DB (or Printful if stale)
3. App calls GET /api/printful/variants/[productId]
4. If product has multiple placements: show PlacementSelector modal
5. User selects placements → session initialized
6. One Fabric.js canvas instance created per selected placement
7. Design record created in DB: { user_id/session_id, selected_product_id,
   selected_placements: ['front', 'back'], canvas_data: {}, status: 'draft' }
```

### Flow 2: Design Save (auto, debounced 2s)
```
1. canvas.on('object:modified') → debounce 2000ms
2. POST /api/designs/save
   Body: { designId, sessionId, productId, selectedPlacements, activePlacement, canvasJson }
3. Server upserts designs.canvas_data[activePlacement] = canvasJson
4. Returns { success: true, data: { designId } }
```

### Flow 3: Generate Mockups (user-triggered)
```
1. User clicks "Generate Mockups"
2. For each selected placement:
   a. canvas.setDimensions({ width: exportPx, height: exportPx })
   b. dataUrl = canvas.toDataURL('image/png', 1.0)
   c. Restore canvas to 800×800
   d. POST /api/designs/upload-file { designId, placement, imageDataUrl }
      → Server uploads to Supabase Storage: designs/{userId}/{designId}/{placement}/design_final.png
      → Server calls Printful POST /v2/files with public URL
      → Server saves placement_file_ids[placement] = printful_file_id
      → Server saves placement_file_urls[placement] = supabase_public_url
3. POST /api/printful/mockup-task { designId }
   → Server builds files array from ALL placement_file_ids
   → POST /v2/mockup-tasks { product_id, variant_ids, files: [{placement, file_id}], format:'png' }
   → Saves task_id to designs.mockup_task_ids, sets mockup_status = 'pending'
4. UI shows loading state, polls every 3s OR listens via Supabase Realtime
```

### Flow 4: Mockup Complete (async)
```
Option A - Webhook (preferred):
  Printful fires POST /api/webhooks/printful with type: 'mockup_task_finished'
  Handler parses catalog_variant_mockups → updates designs.mockup_results
  Sets designs.mockup_status = 'complete', updates updated_at (triggers Realtime)

Option B - Polling (fallback):
  Client polls GET /api/printful/mockup-task/[taskId] every 3s
  When status = 'completed': updates DB, client transitions to mockup review
```

### Flow 5: Mockup Review + Checkout
```
1. /studio/mockups page loads design mockup_results
2. User sees: per-placement mockup images + color swatches + size selector
3. User picks color (variant) + size + quantity
4. Price calculated live from products.config.ts
5. User clicks "Checkout"
6. POST /api/checkout/create-session { designId, variantId, quantity, shippingAddress? }
   → Server validates: all placements have file_ids, mockup_status === 'complete'
   → Server recalculates price server-side (NEVER trusts client price)
   → Creates Stripe Checkout session with metadata: { designId, variantId, quantity }
   → Creates order record: status = 'pending_payment'
7. Client redirects to Stripe hosted checkout URL
```

### Flow 6: Payment + Order Fulfillment
```
1. Customer pays on Stripe → Stripe fires 'checkout.session.completed' webhook
2. POST /api/webhooks/stripe
   → Verifies Stripe signature (raw body, HMAC)
   → Checks order not already 'paid' (idempotency)
   → Updates order status = 'paid'
   → Loads design, builds Printful order items with all placements
   → POST /v2/orders to Printful
   → Updates order: printful_order_id, status = 'submitted'
   → Returns 200 immediately
3. Printful processes and ships → fires 'package_shipped' webhook
4. POST /api/webhooks/printful → updates order status = 'shipped'
```

---

## Placement Data Model

Each design supports multiple print placements. All placement data is stored as JSONB:

```typescript
// designs table (Supabase)
{
  selected_placements: ['front', 'back'],    // TEXT[]
  canvas_data: {                              // JSONB
    front: { /* Fabric.js JSON */ },
    back: { /* Fabric.js JSON */ }
  },
  placement_file_urls: {                      // JSONB
    front: 'https://supabase.../front/design_final.png',
    back: 'https://supabase.../back/design_final.png'
  },
  placement_file_ids: {                       // JSONB
    front: 'pf_file_id_abc123',
    back: 'pf_file_id_xyz456'
  },
  mockup_task_ids: {                          // JSONB
    combined: 752213059                       // single task handles all placements
  },
  mockup_results: {                           // JSONB
    front: [
      { catalog_variant_id: 4011, mockup_url: 'https://cdn.printful.com/...' },
      { catalog_variant_id: 4012, mockup_url: 'https://cdn.printful.com/...' }
    ],
    back: [ ... ]
  },
  mockup_status: 'complete'                   // pending | partial | complete | failed
}
```

---

## Products & Pricing Reference

| Product | Printful ID | Front Only | +Back | +2XL | +3XL |
|---------|------------|-----------|-------|------|------|
| Bella+Canvas 3001 T-Shirt | 71 | $28 | +$5 | +$2 | +$4 |
| Gildan 18000 Crewneck | 378 | $38 | +$5 | +$2 | +$4 |
| BC 3719 Hoodie | 380 | $55 | +$5 | +$2 | +$4 |
| 11oz Mug | 19 | $22 | — | — | — |

Controlled by: `ENABLED_PRODUCT_IDS` env var + `lib/config/products.config.ts`

---

## Printful API v2 Quick Reference

**Base URL:** `https://api.printful.com/v2`
**Auth:** `Authorization: Bearer {PRINTFUL_API_KEY}`
**Store context:** `X-PF-Store-Id: {PRINTFUL_STORE_ID}` (required for store-scoped endpoints)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get catalog product | GET | /v2/catalog-products/{id} |
| Get mockup styles | GET | /v2/catalog-products/{id}/mockup-styles |
| Get variants | GET | /v2/catalog-products/{id}/variants |
| Upload file | POST | /v2/files |
| Create mockup task | POST | /v2/mockup-tasks |
| Poll mockup task | GET | /v2/mockup-tasks?id={task_id} |
| Create order | POST | /v2/orders |

---

## Webhook Endpoints (must be registered in Printful developer portal)

| Webhook | URL | Handler |
|---------|-----|---------|
| mockup_task_finished | https://goldengoosetees.com/api/webhooks/printful | Update mockup_results |
| package_shipped | https://goldengoosetees.com/api/webhooks/printful | Update order status |
| order_failed | https://goldengoosetees.com/api/webhooks/printful | Alert + status update |
| checkout.session.completed | https://goldengoosetees.com/api/webhooks/stripe | Create Printful order |

---

## Supabase Storage Structure

```
Bucket: designs (PUBLIC — Printful needs public URLs)
  designs/{userId|'anon'}/{designId}/front/design_final.png
  designs/{userId|'anon'}/{designId}/back/design_final.png
  designs/{userId|'anon'}/{designId}/sleeve_left/design_final.png

Bucket: assets (PUBLIC)
  product-thumbnails/
  brand/
```

---

## Known Issues & Audit Items

- [ ] Verify all Printful calls use v2 endpoints (audit existing api/ handlers)
- [ ] Confirm mockup task creation is NOT being awaited synchronously
- [ ] Confirm printful_file_id reuse across mockup + order creation
- [ ] Verify Stripe webhook uses raw body (req.text, not req.json)
- [ ] Verify anonymous session → auth migration runs in auth callback
- [ ] Verify RLS policies on designs table support session_id for anonymous users
- [ ] Run: npx tsc --noEmit → fix all TypeScript errors before deploying
- [ ] Register both webhooks (Printful + Stripe) to production URLs

---

For human-facing setup steps, see README.md and docs/PRODUCTION_CHECKLIST.md
