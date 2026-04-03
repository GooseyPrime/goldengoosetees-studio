# GoldenGooseTees — Multi-Placement Design Flow
# ADDENDUM to goldengoosetees-knowledge.md
# Append this content to Section 6 of the master knowledge doc.

---

## 6B. MULTI-PLACEMENT DESIGN FLOW (CRITICAL UX + DATA)

### Overview
Products can support multiple print locations (front, back, left sleeve, right sleeve).
Each placement requires:
- Its own design canvas export (separate PNG)
- Its own Printful file upload → separate printful_file_id
- Its own mockup task → separate mockup_url
- Its own canvas JSON state

The customer flow must handle this gracefully from session start through checkout.

---

### Session Initialization Flow

When a user selects a product to design:

```
1. App calls GET /api/printful/catalog-products/{id}/mockup-styles
   → Returns available placements for this product with print area dimensions

2. If product has > 1 placement:
   → Show PlacementSelector modal/screen:
      "Which areas do you want to customize?"
      [x] Front Print — included
      [ ] Back Print — +$5.00
      [ ] Left Sleeve — +$5.00
      [ ] Right Sleeve — +$5.00
      [Start Designing →]

3. User selection saved as: session.selectedPlacements = ['front', 'back']

4. One DesignCanvas instance is created PER selected placement.
   Each canvas has:
   - Its own Fabric.js instance
   - Its own canvas JSON state (designs.canvas_data JSONB keyed by placement)
   - Its own upload state (designs.placement_files JSONB)
   - Its own mockup state (designs.placement_mockups JSONB)

5. If product has only 1 placement (e.g., mug): skip selector, go straight to canvas.
```

---

### Database Schema: Placement-Aware Design Storage

The `designs` table must store per-placement data. Update schema:

```sql
-- REPLACE single-placement columns with JSONB maps:

-- canvas_data: { "front": {fabricjs json}, "back": {fabricjs json} }
canvas_data          JSONB DEFAULT '{}'::jsonb,

-- placement_file_ids: { "front": "pf_file_id_abc", "back": "pf_file_id_xyz" }
placement_file_ids   JSONB DEFAULT '{}'::jsonb,

-- placement_file_urls: { "front": "https://supabase.../front.png", "back": "..." }
placement_file_urls  JSONB DEFAULT '{}'::jsonb,

-- mockup_task_ids: { "front": 752213059, "back": 752213060 }
mockup_task_ids      JSONB DEFAULT '{}'::jsonb,

-- mockup_results: {
--   "front": [
--     { "variant_id": 4011, "mockup_url": "https://cdn.printful.com/..." },
--     { "variant_id": 4012, "mockup_url": "https://cdn.printful.com/..." }
--   ],
--   "back": [...]
-- }
mockup_results       JSONB DEFAULT '{}'::jsonb,

-- selected_placements: ["front", "back"]
selected_placements  TEXT[] DEFAULT '{}',

-- mockup_status: "pending" | "partial" | "complete" | "failed"
-- partial = some placements done, others still processing
mockup_status        TEXT DEFAULT 'pending',
```

---

### Studio UI Structure: Multi-Canvas Editor

```
/app/(studio)/studio/page.tsx
  └─ <StudioLayout>
       ├─ <ProductHeader />          — product name, change product button
       ├─ <PlacementTabs>            — Tab per selected placement
       │    ├─ Tab: Front Print ●    — (dot = has design content)
       │    ├─ Tab: Back Print ○     — (empty circle = blank)
       │    └─ [+ Add placement]     — add more placements mid-session
       ├─ <DesignCanvas             — Shows active placement's canvas
       │     placement={activePlacement}
       │     designId={designId} />
       ├─ <DesignToolbar />          — text, graphics, colors, undo/redo
       └─ <ActionPanel>
            ├─ <SaveDraftButton />
            └─ <GenerateMockupsButton />  — only enabled when ≥1 placement has design
```

---

### Placement Change Mid-Session

Users can add or remove placements AFTER starting:

**Adding a placement:**
- User clicks "+ Add placement" tab
- If design already exists for another placement: offer to copy it as starting point
- Create new canvas instance for the new placement
- Update `designs.selected_placements` in DB
- Do NOT regenerate mockups for existing placements

**Removing a placement:**
- Warn user: "Removing this placement will delete your design for [Back Print]"
- On confirm: clear that placement's canvas_data, file_ids, mockup results from DB
- Update `designs.selected_placements`
- Recalculate price displayed to user

