-- ============================================
-- Golden Goose Tees - Supabase Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor to set up the database
--
-- Prerequisites:
-- 1. Create a new Supabase project at https://supabase.com
-- 2. Go to SQL Editor in your project dashboard
-- 3. Paste this entire file and click "Run"
-- ============================================

-- ============================================
-- Enable necessary extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Drop existing tables (for fresh install)
-- Uncomment these lines if you need to reset
-- ============================================
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS designs CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;
-- DROP TYPE IF EXISTS order_status CASCADE;

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
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- Designs Table
-- ============================================
CREATE TABLE IF NOT EXISTS designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

-- Indexes for designs
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_product_id ON designs(product_id);
CREATE INDEX IF NOT EXISTS idx_designs_is_public ON designs(is_public);
CREATE INDEX IF NOT EXISTS idx_designs_catalog_section ON designs(catalog_section);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at DESC);

-- ============================================
-- Orders Table
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    design_id UUID REFERENCES designs(id) ON DELETE SET NULL,
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

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_design_id ON orders(design_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_printful_order_id ON orders(printful_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- Design Sessions Table (optional - for resumable sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS design_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    current_designs JSONB DEFAULT '[]'::jsonb,
    stage TEXT DEFAULT 'product_selection',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_sessions_user_id ON design_sessions(user_id);

-- ============================================
-- Catalog Sections Table (optional - for organizing public designs)
-- ============================================
CREATE TABLE IF NOT EXISTS catalog_sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rating TEXT DEFAULT 'sfw' CHECK (rating IN ('sfw', 'nsfw')),
    design_type TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default catalog sections
INSERT INTO catalog_sections (id, name, rating, design_type, sort_order) VALUES
    ('sfw-graphics', 'Graphics & Illustrations', 'sfw', 'graphic', 1),
    ('sfw-text', 'Typography & Text', 'sfw', 'text', 2),
    ('sfw-photos', 'Photo Prints', 'sfw', 'photo', 3),
    ('sfw-abstract', 'Abstract Art', 'sfw', 'abstract', 4),
    ('nsfw-adult', 'Adult Content', 'nsfw', 'adult', 10)
ON CONFLICT (id) DO NOTHING;

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

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_designs_updated_at ON designs;
CREATE TRIGGER update_designs_updated_at
    BEFORE UPDATE ON designs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_sessions_updated_at ON design_sessions;
CREATE TRIGGER update_design_sessions_updated_at
    BEFORE UPDATE ON design_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_sections ENABLE ROW LEVEL SECURITY;

-- Users policies (optimized with subselect pattern for better plan caching)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON users;
CREATE POLICY "Users can delete their own profile" ON users
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- Designs policies (optimized with subselect pattern)
DROP POLICY IF EXISTS "Users can view their own designs" ON designs;
CREATE POLICY "Users can view their own designs" ON designs
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "Users can create designs" ON designs;
CREATE POLICY "Users can create designs" ON designs
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own designs" ON designs;
CREATE POLICY "Users can update their own designs" ON designs
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own designs" ON designs;
CREATE POLICY "Users can delete their own designs" ON designs
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Orders policies (optimized with subselect pattern)
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Design sessions policies (optimized with subselect pattern)
DROP POLICY IF EXISTS "Users can manage their own sessions" ON design_sessions;
CREATE POLICY "Users can manage their own sessions" ON design_sessions
    FOR ALL 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Catalog sections policies (public read)
DROP POLICY IF EXISTS "Anyone can view catalog sections" ON catalog_sections;
CREATE POLICY "Anyone can view catalog sections" ON catalog_sections
    FOR SELECT USING (TRUE);

-- ============================================
-- Admin policies (for users with admin role)
-- ============================================

-- Admin can view all users (optimized with subselect)
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Admin can update all users
DROP POLICY IF EXISTS "Admins can update all users" ON users;
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Admin can view all designs (optimized with subselect)
DROP POLICY IF EXISTS "Admins can view all designs" ON designs;
CREATE POLICY "Admins can view all designs" ON designs
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Admin can update all designs (for moderation)
DROP POLICY IF EXISTS "Admins can update all designs" ON designs;
CREATE POLICY "Admins can update all designs" ON designs
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Admin can view all orders (optimized with subselect)
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Admin can update all orders (optimized with subselect)
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
CREATE POLICY "Admins can update all orders" ON orders
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- ============================================
-- Service role bypass for webhooks
-- Note: Service role key bypasses RLS automatically
-- ============================================

-- ============================================
-- Storage Bucket Setup
-- Run these commands separately in the Storage section
-- or via the Supabase Dashboard
-- ============================================

-- Create designs bucket (run in SQL editor)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'designs',
    'designs',
    TRUE,
    10485760, -- 10MB limit
    ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

-- Storage policies for designs bucket
DROP POLICY IF EXISTS "Users can upload their own designs" ON storage.objects;
CREATE POLICY "Users can upload their own designs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'designs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update their own designs" ON storage.objects;
CREATE POLICY "Users can update their own designs" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'designs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own designs" ON storage.objects;
CREATE POLICY "Users can delete their own designs" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'designs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Anyone can view public designs" ON storage.objects;
CREATE POLICY "Anyone can view public designs" ON storage.objects
    FOR SELECT USING (bucket_id = 'designs');

-- ============================================
-- Useful Views
-- ============================================

-- Order summary view
CREATE OR REPLACE VIEW order_summary AS
SELECT
    o.id,
    o.user_id,
    u.name as user_name,
    u.email as user_email,
    o.product_id,
    o.size,
    o.color,
    o.status,
    o.total_amount,
    o.stripe_session_id,
    o.printful_order_id,
    o.tracking_number,
    o.created_at,
    o.updated_at
FROM orders o
LEFT JOIN users u ON o.user_id = u.id;

-- Design catalog view (public designs only)
CREATE OR REPLACE VIEW design_catalog AS
SELECT
    d.id,
    d.user_id,
    u.name as creator_name,
    d.product_id,
    d.title,
    d.description,
    d.catalog_section,
    d.files,
    d.created_at
FROM designs d
LEFT JOIN users u ON d.user_id = u.id
WHERE d.is_public = TRUE AND d.is_nsfw = FALSE;

-- ============================================
-- Sample Data (Optional - for testing)
-- Uncomment to insert test data
-- ============================================

/*
-- Test admin user (replace with your actual user ID after OAuth)
INSERT INTO users (id, email, name, role, age_verified) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@goldengoosetees.com', 'Admin User', 'admin', TRUE)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Sample design
INSERT INTO designs (user_id, product_id, title, is_public, files) VALUES
    ('00000000-0000-0000-0000-000000000001', 'classic-tee', 'Sample Design', TRUE,
     '[{"id": "file-1", "printAreaId": "front", "dataUrl": "data:image/svg+xml,...", "format": "SVG", "widthPx": 2400, "heightPx": 3000, "dpi": 300}]'::jsonb
    );
*/

-- ============================================
-- Admin Audit Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON admin_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);

-- Enable RLS on audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (optimized with subselect)
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Service role can insert (for server-side logging)
-- Note: Service role bypasses RLS automatically, so no policy needed for inserts

-- ============================================
-- Verification Query
-- Run this to verify setup
-- ============================================
SELECT
    'Tables' as type,
    table_name as name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
UNION ALL
SELECT
    'Policies' as type,
    policyname as name
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY type, name;
