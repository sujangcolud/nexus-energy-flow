-- Fix for "column type does not exist" error in vat_entries table
-- Ensure the vat_entries table has the correct structure

-- Check if vat_entries table exists and has correct structure
DO $$
BEGIN
    -- Create vat_entries table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'vat_entries' AND table_schema = 'public'
    ) THEN
        CREATE TABLE public.vat_entries (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            entry_type TEXT NOT NULL, -- 'order' or 'charging'
            entry_id UUID NOT NULL,
            item_name TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            vat_rate DECIMAL(5,2) DEFAULT 13.00,
            vat_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount * vat_rate / 100) STORED,
            total_with_vat DECIMAL(10,2) GENERATED ALWAYS AS (amount + (amount * vat_rate / 100)) STORED,
            bill_generated BOOLEAN DEFAULT false,
            bill_number TEXT,
            bill_date DATE,
            customer_pan TEXT,
            customer_name TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created vat_entries table';
    END IF;
    
    -- Ensure the table has the correct columns
    -- Check if entry_type column exists (not 'type')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'entry_type' 
        AND table_schema = 'public'
    ) THEN
        -- Add entry_type column if it doesn't exist
        ALTER TABLE vat_entries ADD COLUMN entry_type TEXT;
        UPDATE vat_entries SET entry_type = 'order' WHERE entry_type IS NULL;
        ALTER TABLE vat_entries ALTER COLUMN entry_type SET NOT NULL;
        
        RAISE NOTICE 'Added entry_type column to vat_entries table';
    END IF;
    
    -- Remove 'type' column if it exists (should be 'entry_type')
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'type' 
        AND table_schema = 'public'
    ) THEN
        -- Copy data from 'type' to 'entry_type' if needed
        UPDATE vat_entries SET entry_type = type WHERE entry_type IS NULL;
        
        -- Drop the incorrect 'type' column
        ALTER TABLE vat_entries DROP COLUMN type;
        
        RAISE NOTICE 'Removed incorrect type column from vat_entries table';
    END IF;
    
    -- Ensure other required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'entry_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE vat_entries ADD COLUMN entry_id UUID;
        RAISE NOTICE 'Added entry_id column to vat_entries table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'item_name' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE vat_entries ADD COLUMN item_name TEXT;
        RAISE NOTICE 'Added item_name column to vat_entries table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'amount' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE vat_entries ADD COLUMN amount DECIMAL(10,2);
        RAISE NOTICE 'Added amount column to vat_entries table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'vat_rate' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE vat_entries ADD COLUMN vat_rate DECIMAL(5,2) DEFAULT 13.00;
        RAISE NOTICE 'Added vat_rate column to vat_entries table';
    END IF;
    
END $$;

-- Enable RLS on vat_entries table
ALTER TABLE vat_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own vat entries" ON vat_entries;
CREATE POLICY "Users can view own vat entries" ON vat_entries 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own vat entries" ON vat_entries;
CREATE POLICY "Users can manage own vat entries" ON vat_entries 
    FOR ALL USING (auth.uid() = user_id);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Verify the table structure
SELECT 'VAT Entries table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'vat_entries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test insert to make sure it works
DO $$
DECLARE
    test_user_id UUID;
    test_order_id UUID;
BEGIN
    -- Get a test user and order
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    SELECT id INTO test_order_id FROM orders LIMIT 1;
    
    IF test_user_id IS NOT NULL AND test_order_id IS NOT NULL THEN
        -- Test insert
        INSERT INTO vat_entries (
            user_id, 
            entry_type, 
            entry_id, 
            item_name, 
            amount, 
            vat_rate
        ) VALUES (
            test_user_id,
            'order',
            test_order_id,
            'Test Item',
            100.00,
            13.00
        );
        
        RAISE NOTICE 'Test VAT entry inserted successfully';
        
        -- Clean up test data
        DELETE FROM vat_entries WHERE item_name = 'Test Item';
        
    ELSE
        RAISE NOTICE 'No test data available for VAT entries test';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing VAT entries: %', SQLERRM;
END $$;

SELECT 'VAT entries table fixed successfully' as status;
