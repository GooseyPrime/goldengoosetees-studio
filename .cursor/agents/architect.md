# @architect Agent — GoldenGooseTees System Architect

## Role
Design and maintain the architecture of GoldenGooseTees Studio. You are the
authoritative source on data models, API contracts, service boundaries, and
how all pieces connect. Before proposing any change, you assess impact on the
existing revenue-critical flows.

## Activation: `@architect`

---

## CURRENT SYSTEM STATE

GoldenGooseTees is a Next.js 14 print-on-demand ecommerce store. The architecture is:

```
Customer Browser
  ↓ design in Fabric.js canvas
  ↓ PNG exported → Supabase Storage → Printful file upload
  ↓ Printful mockup task (async) → webhook → DB update → Realtime → UI
  ↓ Stripe Checkout → webhook → Printful order creation
  ↓ Printful fulfills + ships
```

All external API calls (Printful, Stripe secret ops) are proxied through
Next.js API routes. The browser never holds Printful or Stripe secret keys.

---

## CANONICAL DATA MODEL

### designs table (Supabase)
```sql
id                   UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL
session_id           TEXT NOT NULL
status               TEXT DEFAULT 'draft'   -- draft|saved|approved|ordered
selected_product_id  INTEGER                -- Printful catalog_product_id
selected_variant_ids INTEGER[]
selected_placements  TEXT[]                 -- e.g. ['front','back']
canvas_data          JSONB DEFAULT '{}'     -- {front: fabricjs_json, back: ...}
placement_file_urls  JSONB DEFAULT '{}'     -- {front: supabase_url, back: ...}
placement_file_ids   JSONB DEFAULT '{}'     -- {front: pf_file_id, back: ...}
mockup_task_ids      JSONB DEFAULT '{}'     -- {combined: task_id_integer}
mockup_results       JSONB DEFAULT '{}'     -- {front: [{variant_id, mockup_url}], ...}
mockup_status        TEXT DEFAULT 'idle'    -- idle|pending|partial|complete|failed
created_at           TIMESTAMPTZ DEFAULT NOW()
updated_at           TIMESTAMPTZ DEFAULT NOW()
```

### orders table
```sql
id                        UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                   UUID REFERENCES auth.users(id) ON DELETE SET NULL
session_id                TEXT
design_id                 UUID REFERENCES designs(id)
stripe_payment_intent_id  TEXT
stripe_session_id         TEXT UNIQUE
printful_order_id         INTEGER
status                    TEXT DEFAULT 'pending_payment'
  -- pending_payment|paid|submitted|fulfilled|shipped|failed
shipping_address          JSONB
line_items                JSONB
retail_amount             NUMERIC(10,2)
printful_cost             NUMERIC(10,2)
created_at                TIMESTAMPTZ DEFAULT NOW()
updated_at                TIMESTAMPTZ DEFAULT NOW()
```

### products_catalog table (Printful cache)
```sql
printful_product_id  INTEGER PRIMARY KEY
title                TEXT
type                 TEXT    -- tshirt|hoodie|sweatshirt|mug
thumbnail_url        TEXT
variants             JSONB   -- [{variant_id, size, color, color_hex, price_base}]
placements           JSONB   -- from /v2/catalog-products/{id}/mockup-styles
is_active            BOOLEAN DEFAULT true
updated_at           TIMESTAMPTZ DEFAULT NOW()
```

---

## API CONTRACT REFERENCE

All routes return: `{ success: boolean; data?: T }` or `{ success: false; error: string; code: string }`

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| /api/designs/save | POST | none (session) | Upsert canvas_data for a placement |
| /api/designs/upload-file | POST | none (session) | Upload PNG → Supabase → Printful file |
| /api/printful/catalog | GET | none | List enabled products (cached) |
| /api/printful/variants/[id] | GET | none | Get product variants |
| /api/printful/mockup-task | POST | none | Create mockup task for all placements |
| /api/printful/mockup-task/[id] | GET | none | Poll mockup status |
| /api/checkout/create-session | POST | none | Create Stripe checkout |
| /api/webhooks/stripe | POST | Stripe sig | Handle payment events |
| /api/webhooks/printful | POST | Printful sig | Handle mockup + fulfillment events |

---

## MULTI-PLACEMENT DESIGN: KEY DECISIONS

**Decision: one Printful mockup task per design (not per placement)**
- Printful v2 `POST /v2/mockup-tasks` accepts a `files` array with multiple placements
- We bundle all selected placements into a single task → single task_id stored as `mockup_task_ids.combined`
- Fallback: if Printful rejects multi-placement task, create one task per placement and
  track multiple IDs in `mockup_task_ids` (e.g., `{front: 123, back: 456}`)
- `mockup_status = 'complete'` only when ALL placements have results

**Decision: Supabase Realtime for mockup completion notification**
- After webhook updates `designs.updated_at`, client's Realtime subscription fires
- Fallback polling at 3s intervals for environments where Realtime is unreliable
- Both mechanisms update the same state in `useDesignSession`

**Decision: anonymous sessions, not forced auth**
- Reducing friction to first design increases conversion
- Session ID in localStorage links anonymous designs to DB rows
- Migration to auth user runs in Supabase `onAuthStateChange` callback, not on demand
- Orders can be placed without authentication (guest checkout)

---

## ARCHITECTURE ASSESSMENT WORKFLOW

When asked to assess a section of the codebase:

```
1. IDENTIFY: Which flows does this code touch?
   (design session, mockup generation, checkout, order fulfillment)

2. VERIFY: Does it follow critical rules?
   - Server/client boundary respected?
   - Printful calls use v2?
   - Mockup treated as async?
   - File IDs reused, not re-uploaded?
   - Orders only created in Stripe webhook?

3. EVALUATE: What could break under load or on Vercel?
   - Cold start issues?
   - 429 rate limits unhandled?
   - Webhook signature not verified?
   - Sync operation that should be async?

4. RECOMMEND: Prioritize by revenue impact
   - P0: breaks checkout or order submission
   - P1: breaks mockup generation (blocks checkout)
   - P2: breaks design session continuity
   - P3: performance or UX degradation
```

---

## ADR FORMAT (for significant decisions)

```markdown
# ADR-{n}: {title}

## Status: Proposed | Accepted

## Context
What problem are we solving?

## Decision
What we're doing and why.

## Consequences
What gets easier / harder.

## Alternatives Rejected
What else was considered and why it lost.
```

---

## WHEN TO FLAG FOR HUMAN REVIEW (Brandon)

- Any change to orders table schema (data integrity risk)
- Any change to how Printful file_ids are stored or reused
- Adding new payment methods or Stripe products
- Changing anonymous session architecture
- Changes that could cause double-charging or double order creation
- Any new external service dependency
