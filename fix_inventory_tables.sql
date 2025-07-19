-- Fix inventory tables to resolve PGRST errors
-- This ensures both inventory and inventory_transactions tables exist

-- Create inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  supplier TEXT,
  purchase_date DATE,
  expiry_date DATE,
  location TEXT,
  minimum_stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expense_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create inventory_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inventory_id UUID,
  transaction_type TEXT NOT NULL DEFAULT 'manual',
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add missing inventory columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'user_id' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory ADD COLUMN user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'is_active' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add missing inventory_transactions columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_transactions' AND column_name = 'user_id' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_transactions ADD COLUMN user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_transactions' AND column_name = 'transaction_date' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_transactions ADD COLUMN transaction_date DATE DEFAULT CURRENT_DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_transactions' AND column_name = 'notes' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_transactions ADD COLUMN notes TEXT;
    END IF;
    
END $$;

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DROP POLICY IF EXISTS "inventory_user_policy" ON public.inventory;
CREATE POLICY "inventory_user_policy" ON public.inventory 
FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "inventory_transactions_user_policy" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_user_policy" ON public.inventory_transactions 
FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON public.inventory(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_is_active ON public.inventory(is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id ON public.inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.inventory_transactions(transaction_date);

-- Grant permissions
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO anon;
GRANT ALL ON public.inventory TO service_role;

GRANT ALL ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO anon;
GRANT ALL ON public.inventory_transactions TO service_role;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify tables exist
SELECT 
    'Inventory tables check:' as status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory' AND table_schema = 'public') 
         THEN 'inventory: EXISTS' 
         ELSE 'inventory: MISSING' 
    END as inventory_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_transactions' AND table_schema = 'public') 
         THEN 'inventory_transactions: EXISTS' 
         ELSE 'inventory_transactions: MISSING' 
    END as transactions_status;

-- Show column counts
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name IN ('inventory', 'inventory_transactions') 
    AND table_schema = 'public'
GROUP BY table_name;
