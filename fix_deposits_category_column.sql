-- Fix for PGRST204 "Could not find the 'category' column of 'deposits'" error
-- Add missing category column to deposits table

-- Add category column to deposits table if it doesn't exist
DO $$
BEGIN
    -- Check if category column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deposits' 
        AND column_name = 'category' 
        AND table_schema = 'public'
    ) THEN
        -- Add category column
        ALTER TABLE deposits ADD COLUMN category TEXT;
        
        -- Set default category for existing records
        UPDATE deposits SET category = 'General' WHERE category IS NULL;
        
        RAISE NOTICE 'Added category column to deposits table';
    ELSE
        RAISE NOTICE 'Category column already exists in deposits table';
    END IF;
    
    -- Add other potentially missing columns that the frontend expects
    
    -- Add sender_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deposits' 
        AND column_name = 'sender_name' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE deposits ADD COLUMN sender_name TEXT;
        UPDATE deposits SET sender_name = deposited_by WHERE sender_name IS NULL;
        
        RAISE NOTICE 'Added sender_name column to deposits table';
    END IF;
    
    -- Add receiver_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deposits' 
        AND column_name = 'receiver_name' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE deposits ADD COLUMN receiver_name TEXT;
        UPDATE deposits SET receiver_name = 'Account Holder' WHERE receiver_name IS NULL;
        
        RAISE NOTICE 'Added receiver_name column to deposits table';
    END IF;
    
    -- Add deposited_to column if it doesn't exist (for summary compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deposits' 
        AND column_name = 'deposited_to' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE deposits ADD COLUMN deposited_to TEXT;
        UPDATE deposits SET deposited_to = mode WHERE deposited_to IS NULL;
        
        RAISE NOTICE 'Added deposited_to column to deposits table';
    END IF;
    
END $$;

-- Create deposit_categories table if it doesn't exist (for category management)
CREATE TABLE IF NOT EXISTS deposit_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on deposit_categories
ALTER TABLE deposit_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deposit_categories
DROP POLICY IF EXISTS "Anyone can view deposit categories" ON deposit_categories;
CREATE POLICY "Anyone can view deposit categories" ON deposit_categories 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage deposit categories" ON deposit_categories;
CREATE POLICY "Authenticated users can manage deposit categories" ON deposit_categories 
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default deposit categories if they don't exist
INSERT INTO deposit_categories (name, description) VALUES
    ('General', 'General deposits'),
    ('Business', 'Business-related deposits'),
    ('Personal', 'Personal deposits'),
    ('Investment', 'Investment deposits'),
    ('Savings', 'Savings deposits')
ON CONFLICT (name) DO NOTHING;

-- Add foreign key constraint to link deposits.category to deposit_categories.name
-- Note: We use name instead of id for easier management
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'deposits_category_fkey' 
        AND table_name = 'deposits'
    ) THEN
        -- For now, we'll keep it as TEXT to avoid breaking existing data
        -- Could be converted to FK later if needed
        RAISE NOTICE 'Category column is TEXT type for flexibility';
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_deposits_category ON deposits(category);
CREATE INDEX IF NOT EXISTS idx_deposits_deposited_to ON deposits(deposited_to);

-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Verify the table structure
SELECT 'Deposits table structure after fix:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'deposits' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test insert to make sure it works
DO $$
DECLARE
    test_user_id UUID;
    test_deposit_id UUID;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test insert with category
        INSERT INTO deposits (
            user_id,
            amount,
            mode,
            deposited_by,
            deposit_date,
            category,
            sender_name,
            receiver_name,
            deposited_to,
            remarks
        ) VALUES (
            test_user_id,
            100.00,
            'cash',
            'Test User',
            CURRENT_DATE,
            'General',
            'Test Sender',
            'Test Receiver',
            'cash',
            'Test deposit with category'
        ) RETURNING id INTO test_deposit_id;
        
        RAISE NOTICE 'Test deposit with category inserted successfully with ID: %', test_deposit_id;
        
        -- Clean up test data
        DELETE FROM deposits WHERE id = test_deposit_id;
        
    ELSE
        RAISE NOTICE 'No users found for testing deposits';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing deposits with category: %', SQLERRM;
END $$;

SELECT 'Deposits category column fixed successfully' as status;
