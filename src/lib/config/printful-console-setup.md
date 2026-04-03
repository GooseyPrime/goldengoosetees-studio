# Printful Console Setup Guide
# GoldenGooseTees — One-time configuration

## TOKEN TYPE DECISION: Private Token ✅

Use a **Private Token** — NOT a Public App.

Why:
- GoldenGooseTees is YOUR store. The API connects YOUR Next.js app to YOUR
  Printful account. Customers never authenticate with Printful — they only
  authenticate with YOUR app (Supabase/Stripe).
- Public Apps are for third-party developers building tools that OTHER
  Printful merchants install on their own accounts (like a Shopify plugin).
- Private Token: simpler auth, no OAuth redirect flow, single store context.

## STEP-BY-STEP: Printful Console Setup

### 1. Create Your Store (if not done)
  → printful.com → Dashboard → Stores → Connect store
  → Select "Manual order platform / API"
  → Name it: GoldenGooseTees
  → Note your Store ID (shown in URL and store settings)

### 2. Generate Private Token
  → Go to: https://developers.printful.com/
  → Sign in with your Printful account
  → Click "Your tokens" → "Create token"
  → Settings:
      Name: goldengoosetees-production
      Access level: STORE (not Account)
      Store: GoldenGooseTees (select your store)
      Expiration: Set 1 year out (reminder yourself to rotate before it expires)
  
  → Required Scopes (check ALL of these):
      ✅ catalog/read           — product catalog, variants, mockup styles
      ✅ files/write            — upload design files
      ✅ mockup-tasks/write     — create mockup generation tasks
      ✅ mockup-tasks/read      — poll mockup task status
      ✅ orders/write           — create orders
      ✅ orders/read            — read order status
      ✅ webhooks/write         — register webhook endpoints
      ✅ webhooks/read          — read registered webhooks
      ✅ shipping/read          — shipping rate calculation

  → COPY THE TOKEN IMMEDIATELY — it will not be shown again
  → Store in: Vercel environment variables AND .env.local

### 3. Register Webhooks
  → Developer Portal → Your tokens → [token] → Webhooks → Add webhook
  → URL: https://goldengoosetees.com/api/webhooks/printful
  → Events to subscribe:
      ✅ mockup_task_finished
      ✅ package_shipped
      ✅ order_failed
      ✅ order_updated
  → Note the Webhook Secret (store as PRINTFUL_WEBHOOK_SECRET)

### 4. Note Your Store ID
  → Dashboard → Stores → [your store] → settings
  → Store ID is in the URL or shown in the settings panel
  → Store as: PRINTFUL_STORE_ID in env vars

### 5. Create a Staging Token (optional but recommended)
  → Create a second store named: GoldenGooseTees-Staging
  → Generate another Private Token for it
  → Use in .env.local for local development
  → Never submit real orders from staging — Printful will still charge you

## ENVIRONMENT VARIABLES SUMMARY

Add to Vercel project settings (Production + Preview):
```
PRINTFUL_API_KEY=your_private_token_here
PRINTFUL_STORE_ID=your_store_id_here
PRINTFUL_WEBHOOK_SECRET=your_webhook_secret_here
```

Add to .env.local (use staging values here):
```
PRINTFUL_API_KEY=your_staging_token_here
PRINTFUL_STORE_ID=your_staging_store_id_here
PRINTFUL_WEBHOOK_SECRET=your_staging_webhook_secret_here
```

## IMPORTANT NOTES
- Private tokens have an expiration date — set a calendar reminder 2 weeks
  before expiry to rotate the token
- The token uses Bearer auth: Authorization: Bearer {token}
- For Store-level tokens, include X-PF-Store-Id: {store_id} header on
  all requests that require store context (orders, webhooks, files, mockups)
- Catalog endpoints (products, variants) do NOT require store context
