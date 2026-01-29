# GoldenGooseTees - AI T-Shirt Design Kiosk

A production-ready AI-powered T-shirt design kiosk that enables users to create custom designs through conversational AI (GPT-4o via OpenRouter), generate high-quality artwork (DALL-E 3), and seamlessly checkout with Stripe payments and Printful fulfillment.

## Features

### Core Functionality

- **AI Design Assistant** - GPT-4o powered conversational AI guides users through design creation
- **DALL-E 3 Image Generation** - High-quality 1024x1024 HD design generation
- **Stripe Checkout** - Secure hosted payment page with multiple payment options
- **Printful Integration** - Automated order fulfillment with mockup generation
- **Supabase Backend** - PostgreSQL database, Google OAuth, and file storage
- **Kiosk Mode** - 5-minute inactivity timeout with automatic session reset

### Additional Features

- Multi-area print support (front, back, sleeves)
- Content moderation and IP/copyright checking
- Admin dashboard with AI-powered analytics
- Design catalog publishing
- Real-time order status sync

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4 |
| **Components** | shadcn/ui, Radix UI |
| **Icons** | Phosphor Icons |
| **Animations** | Framer Motion |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth + Google OAuth |
| **Payments** | Stripe Checkout |
| **Fulfillment** | Printful API |
| **AI Chat** | OpenRouter (GPT-4o) |
| **AI Images** | OpenAI DALL-E 3 |
| **Hosting** | Vercel |

---

## Deployment to Vercel

### Prerequisites

Before deploying, you'll need accounts with:

