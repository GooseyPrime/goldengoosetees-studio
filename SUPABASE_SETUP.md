# Supabase Setup Guide for GoldenGooseTees

> **📚 Related Documentation**: [Documentation Library](./docs/README.md) | [README](./README.md) | [.env.example](./.env.example)

This guide will help you integrate Supabase for database storage and Google OAuth authentication.

## Quick Reference: OAuth URLs

Before you begin, understand the key URLs you'll be configuring:

### Development Environment (Local)
```
App URL (Site URL):          http://localhost:5173
JavaScript Origin:           http://localhost:5173
Redirect URLs:               http://localhost:5173
                            http://localhost:5173/**
Supabase Callback:          https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

### Production Environment (Vercel/Custom Domain)
```
App URL (Site URL):          https://goldengoosetees.com
JavaScript Origins:          https://goldengoosetees.com
                            https://www.goldengoosetees.com
Redirect URLs:               https://goldengoosetees.com
                            https://goldengoosetees.com/**
                            https://www.goldengoosetees.com
                            https://www.goldengoosetees.com/**
Supabase Callback:          https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

### Where to Configure These URLs

| URL Type | Google Cloud Console | Supabase Console |
|----------|---------------------|------------------|
| **JavaScript Origins** | ✅ Credentials → OAuth 2.0 Client → Authorized JavaScript origins | ❌ Not needed |
| **App Base URLs** | ✅ Credentials → OAuth 2.0 Client → Authorized redirect URIs | ✅ Authentication → URL Configuration → Redirect URLs |
| **Supabase Callback** | ✅ Credentials → OAuth 2.0 Client → Authorized redirect URIs | ❌ Auto-configured (don't add) |
| **Site URL (Primary)** | ❌ Not needed | ✅ Authentication → URL Configuration → Site URL |

**Important**: 
- Replace `YOUR-PROJECT-REF` with your actual Supabase project reference (found in your project URL)
- The app will be deployed to `https://goldengoosetees.com` (primary domain) and `https://www.goldengoosetees.com` (www subdomain)

---

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- A Google Cloud Console project for OAuth credentials

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: GoldenGooseTees (or your preferred name)
   - **Database Password**: Generate a secure password (save this!)
   - **Region**: Choose closest to your users
4. Wait for the project to be created (~2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)
3. Keep these values handy for configuration

## Step 3: Set Up Database Tables

Run the following SQL in your Supabase SQL Editor (Database → SQL Editor):

> **Note**: For the complete, production-ready schema with all features, see [`supabase/schema.sql`](./supabase/schema.sql) in this repository. The SQL below includes the core tables and policies needed to get started.

```sql
-- ============================================
-- Enable necessary extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Custom Types (Enums)
-- ============================================

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('guest', 'user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Order status
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'processing', 'fulfilled', 'shipped', 'delivered', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Profiles Table (user data - separate from auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    age_verified BOOLEAN DEFAULT FALSE,
    birthdate DATE,
    role user_role DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- Designs Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    product_id TEXT NOT NULL,
    configuration_id TEXT,
    variant_selections JSONB DEFAULT '{}'::jsonb,
    size TEXT,
    color TEXT,
    files JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    title TEXT NOT NULL DEFAULT 'Untitled Design',
    description TEXT,
    catalog_section TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for designs (optimized for common queries and RLS policies)
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON public.designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_product_id ON public.designs(product_id);
CREATE INDEX IF NOT EXISTS idx_designs_is_public ON public.designs(is_public);
CREATE INDEX IF NOT EXISTS idx_designs_catalog_section ON public.designs(catalog_section);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON public.designs(created_at DESC);

-- ============================================
-- Orders Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    design_id UUID REFERENCES public.designs(id) ON DELETE SET NULL,
    product_id TEXT NOT NULL,
    variant_selections JSONB DEFAULT '{}'::jsonb,
    size TEXT,
    color TEXT,
    status order_status DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Stripe fields
    stripe_payment_id TEXT,
    stripe_session_id TEXT,

    -- Printful fields
    printful_order_id TEXT,
    printful_external_id TEXT,

    -- Shipping information (stored as JSONB)
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Tracking
    tracking_number TEXT,
    tracking_url TEXT,
    estimated_delivery TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for orders (optimized for common queries and RLS policies)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_design_id ON public.orders(design_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_printful_order_id ON public.orders(printful_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for profiles table
-- (Optimized with subselect pattern for better plan caching)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- ============================================
-- RLS Policies for designs table
-- (Optimized with subselect pattern for better plan caching)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own designs" ON public.designs;
CREATE POLICY "Users can view their own designs" ON public.designs
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "Users can create designs" ON public.designs;
CREATE POLICY "Users can create designs" ON public.designs
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own designs" ON public.designs;
CREATE POLICY "Users can update their own designs" ON public.designs
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own designs" ON public.designs;
CREATE POLICY "Users can delete their own designs" ON public.designs
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- RLS Policies for orders table
-- (Optimized with subselect pattern for better plan caching)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- Function: Update timestamp trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- Triggers for updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_designs_updated_at ON public.designs;
CREATE TRIGGER update_designs_updated_at
    BEFORE UPDATE ON public.designs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Schema Notes

**Important Changes from Previous Version:**
- **Table naming**: Uses `profiles` instead of `users` to avoid confusion with Supabase's built-in `auth.users` table
- **Schema qualifiers**: All tables use the `public` schema qualifier for clarity
- **Primary keys**: `designs` and `orders` now use UUID instead of TEXT for better performance and consistency
- **Type safety**: Uses PostgreSQL ENUMs (`user_role`, `order_status`) instead of plain TEXT
- **New fields**: 
  - `profiles.birthdate` for age verification
  - `designs.configuration_id`, `variant_selections` for multi-product support
  - `orders.variant_selections` for tracking selected product variants
  - Additional Stripe and Printful tracking fields
- **Indexes**: Comprehensive indexes on foreign keys and commonly queried fields to improve RLS policy performance
- **Triggers**: Automatic `updated_at` timestamp updates on all tables
- **Foreign key constraints**: Proper `ON DELETE` behavior (SET NULL for optional refs, RESTRICT for required)

**Performance Optimizations:**
- Indexes on `user_id` columns improve RLS policy performance
- Subselect pattern `(SELECT auth.uid())` in policies enables better PostgreSQL plan caching
- Indexes on timestamp columns support efficient sorting and pagination

## Step 4: Configure Google OAuth

This step requires configuration in **both** Google Cloud Console and Supabase Console. The callback/redirect URLs must match exactly between both platforms.

### A. Google Cloud Console Configuration

#### 4.1: Create/Select Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your project name for reference

#### 4.2: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Search for "Google Identity Services" or just proceed to creating OAuth credentials (Google will prompt you to enable required APIs automatically)

**Note**: The necessary APIs (Google Identity, OAuth2) are typically enabled automatically when you create OAuth 2.0 credentials. If you encounter issues accessing user profile data, you may optionally enable the "People API" which allows reading user profile information like name and email.

#### 4.3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in required fields:
   - **App name**: GoldenGooseTees
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **Save and Continue**
5. On "Scopes" screen, click **Save and Continue** (default scopes are sufficient)
6. Add test users if needed, then click **Save and Continue**

#### 4.4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. For **Application type**, select **Web application**
4. Give it a name (e.g., "GoldenGooseTees Web Client")

#### 4.5: Configure Authorized JavaScript Origins

Add the following origins where your app will be accessed from:

**For Development:**
```
http://localhost:5173
http://localhost:5000
http://127.0.0.1:5173
```

**For Production (replace with your actual domains):**
```
https://goldengoosetees.com
https://www.goldengoosetees.com
```

**Important Notes:**
- Do NOT include trailing slashes (/)
- Must use https:// for production (http:// only allowed for localhost)
- Include all domains and subdomains where your app is hosted
- Port numbers are required for localhost during development

#### 4.6: Configure Authorized Redirect URIs

These are the callback URLs where Google sends users after authentication. You need **BOTH** your Supabase URL and your app URL.

**Critical: Get Your Supabase Project Reference**
1. Go to your Supabase project dashboard
2. Copy the URL - it looks like: `https://abcdefghijklmnop.supabase.co`
3. Your project reference is the subdomain: `abcdefghijklmnop`

**For Development:**
```
http://localhost:5173
http://localhost:5000
https://abcdefghijklmnop.supabase.co/auth/v1/callback
```
(Replace `abcdefghijklmnop` with your actual Supabase project reference)

**For Production:**
```
https://goldengoosetees.com
https://www.goldengoosetees.com
https://abcdefghijklmnop.supabase.co/auth/v1/callback
```
(Replace with your actual production domain(s) and Supabase project reference)

**Important Notes:**
- The Supabase callback URL **MUST** be exactly: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
- Include your app's base URL(s) in addition to the Supabase callback URL
- Do NOT add trailing slashes to the app URLs
- The Supabase callback URL path must be exactly `/auth/v1/callback`

#### 4.7: Save and Copy Credentials

1. Click **CREATE**
2. A dialog will show your **Client ID** and **Client Secret**
3. **IMPORTANT**: Copy both values immediately and save them securely
4. You can also download the JSON file for backup
5. Click **OK**

### B. Supabase Console Configuration

#### 4.8: Configure Google Provider in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list and click to expand
4. Toggle **Enable Google provider** to ON
5. Paste your **Client ID** from Google Cloud Console
6. Paste your **Client Secret** from Google Cloud Console
7. Click **Save**

#### 4.9: Configure Site URL

The Site URL is where Supabase redirects users after authentication.

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:

**For Development:**
```
http://localhost:5173
```

**For Production:**
```
https://goldengoosetees.com
```
(Use your primary production domain)

**Important Notes:**
- This should match your main app URL
- Do NOT include trailing slashes
- Only ONE site URL can be set (use your primary domain)

#### 4.10: Configure Redirect URLs (Allowed List)

These are additional URLs where Supabase will allow redirects after authentication.

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add all URLs where your app can be accessed:

**For Development:**
```
http://localhost:5173
http://localhost:5173/**
http://localhost:5000
http://localhost:5000/**
http://127.0.0.1:5173
http://127.0.0.1:5173/**
```

**For Production:**
```
https://goldengoosetees.com
https://goldengoosetees.com/**
https://www.goldengoosetees.com
https://www.goldengoosetees.com/**
```

**Important Notes:**
- Each URL should be on a separate line
- Use `/**` wildcard to allow all paths under a domain
- Include ALL domains and subdomains where your app is accessible
- Include both with and without `www` if applicable
- Must match the JavaScript origins configured in Google Cloud Console

### C. Verification and Testing

#### 4.11: Verify Configuration Matches

Double-check that your URLs match across both platforms:

| Configuration | Google Cloud Console | Supabase Console |
|---------------|---------------------|------------------|
| **Origins** | Authorized JavaScript origins | Must match redirect URLs |
| **Callbacks** | Authorized redirect URIs | Must include Supabase callback + Site URL |
| **Supabase Callback** | Must include `/auth/v1/callback` | Automatically used |

#### 4.12: Test the OAuth Flow

1. Clear your browser cache and cookies
2. Open your app in a new incognito/private window
3. Click the "Sign in with Google" button
4. Complete the Google sign-in flow
5. Verify you're redirected back to your app successfully
6. Check that user data is saved in Supabase Users table

## Step 5: Configure in Admin Dashboard

1. Open your GoldenGooseTees kiosk application
2. Sign in as an admin user
3. Go to **Admin Dashboard**
4. Navigate to the **Settings** tab
5. Find the **Supabase Configuration** section
6. Enter your:
   - **Supabase URL**: Your project URL from Step 2
   - **Supabase Anon Key**: Your anon/public key from Step 2
7. Click **Test Connection** to verify it works
8. Click **Save Configuration**

## Step 6: Test the Integration

1. Log out of any existing sessions
2. Go to the main page
3. Click **Sign In**
4. You should see a Google sign-in button
5. Complete the Google OAuth flow
6. Verify you're signed in successfully

## Troubleshooting

### "Supabase not configured" message
- Make sure you saved your configuration in the Admin Dashboard
- Verify both URL and Anon Key are correct
- Refresh the page after saving

### Google OAuth Errors

#### "redirect_uri_mismatch" Error
This is the most common OAuth error. It means the redirect URI doesn't match exactly between Google Cloud Console and your request.

**Solution:**
1. Check the error message for the exact redirect URI that was attempted
2. Go to Google Cloud Console → Credentials → Your OAuth Client
3. Ensure the **EXACT** redirect URI is in the "Authorized redirect URIs" list
4. Common issues:
   - Missing trailing slash (or extra trailing slash)
   - HTTP vs HTTPS mismatch
   - Missing port number for localhost
   - Wrong Supabase project reference
   - Missing `/auth/v1/callback` path

**Example of correct URIs:**
```
http://localhost:5173
https://abcdefghijklmnop.supabase.co/auth/v1/callback
```

#### "origin_mismatch" Error
The JavaScript origin doesn't match the configured origins.

**Solution:**
1. Go to Google Cloud Console → Credentials → Your OAuth Client
2. Check "Authorized JavaScript origins"
3. Add the exact origin where your app is running
4. Do NOT include paths or trailing slashes in origins
5. Format: `http://localhost:5173` or `https://goldengoosetees.com`

#### "access_denied" Error
User cancelled sign-in or Google denied access.

**Solution:**
1. Verify OAuth consent screen is properly configured
2. Check that test users are added (if in testing mode)
3. Ensure required scopes are not restricted
4. Try with a different Google account

#### "invalid_client" Error
Client ID or Secret is incorrect.

**Solution:**
1. Verify Client ID and Secret are correctly copied from Google Cloud Console
2. Check for extra spaces or hidden characters
3. Ensure the OAuth client hasn't been deleted or disabled
4. Verify credentials in both Google Cloud Console AND Supabase

#### OAuth Works Locally but Not in Production

**Solution:**
1. Ensure production URLs are added to Google Cloud Console:
   - Add to "Authorized JavaScript origins"
   - Add to "Authorized redirect URIs"
2. Update Supabase Site URL to production domain
3. Add production domain to Supabase Redirect URLs
4. Clear browser cache and test in incognito mode
5. Verify environment variables are set in Vercel/production

#### OAuth Redirects to Wrong URL

**Solution:**
1. Check `redirectTo` parameter in your code (default is `window.location.origin`)
2. Verify Supabase Site URL is set to your preferred redirect
3. Ensure the redirect URL is in the Supabase allowed list
4. Check `VITE_APP_URL` environment variable

#### User Authenticated but Not Saved to Database

**Solution:**
1. Check browser console for errors
2. Verify the `users` table exists in Supabase
3. Ensure RLS policies allow INSERT for authenticated users
4. Check the `saveUser` function is being called after OAuth callback
5. Verify Supabase service role key (if used server-side)

### Database connection errors
- Verify the SQL schema was created successfully
- Check RLS policies are in place
- Ensure your anon key has the correct permissions

### "Relation does not exist" errors
- Re-run the SQL schema setup from Step 3
- Make sure you're running it in the correct Supabase project

### Testing OAuth Configuration

Use this checklist to verify your OAuth setup:

- [ ] Google Cloud Console - OAuth client created
- [ ] Google Cloud Console - Authorized JavaScript origins added (all domains)
- [ ] Google Cloud Console - Authorized redirect URIs added (app + Supabase callback)
- [ ] Google Cloud Console - OAuth consent screen configured
- [ ] Supabase - Google provider enabled
- [ ] Supabase - Client ID and Secret configured
- [ ] Supabase - Site URL set to primary domain
- [ ] Supabase - All redirect URLs added to allowed list
- [ ] Environment variables - VITE_SUPABASE_URL set correctly
- [ ] Environment variables - VITE_SUPABASE_ANON_KEY set correctly
- [ ] Test - Can click "Sign in with Google" without errors
- [ ] Test - Redirected to Google sign-in page
- [ ] Test - After signing in, redirected back to app
- [ ] Test - User session persists after page refresh

## Security Notes

- Never commit your Supabase keys to a public repository
- The anon/public key is safe for client-side use with RLS enabled
- Keep your service role key (if used) completely private
- Regularly rotate your API keys

## Next Steps

Once Supabase is configured:
- User authentication will be stored in Supabase
- Designs will persist across sessions
- Orders will be tracked in the database
- Catalog designs will be public and browsable

For additional help, see the [Supabase documentation](https://supabase.com/docs).
