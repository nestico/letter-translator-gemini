-- Add header_info column to translations table to store Beneficiary scraped data
ALTER TABLE translations ADD COLUMN IF NOT EXISTS header_info JSONB;
