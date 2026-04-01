# GoldenGooseTees Documentation Library

**Truth Source**: This documentation reflects the actual implemented code at the current HEAD of the default branch. In case of conflicts between documentation and code, the code is the source of truth.

**Last Updated**: 2026-01-30

---

## 📚 Quick Navigation

### Getting Started (Start Here)

1. **[Main README](../README.md)** - Project overview, tech stack, and quick start
2. **[Production checklist](./PRODUCTION_CHECKLIST.md)** - Vercel, env, smoke tests before/after deploy
3. **[Local Development Setup](#local-development-setup)** - Get the app running locally
4. **[Vercel Deployment](#vercel-deployment)** - Deploy to production

### Core Setup Guides

#### Required Services
- **[Supabase Setup](../SUPABASE_SETUP.md)** - Database, authentication (Google OAuth), and storage
- **[Stripe Setup](../STRIPE_SETUP.md)** - Payment processing configuration
- **[Printful Setup](../PRINTFUL_SETUP.md)** - Order fulfillment and product mapping
- **[Pricing v2 / quotes](./pricing.md)** - Printful estimate-costs, server orders, webhooks, cron cache

#### AI Configuration
- **[AI System Guide](../AI_SYSTEM_GUIDE.md)** - AI agent architecture and provider configuration
- **[Environment Variables](#environment-variables)** - Complete reference for all required and optional keys

### Operational Guides

- **[Admin Dashboard](#admin-dashboard)** - Managing users, orders, and AI configuration
- **[Migration Guide](../MIGRATION_GUIDE.md)** - Database migrations and schema updates
- **[Security Guide](../SECURITY.md)** - Security considerations and best practices

### Technical References

- **[RLS Optimization](../RLS_OPTIMIZATION.md)** - Row Level Security performance tuning
- **[Image Combiner Guide](../IMAGE_COMBINER_GUIDE.md)** - Multi-layer design composition

### Historical Documentation

These documents are preserved for historical context but may not reflect the current architecture:

- **[Integration Guide (Deprecated)](../INTEGRATION_GUIDE_DEPRECATED.md)** - Superseded by individual setup guides
- **[Implementation Notes](../IMPLEMENTATION_NOTES.md)** - Original implementation details
- **[Implementation Summary](../IMPLEMENTATION_SUMMARY.md)** - Historical implementation overview
- **[Iteration Summaries](../ITERATION_6_SUMMARY.md)** - Development iteration logs
- **[Branch Analysis](../BRANCH_MERGE_ANALYSIS.md)** - Historical branch management docs

---

## Local Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Accounts**: Supabase, Stripe, Printful, Google Cloud (for OAuth)
- **API Keys**: Gemini API key (required), OpenAI API key (optional fallback)

### Quick Start

```bash
# Clone repository
git clone https://github.com/InTellMe/goldengoosetees-kiosk.git
cd goldengoosetees-kiosk

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure required environment variables (see below)
# Edit .env.local with your API keys

# Start development server
npm run dev
```

The app will run at `http://localhost:5173`

### Required Environment Variables

Copy these from your service dashboards:

```bash
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-side only
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (Required)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
VITE_STRIPE_TEST_MODE=true

# AI Services (Required: at least GEMINI_API_KEY)
GEMINI_API_KEY=your-gemini-api-key  # Primary for chat and images
OPENAI_API_KEY=your-openai-key      # Optional fallback
OPENROUTER_API_KEY=your-openrouter-key  # Optional (admin-selectable)

# Printful (Required for orders)
PRINTFUL_API_KEY=your-printful-api-key

# App Config
VITE_APP_URL=http://localhost:5173
```

See **[.env.example](../.env.example)** for the complete list with descriptions.

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your forked repository
4. Vercel will auto-detect the configuration

### 2. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add all variables from `.env.example`. See the table in the [Main README](../README.md) for where to find each key.

**Critical Notes**:
- Server-only keys (no `VITE_` prefix): `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `PRINTFUL_API_KEY`
- Client-exposed keys (with `VITE_` prefix): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`

### 3. Set Up Services

Follow these guides in order:

1. **[Supabase Setup](../SUPABASE_SETUP.md)** - Create database tables, configure Google OAuth, set up storage bucket
2. **[Stripe Setup](../STRIPE_SETUP.md)** - Configure webhook endpoint
3. **[Printful Setup](../PRINTFUL_SETUP.md)** - Configure product catalog and SKU mapping
4. **AI Keys** - Add `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey)

### 4. Deploy

Click "Deploy" in Vercel. After deployment:
- Update Google OAuth redirect URIs with production URL
- Update Supabase Site URL with production URL
- Update Stripe webhook endpoint with production URL

---

## Environment Variables

### Canonical Reference

The canonical source for environment variables is **[.env.example](../.env.example)**. All documentation must match this file.

### Server-Side Only (Never expose to browser)

| Variable | Provider | Required | Purpose |
|----------|----------|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | ✅ Yes | Admin operations, bypasses RLS |
| `STRIPE_SECRET_KEY` | Stripe | ✅ Yes | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe | ✅ Yes | Webhook signature verification |
| `PRINTFUL_API_KEY` | Printful | ✅ Yes | Order fulfillment |
| `GEMINI_API_KEY` | Google AI | ✅ Yes | Primary AI chat and image generation |
| `OPENAI_API_KEY` | OpenAI | ❌ Optional | Fallback for chat and images |
| `OPENROUTER_API_KEY` | OpenRouter | ❌ Optional | Alternative chat provider (admin-selectable) |
| `MAILJET_API_KEY` | Mailjet | ❌ Optional | Email alerts |
| `MAILJET_SECRET_KEY` | Mailjet | ❌ Optional | Email alerts |
| `MAILJET_SMS_TOKEN` | Mailjet | ❌ Optional | SMS alerts |

### Client-Exposed (VITE_ prefix)

| Variable | Provider | Required | Purpose |
|----------|----------|----------|---------|
| `VITE_SUPABASE_URL` | Supabase | ✅ Yes | Database connection |
| `VITE_SUPABASE_ANON_KEY` | Supabase | ✅ Yes | Public API access |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe | ✅ Yes | Client-side payment UI |
| `VITE_STRIPE_TEST_MODE` | - | ✅ Yes | Enable/disable test mode |
| `VITE_APP_URL` | - | ✅ Yes | Your app URL for redirects |

---

## Admin Dashboard

### Access

1. Sign in with Google OAuth
2. In Supabase SQL Editor, update your user role:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
3. Refresh the app - you'll see an "Admin" button in the header

### Features

- **Dashboard**: Revenue, orders, user analytics
- **Orders**: View, sync with Printful, track status
- **Users**: Manage roles, disable accounts
- **AI Configuration**: Select providers, view status, test connections
- **Settings**: Configure API keys via UI

---

## AI System Architecture

### Chat Providers (Configurable in Admin)

**Default Flow** (when provider = 'gemini' or not set):
1. Try **Gemini** (`gemini-2.0-flash` model)
2. If Gemini fails and `OPENAI_API_KEY` is set → fallback to **OpenAI** (`gpt-4o`)

**When Admin Selects OpenRouter**:
- Uses OpenRouter API with configured model (default: `openai/gpt-4o`)

**When Admin Selects OpenAI**:
- Uses OpenAI API directly

**Implementation**: See `api/ai/chat.ts`

### Image Generation Providers

**Always tries in this order**:
1. **Gemini Primary** (`gemini-2.0-flash-exp-image-generation`) - "Nano-Banana style"
2. **Gemini Fallback** (`gemini-2.0-flash-exp`)
3. **DALL-E 3** (if `OPENAI_API_KEY` is set)

**Implementation**: See `api/ai/generate-design.ts`

### Required Keys

- **Minimum**: `GEMINI_API_KEY` - Enables both chat and image generation
- **Recommended**: `GEMINI_API_KEY` + `OPENAI_API_KEY` - Provides fallback coverage
- **Optional**: `OPENROUTER_API_KEY` - Adds alternative chat provider option

---

## Support & Troubleshooting

### Common Issues

See the [Troubleshooting section in README.md](../README.md#troubleshooting) for solutions to common problems.

### Getting Help

- **GitHub Issues**: [InTellMe/goldengoosetees-kiosk/issues](https://github.com/InTellMe/goldengoosetees-kiosk/issues)
- **Service Support**: 
  - Supabase: [supabase.com/support](https://supabase.com/support)
  - Stripe: [support.stripe.com](https://support.stripe.com)
  - Printful: [printful.com/help](https://www.printful.com/help)

---

## Contributing to Documentation

When updating documentation:

1. **Verify against code**: Always check the implementation before documenting
2. **Update .env.example first**: This is the canonical source for environment variables
3. **Update this index**: Add new docs to the appropriate section
4. **Test links**: Ensure all relative links work on GitHub
5. **No speculation**: Only document what exists in code

Last Updated: 2026-01-30
