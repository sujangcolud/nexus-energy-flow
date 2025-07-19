-- QUICK FIX for PGRST204: "Could not find the 'category' column of 'deposits'"
-- Run this immediately to fix the error

-- Add the missing category column to deposits table
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- Add other missing columns that the frontend expects
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS deposited_to TEXT;

-- Update existing records with default values
UPDATE deposits 
SET 
    category = 'General' WHERE category IS NULL,
    sender_name = deposited_by WHERE sender_name IS NULL,
    receiver_name = 'Account Holder' WHERE receiver_name IS NULL,
    deposited_to = mode WHERE deposited_to IS NULL;

-- Create deposit_categories table for the category dropdown
CREATE TABLE IF NOT EXISTS deposit_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add default categories
INSERT INTO deposit_categories (name) VALUES 
    ('General'),
    ('Business'),
    ('Personal'),
    ('Investment'),
    ('Savings')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE deposit_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can view deposit categories" ON deposit_categories FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can manage deposit categories" ON deposit_categories FOR ALL USING (auth.uid() IS NOT NULL);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Verify the fix
SELECT 'Deposits table now has these columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'deposits' AND table_schema = 'public'
ORDER BY column_name;