1. **Vercel** - [vercel.com](https://vercel.com)
2. **Supabase** - [supabase.com](https://supabase.com)
3. **Stripe** - [stripe.com](https://stripe.com)
4. **Printful** - [printful.com](https://printful.com)
5. **OpenRouter** - [openrouter.ai](https://openrouter.ai)
6. **OpenAI** - [platform.openai.com](https://platform.openai.com)

### Step 1: Deploy to Vercel

1. Fork or clone this repository
2. Connect your repo to Vercel
3. Import the project in Vercel dashboard

### Step 2: Configure Environment Variables

In your Vercel project settings (Settings → Environment Variables), add:

#### Supabase (Required)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | `https://abc123.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service role key (server-side only) |

**Where to find:** Supabase Dashboard → Your Project → Settings → API

#### Stripe (Required)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | Publishable key |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | Secret key (server-side only) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook signing secret |
| `VITE_STRIPE_TEST_MODE` | `true` or `false` | Enable test mode |

**Where to find:** [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)

#### Printful (Required)

| Variable | Example | Description |
|----------|---------|-------------|
| `PRINTFUL_API_KEY` | `abc123...` | Printful API access token (server-only) |
| `PRINTFUL_STORE_ID` | `12345` | Store ID (optional, server-only) |

**Where to find:** [Printful Dashboard → Settings → API](https://www.printful.com/dashboard/settings)

**Note:** Printful API keys are now configured server-side only for security. Set these in Vercel → Environment Variables (not in client code).

#### AI Services (Required)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_OPENROUTER_API_KEY` | `sk-or-v1-...` | OpenRouter API key for chat |
| `VITE_OPENAI_API_KEY` | `sk-...` | OpenAI API key for DALL-E 3 |

**Where to find:**
- OpenRouter: [openrouter.ai/keys](https://openrouter.ai/keys)
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

#### App Configuration

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_APP_URL` | `https://goldengoosetees.com` | Your deployed app URL |
| `VITE_KIOSK_MODE` | `true` | Enable kiosk session timeout |
| `VITE_SESSION_TIMEOUT_MINUTES` | `5` | Inactivity timeout in minutes |

### Step 3: Set Up Supabase Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  age_verified BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Designs table
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  product_id TEXT NOT NULL,
  files JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  is_nsfw BOOLEAN DEFAULT FALSE,
  title TEXT,
  description TEXT,
  catalog_section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  design_id UUID REFERENCES designs(id),
  product_id TEXT NOT NULL,
  size TEXT,
  color TEXT,
  status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  printful_order_id TEXT,
  printful_external_id TEXT,
  shipping_address JSONB,
  tracking_number TEXT,
  tracking_url TEXT,
  estimated_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can read own designs" ON designs FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert own designs" ON designs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Step 4: Create Supabase Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `designs`
3. Set bucket to **Public** (required for Printful mockup generation)
4. Add policy to allow authenticated uploads

### Step 5: Configure Google OAuth

**Important**: OAuth configuration requires careful setup in **both** Google Cloud Console and Supabase Console. The callback URLs and redirect URIs must match exactly across both platforms.

#### Quick Setup

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com))
   - Create OAuth 2.0 credentials
   - Configure **Authorized JavaScript origins**:
     - Development: `http://localhost:5173`
     - Production: `https://goldengoosetees.com`
   - Configure **Authorized redirect URIs**:
     - Your app URL(s): `http://localhost:5173`, `https://goldengoosetees.com`
     - Supabase callback: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret**

2. **Supabase Console** - Authentication → Providers
   - Enable **Google** provider
   - Paste **Client ID** and **Client Secret** from Google
   
3. **Supabase Console** - Authentication → URL Configuration
   - Set **Site URL**: `http://localhost:5173` (dev) or `https://goldengoosetees.com` (prod)
   - Add **Redirect URLs**:
     - Development: `http://localhost:5173`, `http://localhost:5173/**`
     - Production: `https://goldengoosetees.com`, `https://goldengoosetees.com/**`
     - Add all domains where your app is accessible

**⚠️ Critical Notes:**
- Replace `YOUR-PROJECT-REF` with your actual Supabase project reference from your project URL
- The Supabase callback URL must be: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
- JavaScript origins should NOT have trailing slashes
- Redirect URLs can use `/**` wildcard for all paths
- All URLs must match exactly (including http/https and ports)

**📚 For detailed step-by-step instructions with screenshots and troubleshooting:**
See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for comprehensive OAuth configuration guide including:
- Complete Google Cloud Console setup (JavaScript origins, redirect URIs, consent screen)
- Complete Supabase Console setup (Site URL, redirect URLs, provider configuration)
- Development vs Production environment examples
- Common errors and solutions (redirect_uri_mismatch, origin_mismatch, etc.)
- Testing checklist

### Step 6: Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://goldengoosetees.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### Step 7: Redeploy

After configuring all environment variables, trigger a redeployment in Vercel.

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/InTellMe/goldengoosetees-kiosk.git
cd goldengoosetees-kiosk

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Fill in your environment variables in .env.local

# Start development server
npm run dev
```

---

## Project Structure

```
goldengoosetees-kiosk/
├── api/
│   └── webhooks/
│       └── stripe.ts          # Vercel serverless webhook handler
├── src/
│   ├── components/
│   │   ├── admin/             # Admin dashboard components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── AuthDialog.tsx     # Google OAuth login
│   │   ├── ChatInterface.tsx  # AI conversation UI
│   │   ├── CheckoutFlow.tsx   # Stripe checkout flow
│   │   ├── DesignPreview.tsx  # Design + mockup preview
│   │   └── ...
│   ├── hooks/
│   │   └── useInactivityTimeout.ts  # Kiosk session timeout
│   ├── lib/
│   │   ├── ai-agents.ts       # OpenRouter + DALL-E + Admin Agent
│   │   ├── api.ts             # Main API facade
│   │   ├── printful.ts        # Printful API wrapper
│   │   ├── stripe.ts          # Stripe API wrapper
│   │   ├── supabase.ts        # Supabase client + storage
│   │   └── types.ts           # TypeScript types
│   ├── App.tsx                # Main application
│   └── main.tsx               # Entry point
├── .env.example               # Environment variables template
└── package.json
```

---

## Testing

### Stripe Test Cards

| Scenario | Card Number |
|----------|-------------|
| Success | `4242 4242 4242 4242` |
| Declined | `4000 0000 0000 0002` |
| Insufficient Funds | `4000 0000 0000 9995` |
| Requires Auth | `4000 0025 0000 3155` |

Use any future expiry date and any 3-digit CVC.

### Enable Test Mode

Set `VITE_STRIPE_TEST_MODE=true` and use Stripe test API keys.

---

## Admin Access

1. Sign in with Google OAuth
2. Update your user role in Supabase:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@goldengoosetees.com';
```
3. Refresh the app - you'll see the Admin button in the header

---

## User Flow

1. **Browse Products** - View available T-shirt products
2. **Select Configuration** - Choose size, color, and print areas
3. **Design with AI** - Chat with AI assistant to create your design
4. **Generate Artwork** - AI creates high-quality designs with DALL-E 3
5. **Preview** - See design on product with optional Printful mockup
6. **Checkout** - Login with Google, enter shipping, pay with Stripe
7. **Order Fulfilled** - Automatic submission to Printful
8. **Track** - Order status synced in real-time

---

## Documentation

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Detailed Supabase and Google OAuth setup
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Stripe configuration guide
- [PRINTFUL_SETUP.md](./PRINTFUL_SETUP.md) - Printful API and product mapping
- [AI_SYSTEM_GUIDE.md](./AI_SYSTEM_GUIDE.md) - AI agent architecture
- [SECURITY.md](./SECURITY.md) - Security considerations

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Supabase not configured" | Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set |
| "Stripe not configured" | Ensure `VITE_STRIPE_PUBLISHABLE_KEY` starts with `pk_` |
| "OpenAI not configured" | Verify API key and check you have DALL-E 3 access |
| Webhook not receiving | Check URL ends with `/api/webhooks/stripe` and secret matches |
| Design generation fails | Check OpenAI credits and API key permissions |
| Google OAuth `redirect_uri_mismatch` | Verify redirect URIs in Google Console match exactly (including Supabase callback). See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) |
| Google OAuth `origin_mismatch` | Add your app's origin to "Authorized JavaScript origins" in Google Console. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) |
| Google OAuth works locally not in production | Add production URLs to Google Console and Supabase redirect URLs. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) |
| OAuth redirects to wrong URL | Check Supabase Site URL and ensure it's in the redirect URLs allow list. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) |

**For comprehensive OAuth troubleshooting**, see the [OAuth Troubleshooting section in SUPABASE_SETUP.md](./SUPABASE_SETUP.md#troubleshooting)

---

## License

MIT License - see LICENSE file for details.

---

## Support

- **GitHub Issues**: Report bugs and request features
- **Stripe**: [support.stripe.com](https://support.stripe.com)
- **Supabase**: [supabase.com/support](https://supabase.com/support)
- **Printful**: [printful.com/help](https://www.printful.com/help)
