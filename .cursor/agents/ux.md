# @ux Agent — GoldenGooseTees UX & Design

## Activation: `@ux`

---

## BRAND SYSTEM

**Personality:** Bold, irreverent, unapologetic. Adult humor. Self-aware.
**Visual language:** Dark-mode-first. Gold (#EAB308) on black (#09090b). High contrast.
**Tone:** "Wear your truth. Loudly." — confident, a little provocative, fun.

```
Primary:   #EAB308  (GGT gold)
Background:#09090b  (near-black)
Surface:   #111111  (card/panel)
Border:    #2a2a2a
Text:      #fafafa  (primary), #a1a1aa (muted)
Success:   #22c55e
Error:     #ef4444
```

---

## STUDIO EDITOR UX STANDARDS

The design studio is the core revenue-generating interface. UX must be:
- **Intuitive to a first-time user** (no manual needed for basic operation)
- **Fast-feeling** (loading states on every async op, never frozen)
- **Forgiving** (undo/redo, save drafts, no data loss on navigation)
- **Mobile-aware** (but canvas editing is primarily desktop — optimize for that)

### Placement Selector Modal
```
"Where do you want your design?"

[ Front Print — included          ]  ← always pre-checked, not removable
[ Back Print — +$5.00             ]  ← optional
[ Left Sleeve — +$5.00            ]  ← optional
[ Right Sleeve — +$5.00           ]  ← optional

Running price: $28.00 → $33.00 as options checked

[    Start Designing →    ]  ← disabled until at least front confirmed
```

- Open as full-screen modal on mobile, centered modal on desktop
- Show actual product thumbnail behind the checklist
- Animate price update inline (don't flash or jump layout)

### Placement Tabs (in editor)
```
[ Front ● ] [ Back ○ ] [ + Add ]
             ↑ empty     ↑ opens placement selector
     ↑ has content (green dot)
```
- Active tab: gold background, black text
- Inactive with content: dark surface, gold text, green dot indicator
- Inactive empty: dark surface, muted text, gray dot indicator
- Removing a non-front placement: confirmation toast before removing

### Canvas Editor Layout
```
┌─ Product header (name + change product) ─────────────┐
├─ Placement tabs ──────────────────────────────────────┤
│                                                        │
│  [  CANVAS  800×800  ]  [ Toolbar: text/img/undo ]   │
│                                                        │
│  Print area guide (dashed gold border)                │
│                                                        │
├─ Bottom bar ──────────────────────────────────────────┤
│  [Save Draft]              [Generate Mockups →]        │
│                             disabled until all         │
│                             placements uploaded         │
└────────────────────────────────────────────────────────┘
```

### Mockup Review Screen
```
"Here's how it looks"

Front Print              Back Print (+$5.00)
[ mockup image ]         [ mockup image ]

Colors: ● ● ● ○ ○        (swatches update both mockups)
Size:   S  M [L] XL 2XL 3XL

Price:  $33.00
        Front + Back · Size L

[ ← Edit Designs ]  [ Add to Cart →  ]
```
- Large mockup images (400px+ on desktop)
- Color swatches update mockup image for that variant
- Price updates live as size/placement change
- "Edit Designs" returns to studio without losing data

---

## ACCESSIBILITY MINIMUMS

- All interactive elements keyboard-navigable
- Focus indicator: 2px gold outline
- Canvas tool buttons: minimum 44×44px touch target
- Color swatches: aria-label includes color name
- Loading states: aria-live="polite" announcements
- Error messages: associated with triggering element

---

## LOADING STATE PATTERNS

```tsx
// Mockup generating — never show blank/frozen state
<MockupLoadingState>
  <Spinner color="gold" size="lg" />
  <p>Generating your mockups...</p>
  <p className="text-muted">Usually takes 15–30 seconds</p>
</MockupLoadingState>

// File uploading per placement
<UploadStatus placement="front" status="uploading" />
// Shows: spinner + "Uploading front design..."

// Error state
<MockupError onRetry={generateMockups}>
  <p>Mockup generation failed. This is usually temporary.</p>
  <Button onClick={onRetry}>Try Again</Button>
</MockupError>
```

---
