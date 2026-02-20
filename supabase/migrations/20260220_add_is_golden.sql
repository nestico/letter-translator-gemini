-- Add is_golden and image_urls columns to translations table
ALTER TABLE translations ADD COLUMN IF NOT EXISTS is_golden BOOLEAN DEFAULT FALSE;
ALTER TABLE translations ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Index for faster lookup of golden references
CREATE INDEX IF NOT EXISTS idx_translations_is_golden ON translations(is_golden) WHERE is_golden = TRUE;
