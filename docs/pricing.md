# GoldenGooseTees — Pricing & Product Reference
**Single source of truth. All other pricing info in this repo is superseded by this file.**

> When prices or products change, update THIS file and `api/_lib/pricing.ts` only.
> Do not edit PRINTFUL_SETUP.md, STRIPE_SETUP.md, README.md, or
> Printful_Pricing_GoldenGooseTees.md for pricing decisions — those are setup/reference
> docs and will not be kept in sync.

---

## 1. Product Catalog

Controlled at runtime by `PRINTFUL_CURATED_PRODUCT_IDS` env var (Vercel → Settings →
Environment Variables). Repo fallback in `api/_lib/offerings.ts`.

**⚠️ Printful ID Verification Required**
IDs below come from PRINTFUL_SETUP.md. Before treating any ID as authoritative, run:
```bash
npm run printful-resolve-launch
```
This script hits the live Printful API and prints a verified ID table. IDs 145/146 in
particular have been noted as potentially wrong in prior commits — always verify.

### Launch Lineup

| # | Product | Printful ID | Category | DTG/Emb |
|---|---------|-------------|----------|---------|
| 1 | Bella+Canvas 3001 — Staple Unisex Tee | **71** | Apparel | DTG |
| 2 | Gildan 64000 — Value Tee | **12** | Apparel | DTG |
| 3 | Gildan 18000 — Crewneck Sweatshirt | **145** ⚠️ verify | Apparel | DTG |
| 4 | Gildan 18500 — Pullover Hoodie | **146** ⚠️ verify | Apparel | DTG |
| 5 | Yupoong 6245CM — Classic Dad Hat | **206** | Headwear | Embroidery |
| 6 | Yupoong 6006 — 5-Panel Trucker Cap | **100** | Headwear | Embroidery |
| 7 | Otto Cap 82-480 — Knit Beanie | **81** | Headwear | Embroidery |
| 8 | White Glossy Mug — 11 oz Ceramic | **19** | Drinkware | DTG |
| 9 | Enhanced Matte Paper Poster | **1** | Wall Art | Print |

**Defer to later:** keychains, phone cases, stickers, tumblers — add once pricing
and fulfillment flows are proven stable.

---

## 2. Pricing Formula

Printful costs are **COGS**, not retail prices. Retail is computed server-side from this formula:

```
R = (C + P_target + f_stripe) / (1 - p_stripe - p_refund_buffer)
```

Where:
- `C` = Printful total cost from `POST /orders/estimate-costs` (item + print extras + shipping + tax)
- `P_target` = category profit target in USD (see table below)
- `f_stripe` = $0.30 (Stripe fixed fee per transaction)
- `p_stripe` = 0.029 (Stripe percentage fee: 2.9%)
- `p_refund_buffer` = 0.02 (2% buffer for refunds, reships, variance)

After solving for `R`, apply **psychological rounding**:
- Apparel + Headwear → round UP to nearest `.99` (e.g. $27.43 → $27.99)
- Drinkware + Wall Art → round UP to nearest `.99` (consistent; no .95 split)

**Margin sanity check** (enforce before finalizing price):
```
gross_margin = (R - C - stripe_fee_est - refund_buffer_est) / R
```
If `gross_margin < 0.30` (30% floor), increase `P_target` or apply multiplier until met.

---

## 3. Pricing Parameters

All parameters are configurable via env vars. Defaults shown:

| Parameter | Default | Env Override |
|-----------|---------|-------------|
| Stripe % fee | 2.9% | `PRICING_STRIPE_FEE_PCT` |
| Stripe fixed fee | $0.30 | `PRICING_STRIPE_FEE_FIXED` |
| Refund buffer | 2% | `PRICING_REFUND_BUFFER_PCT` |
| Margin floor | 30% | `PRICING_MARGIN_FLOOR` |
| Profit target — tees | $4.00 | `PRICING_PROFIT_TEE_USD` |
| Profit target — hoodies/sweatshirts | $8.00 | `PRICING_PROFIT_HOODIE_USD` |
| Profit target — hats | $5.00 | `PRICING_PROFIT_HAT_USD` |
| Profit target — mugs | $5.00 | `PRICING_PROFIT_MUG_USD` |
| Profit target — posters | $7.00 | `PRICING_PROFIT_POSTER_USD` |

These live in `api/_lib/pricing.ts` as named constants with env var overrides.

---

## 4. Representative Retail Price Targets

The table below shows **estimated** retail prices assuming typical US Printful cost
(base product + single DTG front placement + standard shipping to a US address).
**Actual checkout prices are always computed live from `POST /orders/estimate-costs`.**

> Run `npm run sku-pricing-table` to regenerate this from live Printful data.

| Product | Est. Printful COGS | Profit Target | Est. Retail | Est. Margin |
|---------|-------------------|--------------|-------------|-------------|
| BC 3001 Tee (front) | ~$12–14 | $4.00 | ~$27.99 | ~44% |
| BC 3001 Tee (front+back) | ~$16–18 | $4.00 | ~$32.99 | ~41% |
| Gildan 64000 Tee (front) | ~$9–11 | $4.00 | ~$23.99 | ~46% |
| Gildan 18000 Crewneck | ~$16–19 | $8.00 | ~$39.99 | ~43% |
| Gildan 18500 Hoodie | ~$22–26 | $8.00 | ~$49.99 | ~41% |
| Dad Hat (embroidered) | ~$14–17 | $5.00 | ~$33.99 | ~42% |
| Trucker Cap (embroidered) | ~$14–17 | $5.00 | ~$33.99 | ~42% |
| Knit Beanie (embroidered) | ~$12–15 | $5.00 | ~$29.99 | ~42% |
| 11oz Mug | ~$10–13 | $5.00 | ~$26.99 | ~40% |
| Poster | ~$8–12 | $7.00 | ~$27.99 | ~45% |

