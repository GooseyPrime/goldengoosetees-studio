ALTER TABLE designs
ADD COLUMN IF NOT EXISTS selected_placements TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS canvas_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS placement_file_ids JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS placement_file_urls JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS mockup_task_ids JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS mockup_results JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS mockup_status TEXT DEFAULT 'pending';