---

### Mockup Generation: Multi-Placement

When user clicks "Generate Mockups":

```typescript
// Server route: POST /api/printful/mockup-task
// Called ONCE but handles all selected placements

async function createMockupTasks(designId: string) {
  const design = await getDesign(designId) // from Supabase
  const tasks: Record<string, number> = {}

  // Create ONE mockup task per placement
  // Printful supports multiple files per task — use this when possible
  // to reduce API calls (front + back in one task)
  
  const files = design.selected_placements.map(placement => ({
    placement,
    file_id: design.placement_file_ids[placement], // MUST exist before calling
  }))

  // Single task with multiple placements (Printful v2 supports this)
  const task = await printful.post('/v2/mockup-tasks', {
    product_id: design.selected_product_id,
    variant_ids: design.selected_variant_ids,
    files,         // array of {placement, file_id}
    format: 'png',
  })

  await updateDesign(designId, {
    mockup_task_ids: { combined: task.data.id },
    mockup_status: 'pending',
  })
}
```

**Note:** If Printful returns an error for multi-file tasks, fall back to one task per placement and track each task_id separately in `mockup_task_ids`.

---

### Mockup Results: Selection Screen

After webhook fires (`mockup_task_finished`) and mockup URLs are stored:

```
/app/(studio)/studio/mockups/page.tsx
  └─ <MockupReviewScreen>
       ├─ <PlacementMockupSection placement="front">
       │    "Front Print Preview"
       │    Shows mockup images for each selected color variant
       │    [Black] [White] [Navy] [Dark Heather] ← color swatches
       │    Large mockup image updates on swatch click
       │
       ├─ <PlacementMockupSection placement="back">
       │    "Back Print Preview — +$5.00"
       │    [same color swatch UI]
       │    [Remove back print] ← option to drop this placement
       │
       ├─ <PriceSummary>
       │    Front Print: $28.00
       │    Back Print:  +$5.00
       │    ─────────────────
       │    Total: $33.00
       │    Size: [S][M][L][XL][2XL][3XL]
       │    Color: [color picker from available variants]
       │
       └─ [Edit Designs] [Proceed to Checkout →]
```

---

### Supabase Storage: Per-Placement File Paths

```
designs/{user_id}/{design_id}/front/design_final.png
designs/{user_id}/{design_id}/back/design_final.png
designs/{user_id}/{design_id}/front/design_draft_{ts}.png
designs/{user_id}/{design_id}/sleeve_left/design_final.png
```

---

### API Route: Auto-Fetch Placement Info

The Cursor agent should NEVER hardcode placement data. Instead:

```typescript
// lib/printful.ts — server-side only

export async function getProductPlacements(productId: number) {
  // 1. Check products_catalog table first (cache)
  const cached = await supabase
    .from('products_catalog')
    .select('placements')
    .eq('printful_product_id', productId)
    .single()
  
  if (cached.data?.placements) return cached.data.placements

  // 2. Fetch from Printful if not cached
  const res = await printfulFetch(`/v2/catalog-products/${productId}/mockup-styles`)
  const placements = res.data
  
  // 3. Cache in DB
  await supabase
    .from('products_catalog')
    .update({ placements, updated_at: new Date().toISOString() })
    .eq('printful_product_id', productId)
  
  return placements
}
```

---

### Placement Validation Before Checkout

Before creating Stripe session, server must verify:
1. All `selected_placements` have a corresponding `placement_file_ids` entry
2. All mockup tasks have `status: 'completed'` (not still pending)
3. Price matches recalculated server-side price

```typescript
// POST /api/checkout/create-session
if (design.selected_placements.some(p => !design.placement_file_ids[p])) {
  return { success: false, error: 'MISSING_DESIGN_FILE', 
           message: 'One or more placements are missing their design file.' }
}
if (design.mockup_status !== 'complete') {
  return { success: false, error: 'MOCKUPS_PENDING',
           message: 'Please wait for mockup generation to complete.' }
}
```

---

### Printful Order: Multi-Placement Items

```typescript
// In Stripe webhook handler, when creating Printful order:
const items = [{
  catalog_variant_id: selectedVariantId,
  quantity: qty,
  files: design.selected_placements.map(placement => ({
    placement,
    file_id: design.placement_file_ids[placement],
  })),
}]

await printfulFetch('/v2/orders', { method: 'POST', body: { recipient, items } })
```

---
*End of Multi-Placement Addendum*
