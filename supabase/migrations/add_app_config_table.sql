-- Migration: Add app_config table for application configuration
-- This table stores dynamic configuration that can be updated via admin API

-- Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- AI Provider Configuration
    conversational_provider TEXT DEFAULT 'gemini' CHECK (conversational_provider IN ('gemini', 'openai', 'openrouter')),
    conversational_model_id TEXT DEFAULT 'gemini-2.0-flash',
    image_model_primary TEXT DEFAULT 'gemini-2.0-flash-exp-image-generation',
    image_model_fallback TEXT DEFAULT 'gemini-2.0-flash-exp',
    openrouter_enabled BOOLEAN DEFAULT FALSE,
    
    -- Alert Configuration
    alert_email TEXT,
    alert_phone TEXT,
    alert_system_errors BOOLEAN DEFAULT TRUE,
    alert_rate_limiting BOOLEAN DEFAULT TRUE,
    alert_ai_failures BOOLEAN DEFAULT TRUE,
    alert_payment_orders BOOLEAN DEFAULT TRUE,
    alert_external_services BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on id for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_config_id ON app_config(id);

-- Add update trigger
DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at
    BEFORE UPDATE ON app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Only admins can view app config
DROP POLICY IF EXISTS "Admins can view app config" ON app_config;
CREATE POLICY "Admins can view app config" ON app_config
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Only admins can update app config
DROP POLICY IF EXISTS "Admins can update app config" ON app_config;
CREATE POLICY "Admins can update app config" ON app_config
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Only admins can insert app config
DROP POLICY IF EXISTS "Admins can insert app config" ON app_config;
CREATE POLICY "Admins can insert app config" ON app_config
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Insert default configuration
INSERT INTO app_config (
    conversational_provider,
    conversational_model_id,
    image_model_primary,
    image_model_fallback,
    openrouter_enabled,
    alert_system_errors,
    alert_rate_limiting,
    alert_ai_failures,
    alert_payment_orders,
    alert_external_services
) VALUES (
    'gemini',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-exp',
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
)
ON CONFLICT DO NOTHING;

-- Note: Service role key bypasses RLS automatically for server-side operations
