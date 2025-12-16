# Supabase Setup Guide for GoldenGooseTees

This guide will help you integrate Supabase for database storage and Google OAuth authentication.

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

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  age_verified BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Designs table
CREATE TABLE designs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id TEXT NOT NULL,
  files JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  is_nsfw BOOLEAN DEFAULT FALSE,
  title TEXT NOT NULL,
  description TEXT,
  catalog_section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  design_id TEXT REFERENCES designs(id),
  product_id TEXT NOT NULL,
  stripe_payment_id TEXT,
  printful_order_id TEXT,
  status TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_address JSONB NOT NULL,
  tracking_number TEXT,
  estimated_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_designs_user_id ON designs(user_id);
CREATE INDEX idx_designs_is_public ON designs(is_public);
CREATE INDEX idx_designs_catalog_section ON designs(catalog_section);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can be created by anyone"
  ON users FOR INSERT
  WITH CHECK (true);

-- RLS Policies for designs table
CREATE POLICY "Users can read public designs"
  ON designs FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own designs"
  ON designs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own designs"
  ON designs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own designs"
  ON designs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for orders table
CREATE POLICY "Users can read their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designs_updated_at BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 4: Configure Google OAuth

### In Google Cloud Console:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the consent screen if prompted
6. For Application type, select **Web application**
7. Add authorized redirect URIs:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
   (Replace `YOUR-PROJECT-REF` with your Supabase project reference)
8. Save and copy the **Client ID** and **Client Secret**

### In Supabase:

1. Go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Enable Google provider
4. Paste your Google **Client ID** and **Client Secret**
5. Save changes

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
2. Go to the main kiosk page
3. Click **Sign In**
4. You should see a Google sign-in button
5. Complete the Google OAuth flow
6. Verify you're signed in successfully

## Troubleshooting

### "Supabase not configured" message
- Make sure you saved your configuration in the Admin Dashboard
- Verify both URL and Anon Key are correct
- Refresh the page after saving

### Google OAuth not working
- Check that your redirect URI is exactly correct in Google Cloud Console
- Verify Google provider is enabled in Supabase
- Make sure Client ID and Secret are correct

### Database connection errors
- Verify the SQL schema was created successfully
- Check RLS policies are in place
- Ensure your anon key has the correct permissions

### "Relation does not exist" errors
- Re-run the SQL schema setup from Step 3
- Make sure you're running it in the correct Supabase project

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
