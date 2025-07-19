-- Fix VAT entries table structure to resolve PGRST204 error
-- This ensures the table exists with all required columns

-- Drop and recreate the table to ensure proper structure
DROP TABLE IF EXISTS public.vat_entries CASCADE;

-- Create VAT entries table with correct structure
CREATE TABLE public.vat_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL, -- 'order', 'charging', 'manual'
  entry_id TEXT NOT NULL, -- Changed from UUID to TEXT for flexibility
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vat_entries_user_id ON public.vat_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_vat_entries_entry_type ON public.vat_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_vat_entries_created_at ON public.vat_entries(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vat_entries_updated_at 
    BEFORE UPDATE ON public.vat_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Grant necessary permissions
GRANT ALL ON public.vat_entries TO authenticated;
GRANT ALL ON public.vat_entries TO service_role;

-- Verify table structure
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
