-- Add variant selections to designs and orders for multi-product support
ALTER TABLE designs ADD COLUMN IF NOT EXISTS variant_selections JSONB DEFAULT '{}'::jsonb;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_selections JSONB DEFAULT '{}'::jsonb;
ALTER TABLE orders ALTER COLUMN size DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN color DROP NOT NULL;