**These are estimates.** Printful costs vary by size (2XL+), color, and shipping zone.
Do not hardcode these into checkout logic.

---

## 5. Shipping Strategy

**Dynamic at checkout.** Never hardcode a shipping amount.

- On catalog browse: show "Estimated shipping calculated at checkout" — no dollar amount
- At checkout (once address is known): compute via `POST /orders/estimate-costs` which
  returns shipping included in the COGS total `C`
- Flat-rate fallback ($5.99) is ONLY used if the Printful estimate endpoint fails
  (network outage, etc.) — it must be labeled as "Estimated" and reconciled post-order
- Printful explicitly warns: do not cache shipping rates between requests; dynamic
  rates change and cached values cause mismatches

**Known bug to fix:** `src/components/CheckoutFlow.tsx` contains a hardcoded `$5.99`
shipping figure that feeds into the authoritative total. This must be replaced with
the estimate-costs result.

---

## 6. Extra Placement Pricing

Printful base cost includes **one placement**. Additional placements add to COGS and
should be reflected in retail pricing. The pricing formula handles this automatically
since `C` comes from `estimate-costs` which includes all placements.

For display purposes in the UI (placement selector):
- Back print: show "+~$5–7" (estimated; exact amount shown after quoting)
- Left/right sleeve: show "+~$5–7"
- These are UI hints only — actual adder comes from the live Printful estimate

---

## 7. Size Upcharges

Printful charges more for XL+ on many apparel products. These flow through `C`
automatically when the estimate is run with the specific variant ID. No hardcoded
size upcharges in the application — always use the variant-specific estimate.

---

## 8. Stripe Fee Reference

Standard US card processing (used in profit calculations):
- **2.9% + $0.30** per successful domestic card transaction
- International cards: 2.9% + $0.30 + 1.5% currency conversion (estimate only;
  actual fee varies — factor into margin floor enforcement)
- No Stripe subscription fees (Stripe is pay-per-transaction for GGT's usage)

---

## 9. Refund Policy

**No refunds** — by product policy. STRIPE_SETUP.md states this clearly. Customers
are shown "no refunds" messaging at checkout before payment is submitted. The 2%
refund buffer in the pricing formula exists to cover the rare cases of print errors
or Printful reships, which GGT absorbs as COGS.

---

## 10. Pricing Snapshot (per order)

Every order must persist a pricing snapshot in the `orders` table. This is required
for reconciliation, auditing, and debugging price disputes. The snapshot schema lives
in `supabase/migrations/001_pricing_system.sql` and includes:

- `pricing_version` — e.g. `"v1.0.0"`
- `printful_estimate` — full JSON response from `POST /orders/estimate-costs`
- `printful_total_cost` — numeric COGS at time of order
- `retail_total_amount` — what customer was charged
- `stripe_fee_est_amount`, `refund_buffer_est_amount`, `profit_target_amount`
- `profit_est_amount` — `retail - cogs - stripe_fee_est - refund_buffer_est`

---

## 11. Known Bugs to Fix Before Launch

| # | Location | Issue | Fix |
|---|---------|-------|-----|
| 1 | `api/printful/catalog/list.ts` | Shows `$19.99` placeholder for all products | Replace with "starting at" retail from `printful_variant_price_cache` |
| 2 | `src/components/CheckoutFlow.tsx` | Hardcoded `$5.99` shipping in authoritative total | Replace with Printful estimate-costs result |
| 3 | `api/stripe/create-payment-intent.ts` | Accepts arbitrary `amountInCents` from client | Change to resolve amount from `orders` table using `orderId` |
| 4 | `api/webhooks/stripe.ts` | Webhook signature verification bypassed | Enforce raw body + `stripe.webhooks.constructEvent()` |

---

## 12. Files That Own Pricing Logic

| File | Owns What |
|------|----------|
| `api/_lib/pricing.ts` | Formula, rounding, profit targets, margin floor, all constants |
| `api/_lib/offerings.ts` | Fallback product IDs when `PRINTFUL_CURATED_PRODUCT_IDS` not set |
| `supabase/migrations/001_pricing_system.sql` | DB schema for quotes, cache, order snapshot |
| `api/pricing/quote.ts` | Server endpoint: runs estimate-costs, solves retail, persists quote |
| `api/orders/create.ts` | Server endpoint: creates order using quote, sets authoritative total |
| `.env` / Vercel env vars | Runtime overrides for all pricing parameters |

**Do not put pricing logic in:**
- Any component under `src/components/`
- The Stripe checkout session creation client-side
- Any file with `VITE_` prefix (client-accessible)

---

## 13. Source Files This Document Supersedes

The following files contain pricing information that is now consolidated here.
They should not be updated for pricing decisions going forward:

- `Printful_Pricing_GoldenGooseTees.md` — was a Cursor agent implementation prompt;
  implementation specs extracted and consolidated above; keep for historical reference
- `PRINTFUL_SETUP.md` § "Costs and Pricing" and example calculation
- `README.md` example profit calculation ($24.99 retail, $3.60 profit)
- `STRIPE_SETUP.md` § "Not Currently Supported" (refund policy)

---

*Last updated: 2026-04 | Owner: Brandon Lane / InTellMe AI*
*Source of truth for: product IDs, pricing formula, parameters, shipping strategy, known bugs*
