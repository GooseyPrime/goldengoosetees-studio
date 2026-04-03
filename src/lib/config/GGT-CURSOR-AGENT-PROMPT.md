# GoldenGooseTees — Cursor Agent Design System Overhaul Prompt
# Paste this in full into Cursor Composer (Ctrl+I) with the repo open.
# Uses: ggt-coder (DeepSeek) model on VICTUS via Cursor custom endpoint.
# Prerequisites: .cursorrules in repo root, docs/goldengoosetees-knowledge.md present.

---

## MASTER PROMPT — PASTE THIS INTO CURSOR COMPOSER

```
You are performing a complete design system overhaul of GoldenGooseTees Studio.
Read docs/goldengoosetees-knowledge.md and docs/ggt-multi-placement-addendum.md
in full before writing a single line of code. Then execute the following plan
in order. Do not skip steps. Do not ask permission to proceed between steps —
work through the entire plan autonomously and report what you've built at the end.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1: AUDIT EXISTING CODE (READ-ONLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scan the entire codebase and locate:
1. Every file that imports or calls any Printful API endpoint
2. Every file that contains the string 'mockup' (case insensitive)
3. Every file that uses PRINTFUL_API_KEY or any Printful-related env var
4. Every API route under /app/api/
5. The current database schema (look for migration files, schema.sql, or
   Supabase types)
6. The main canvas/design editor component(s)

Create a file: docs/audit-report.md
Document every issue you find including:
- Files calling Printful v1 endpoints (must be updated to v2)
- Files that await mockup results synchronously (must be made async)
- Any Printful calls happening client-side (must be moved server-side)
- Any hardcoded product/variant IDs
- Any hardcoded prices
- Missing error handling in API routes
- Missing webhook signature verification

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2: FOUNDATION FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create or OVERWRITE these files completely:

2A. lib/config/products.config.ts
    — Copy from docs/products.config.ts (provided)
    — This is the single source of truth for all product/placement/pricing data

2B. lib/printful/client.ts  (SERVER-SIDE ONLY — never imported in components)
    Create a typed Printful API v2 client with:
    - Base URL: https://api.printful.com/v2
    - Auth: Bearer token from process.env.PRINTFUL_API_KEY
    - Header: X-PF-Store-Id from process.env.PRINTFUL_STORE_ID
    - Rate limit handling: on 429 response, wait X-Ratelimit-Reset seconds
      then retry (max 3 retries with exponential backoff)
    - Standard response type: { success: boolean; data?: T; error?: string }
    - Export typed functions:
        printfulGet<T>(path: string): Promise<T>
        printfulPost<T>(path: string, body: unknown): Promise<T>
    - NO default export — named exports only

2C. lib/printful/types.ts
    Define TypeScript interfaces for:
    - PrintfulCatalogProduct
    - PrintfulCatalogVariant
    - PrintfulMockupStyle (placement, technique, print_area_width/height, dpi)
    - PrintfulMockupTask (id, status, catalog_variant_mockups, failure_reasons)
    - PrintfulMockupVariantResult (catalog_variant_id, mockups[])
    - PrintfulFile (id, url, preview_url, filename)
    - PrintfulOrder (id, status, recipient, items)
    - PrintfulOrderItem (catalog_variant_id, quantity, files[])
    - PrintfulWebhookEvent (type, data)

2D. lib/supabase/server.ts
    Server-side Supabase client using service role key.
    Must use createClient from @supabase/supabase-js with:
    - process.env.NEXT_PUBLIC_SUPABASE_URL
    - process.env.SUPABASE_SERVICE_ROLE_KEY
    Named export: getSupabaseAdmin()

2E. lib/supabase/client.ts
    Browser-side Supabase client (anon key only).
    Use createBrowserClient from @supabase/ssr.
    Named export: createSupabaseBrowserClient()

2F. supabase/migrations/001_initial_schema.sql
    Write complete schema migration:
    
    -- users table (mirrors auth.users)
    -- designs table with ALL columns from knowledge doc including:
       id, user_id, session_id, status, selected_product_id,
       selected_variant_ids, selected_placements (TEXT[]),
       canvas_data (JSONB), placement_file_ids (JSONB),
       placement_file_urls (JSONB), mockup_task_ids (JSONB),
       mockup_results (JSONB), mockup_status, created_at, updated_at
    -- orders table with ALL columns from knowledge doc
    -- products_catalog table
    -- All RLS policies from knowledge doc
    -- updated_at trigger on designs and orders tables

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3: ALL API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create or OVERWRITE every API route. Each route must:
- Be in /app/api/ using Next.js 14 App Router route handlers
- Return { success: true, data: X } or { success: false, error: string, code: string }
- Have full try/catch with console.error logging
- Never expose secrets to client
- Validate request body before processing

3A. POST /app/api/designs/save/route.ts
    Body: { designId?, sessionId, productId, selectedPlacements, activePlacement, canvasJson }
    - If designId provided: update existing design's canvas_data for activePlacement
    - If no designId: create new design record, return new designId
    - Upsert canvas_data[activePlacement] = canvasJson
    - Update designs.updated_at
    Returns: { success: true, data: { designId: string } }

3B. POST /app/api/designs/upload-file/route.ts
    Body: { designId, placement, imageDataUrl }
    - Validate imageDataUrl is a PNG data URL
    - Decode base64, upload to Supabase Storage:
      path: designs/{userId || 'anon'}/{designId}/{placement}/design_final.png
    - Get public URL from Supabase Storage
    - Update designs.placement_file_urls[placement] = publicUrl
    - Call Printful POST /v2/files with the public URL
    - Save returned Printful file id to designs.placement_file_ids[placement]
    Returns: { success: true, data: { fileId: string, fileUrl: string } }

3C. POST /app/api/printful/mockup-task/route.ts
    Body: { designId }
    - Load design from DB, verify all selected_placements have placement_file_ids
    - Build files array: selected_placements.map(p => ({ placement: p, file_id: ... }))
    - POST to Printful /v2/mockup-tasks with product_id, variant_ids, files, format:'png'
    - Save task id to designs.mockup_task_ids and set mockup_status='pending'
    Returns: { success: true, data: { taskId: number } }

3D. GET /app/api/printful/mockup-task/[taskId]/route.ts
    - GET /v2/mockup-tasks?id={taskId} from Printful
    - If status === 'completed': parse catalog_variant_mockups into mockup_results shape
      and update designs table. Set mockup_status='complete'.
    - If status === 'failed': set mockup_status='failed', log failure_reasons
    Returns: { success: true, data: { status: string, mockupResults?: ... } }

3E. GET /app/api/printful/catalog/route.ts
    - Read ENABLED_PRODUCT_IDS from env
    - For each ID: check products_catalog cache in DB
    - If cache miss or >24h old: fetch from Printful /v2/catalog-products/{id}
      and /v2/catalog-products/{id}/mockup-styles, cache in DB
    - Return enabled products with placements
    Returns: { success: true, data: ProductConfig[] }

3F. GET /app/api/printful/variants/[productId]/route.ts
    - Fetch variants for productId from products_catalog DB (or Printful if missing)
    - Filter to defaultColors from products.config.ts
    Returns: { success: true, data: PrintfulCatalogVariant[] }

3G. POST /app/api/checkout/create-session/route.ts
    Body: { designId, variantId, quantity, shippingAddress? }
    - Load design from DB
    - Validate: all placements have file_ids, mockup_status === 'complete'
    - Calculate price SERVER-SIDE using calculateRetailPrice() from products.config.ts
    - Create Stripe checkout session with:
        mode: 'payment'
        line_items: [{ price_data, quantity }]
        metadata: { designId, variantId, quantity, userId, sessionId }
        success_url, cancel_url
    - Create order record in DB with status 'pending_payment'
    Returns: { success: true, data: { checkoutUrl: string } }

3H. POST /app/api/webhooks/stripe/route.ts
    CRITICAL — follow exactly:
    - export const dynamic = 'force-dynamic'
    - Read raw body: const rawBody = await req.text()
    - Verify: stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
    - Handle 'checkout.session.completed':
        1. Check order not already 'paid' (idempotency)
        2. Update order status = 'paid'
        3. Load design, build Printful order items
        4. POST to Printful /v2/orders
        5. Update order: printful_order_id, status = 'submitted'
    - Return 200 immediately on valid signature even if processing fails
      (Stripe will retry otherwise — log errors, don't re-throw)

3I. POST /app/api/webhooks/printful/route.ts
    - Verify Printful webhook signature from X-Printful-Signature header
      using HMAC-SHA256 with PRINTFUL_WEBHOOK_SECRET
    - Handle 'mockup_task_finished':
        Parse event.data, update designs.mockup_results and mockup_status
        Trigger Supabase Realtime notification (update updated_at)
    - Handle 'package_shipped':
        Update orders.status = 'shipped'
        Store tracking info in orders table
    - Handle 'order_failed':
        Update orders.status = 'failed'
        Log to console (admin notification system can be added later)
    - Always return 200 after processing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4: STUDIO (DESIGN EDITOR) OVERHAUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4A. components/studio/PlacementSelector.tsx  ('use client')
    Props: { productId: number; onConfirm: (placements: string[]) => void }
    - Fetch available placements from /api/printful/catalog then filter by productId
    - Display as checklist with placement names and additional prices
    - Front is always pre-checked and cannot be unchecked
    - Show running total price as user checks/unchecks
    - "Start Designing" button disabled until at least front is selected
    - Modal style (renders over product selection page)

4B. components/studio/PlacementTabs.tsx  ('use client')
    Props: { 
      selectedPlacements: string[]
      activePlacement: string
      placementHasDesign: Record<string, boolean>
      onTabChange: (placement: string) => void
      onAddPlacement: () => void
      onRemovePlacement: (placement: string) => void
    }
    - Tab per placement with dot indicator if has content
    - "+ Add placement" button opens PlacementSelector
    - Right-click or X on non-front tabs to remove (with confirmation)

4C. components/studio/DesignCanvas.tsx  ('use client')
    Props: {
      placement: string
      productConfig: ProductConfig
      initialCanvasJson?: string
      onCanvasChange: (placement: string, json: string) => void
      onExportReady: (placement: string, dataUrl: string) => void
    }
    - Wrap Fabric.js canvas in React (use useEffect for init)
    - Canvas display size: 800×800px
    - Export size: productConfig.placements.find(p=>p.id===placement).canvasExportPx
    - Show print area overlay/guide (dashed border showing actual print area)
    - Toolbar: Add Text, Add Image (upload), Colors, Font picker, Undo, Redo, Clear
    - Auto-save canvas JSON via onCanvasChange (debounced 2000ms)
    - Export via: canvas.setDimensions({width: exportPx, height: exportPx}) 
                  then canvas.toDataURL('image/png', 1.0)
                  then restore display size

4D. hooks/useDesignSession.ts  ('use client' hook)
    Manages the complete design session state:
    - designId: string | null
    - sessionId: string (from localStorage, persisted)
    - selectedPlacements: string[]
    - activePlacement: string
    - canvasData: Record<string, string>  (placement → fabric JSON)
    - uploadStatus: Record<string, 'idle'|'uploading'|'done'|'error'>
    - mockupStatus: 'idle'|'pending'|'partial'|'complete'|'failed'
    - mockupResults: Record<string, MockupVariantResult[]>
    - Methods:
        saveCanvas(placement, json): debounced save to /api/designs/save
        uploadDesign(placement, dataUrl): calls /api/designs/upload-file
        generateMockups(): calls /api/printful/mockup-task
        pollMockupStatus(taskId): polls every 3s, stops when complete/failed
        addPlacement(placement): updates selectedPlacements, saves to DB
        removePlacement(placement): with cleanup of files/mockups for that placement
    - On mount: restore sessionId from localStorage, load existing design if designId in URL

4E. app/(studio)/studio/page.tsx
    Main studio page assembling all components:
    - If no product selected: show ProductPicker
    - If product selected but no placements chosen: show PlacementSelector
    - Main editor: PlacementTabs + DesignCanvas + DesignToolbar
    - Bottom bar: Save Draft button + "Generate Mockups" button
      (Generate Mockups disabled until all selected placements have uploaded files)
    - Uses useDesignSession hook for all state

4F. app/(studio)/studio/mockups/page.tsx
    Mockup review and checkout entry:
    - Load designId from searchParams
    - If mockup_status is 'pending': show loading spinner + "Generating your mockups..."
      Use Supabase Realtime to watch for designs table update
      As fallback: poll /api/printful/mockup-task/[taskId] every 3s
    - When complete: render MockupReviewScreen
    - MockupReviewScreen layout:
        For each placement: show placement name + mockup image
        Color selector: clicking a color loads mockup for that variant
        Size selector: S M L XL 2XL 3XL
        Price display: updates dynamically with placement/size selection
        [← Edit Designs] [Add to Cart / Checkout →] buttons
    - On checkout: POST /api/checkout/create-session, redirect to Stripe URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5: SHOP PAGES (MINIMAL FOR LAUNCH)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5A. app/(store)/shop/page.tsx
    - Fetch enabled products from /api/printful/catalog
    - Display product cards: thumbnail, name, starting price, "Design This →" button
    - Simple responsive grid, Tailwind CSS

5B. app/(store)/page.tsx (landing)
    - Hero: "Wear your truth. Loudly." tagline
    - Featured products grid (same as shop but limited to 4)
    - CTA button: "Start Designing →" → /studio

5C. app/(store)/order/success/page.tsx
    - Get Stripe session_id from searchParams
    - Call Stripe API to verify payment (server component)
    - Show: "Order confirmed! 🎉", order summary, estimated delivery
    - DO NOT create Printful order here (that's the webhook's job)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 6: SEED SCRIPT + DEPLOYMENT PREP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6A. scripts/seed-products.ts
    Node.js script (run with: npx ts-node scripts/seed-products.ts)
    - For each product in getEnabledProducts():
        1. Fetch from Printful: /v2/catalog-products/{id} (basic info)
        2. Fetch variants: /v2/catalog-products/{id}/variants  
        3. Fetch mockup styles: /v2/catalog-products/{id}/mockup-styles
        4. Upsert into products_catalog table
    - Log success/failure for each product
    - Must use PRINTFUL_API_KEY from .env.local

6B. .env.example
    Document ALL required env vars with descriptions:
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    SUPABASE_SERVICE_ROLE_KEY=
    PRINTFUL_API_KEY=
    PRINTFUL_STORE_ID=
    PRINTFUL_WEBHOOK_SECRET=
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
    STRIPE_SECRET_KEY=
    STRIPE_WEBHOOK_SECRET=
    NEXT_PUBLIC_APP_URL=
    ENABLED_PRODUCT_IDS=71,378,380,19

6C. vercel.json
    {
      "framework": "nextjs",
      "buildCommand": "npm run build",
      "functions": {
        "app/api/webhooks/stripe/route.ts": { "maxDuration": 30 },
        "app/api/webhooks/printful/route.ts": { "maxDuration": 10 }
      }
    }

6D. middleware.ts (repo root)
    - Protect /account/* routes: redirect to /login if not authenticated (Supabase)
    - Allow /studio/* unauthenticated (anonymous design sessions are OK)
    - Allow all /api/* routes (auth handled per-route)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 7: FINAL VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After completing all phases:

1. Run: npx tsc --noEmit
   Fix ALL TypeScript errors before reporting completion.

2. Check every API route file — ensure NO route imports directly from:
   - lib/printful/client.ts in a component file
   - PRINTFUL_API_KEY in any client component

3. Verify the following flow is achievable end-to-end by reading the code:
   a. Anonymous user lands on /studio
   b. Selects Bella+Canvas 3001
   c. Selects Front + Back placements
   d. Draws something on Front canvas, switches to Back, draws something
   e. Clicks "Generate Mockups"
   f. Both design PNGs upload to Supabase → file_ids stored → mockup task created
   g. Webhook fires → mockup_results stored → UI updates
   h. User picks color + size → clicks checkout
   i. Stripe session created → user pays → webhook fires → Printful order created

4. Update docs/audit-report.md with:
   - List of all files created/modified
   - Known remaining issues or TODOs
   - Instructions to run the seed script and deploy

Report completion with a summary of every file created or modified.
```

---
## HOW TO USE THIS PROMPT

1. Open VS Code / Cursor on GAGA-YOGA
2. Open the goldengoosetees-studio repo folder
3. Ensure .cursorrules is in the repo root (copy from provided file)
4. Ensure docs/ folder contains:
   - goldengoosetees-knowledge.md
   - ggt-multi-placement-addendum.md
   - products.config.ts (move to lib/config/products.config.ts)
5. Press Ctrl+I to open Cursor Composer
6. Select model: ggt-coder (your VICTUS DeepSeek endpoint)
7. Paste the prompt above in full
8. Hit Enter and let it run — it will execute all 7 phases autonomously

## AFTER CURSOR FINISHES

1. Review docs/audit-report.md it generates
2. Run: npm run dev — check for startup errors
3. Set all env vars in .env.local
4. Run: npx ts-node scripts/seed-products.ts
5. Check Supabase dashboard — verify products_catalog is populated
6. Test the /studio flow manually
7. Deploy to Vercel: vercel --prod
8. Register Stripe + Printful webhooks to production URLs
