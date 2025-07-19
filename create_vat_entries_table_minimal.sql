-- Minimal VAT entries table creation for immediate fix
-- This creates the table if it doesn't exist without dropping existing data

-- Create the table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.vat_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'manual',
  entry_id TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 13.00,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_with_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  bill_generated BOOLEAN DEFAULT false,
  bill_number TEXT,
  bill_date DATE,
  customer_pan TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Check and add amount column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.vat_entries ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
    
    -- Check and add vat_rate column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'vat_rate'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.vat_entries ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 13.00;
    END IF;
    
    -- Check and add vat_amount column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'vat_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.vat_entries ADD COLUMN vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
    
    -- Check and add total_with_vat column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND column_name = 'total_with_vat'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.vat_entries ADD COLUMN total_with_vat DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
    
END $$;

-- Add RLS if not enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'vat_entries' 
        AND schemaname = 'public'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.vat_entries ENABLE ROW LEVEL SECURITY;
        
        -- Create basic RLS policies
        CREATE POLICY "vat_entries_policy" ON public.vat_entries 
        FOR ALL USING (true); -- Allow all for now, can be refined later
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.vat_entries TO authenticated;
GRANT ALL ON public.vat_entries TO anon;
GRANT ALL ON public.vat_entries TO service_role;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the table exists with required columns
SELECT 'VAT entries table check:' as status,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'vat_entries' 
           AND table_schema = 'public'
       ) THEN 'Table exists'
       ELSE 'Table missing'
       END as table_status,
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'vat_entries' 
        AND table_schema = 'public') as column_count;
