-- Comprehensive fix for VAT entries table PGRST204 error
-- This creates the table with proper structure if it doesn't exist

-- First, check if table exists and create if needed
DO $$ 
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vat_entries'
    ) THEN
        RAISE NOTICE 'Creating vat_entries table...';
        
        CREATE TABLE public.vat_entries (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            entry_type TEXT NOT NULL, -- 'order', 'charging', 'manual'
            entry_id TEXT NOT NULL, -- Reference to orders.id or charging_sessions.id as TEXT
            item_name TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL, -- Base amount (excluding VAT)
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
        
        -- Enable RLS
        ALTER TABLE public.vat_entries ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view own vat entries" ON public.vat_entries 
        FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can manage own vat entries" ON public.vat_entries 
        FOR ALL USING (auth.uid() = user_id);
        
        -- Create indexes
        CREATE INDEX idx_vat_entries_user_id ON public.vat_entries(user_id);
        CREATE INDEX idx_vat_entries_entry_type ON public.vat_entries(entry_type);
        CREATE INDEX idx_vat_entries_created_at ON public.vat_entries(created_at);
        
        -- Grant permissions
        GRANT ALL ON public.vat_entries TO authenticated;
        GRANT ALL ON public.vat_entries TO service_role;
        
    ELSE
        RAISE NOTICE 'vat_entries table already exists, checking columns...';
        
        -- Check if entry_id column exists and has correct type
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'entry_id'
        ) THEN
            RAISE NOTICE 'Adding missing entry_id column...';
            ALTER TABLE public.vat_entries ADD COLUMN entry_id TEXT NOT NULL DEFAULT '';
        END IF;
        
        -- Ensure entry_id is TEXT type (not UUID)
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'entry_id'
            AND data_type = 'uuid'
        ) THEN
            RAISE NOTICE 'Converting entry_id from UUID to TEXT...';
            ALTER TABLE public.vat_entries ALTER COLUMN entry_id TYPE TEXT USING entry_id::TEXT;
        END IF;
        
        -- Ensure other required columns exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'user_id'
        ) THEN
            ALTER TABLE public.vat_entries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'entry_type'
        ) THEN
            ALTER TABLE public.vat_entries ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'manual';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'item_name'
        ) THEN
            ALTER TABLE public.vat_entries ADD COLUMN item_name TEXT NOT NULL DEFAULT '';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'amount'
        ) THEN
            ALTER TABLE public.vat_entries ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'vat_rate'
        ) THEN
            ALTER TABLE public.vat_entries ADD COLUMN vat_rate DECIMAL(5,2) DEFAULT 13.00;
        END IF;
        
        -- Add computed columns if they don't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'vat_amount'
        ) THEN
            ALTER TABLE public.vat_entries ADD COLUMN vat_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount * vat_rate / 100) STORED;
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'vat_entries' 
            AND column_name = 'total_with_vat'
        ) THEN
            ALTER TABLE public.vat_entries ADD COLUMN total_with_vat DECIMAL(10,2) GENERATED ALWAYS AS (amount + (amount * vat_rate / 100)) STORED;
        END IF;
        
    END IF;
    
    -- Create updated_at trigger if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'update_vat_entries_updated_at'
    ) THEN
        -- Create or update the trigger function
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ language 'plpgsql';
        
        CREATE TRIGGER update_vat_entries_updated_at 
            BEFORE UPDATE ON public.vat_entries 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
END $$;

-- Refresh PostgREST schema cache to pick up changes
NOTIFY pgrst, 'reload schema';

-- Show final table structure for verification
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    generation_expression
FROM information_schema.columns 
WHERE table_name = 'vat_entries' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
