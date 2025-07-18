-- Comprehensive migration to fix all app issues for Energy Palace Nexus
-- Run this migration in your Supabase dashboard

-- ============================================================================
-- 1. FIX ORDERS TABLE DATE FIELD ISSUE
-- ============================================================================

-- Ensure orders table has both date and order_date columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS date DATE;

-- Drop problematic triggers
DROP TRIGGER IF EXISTS sync_order_date_trigger ON public.orders;
DROP TRIGGER IF EXISTS update_daily_summary_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS calculate_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS orders_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS daily_summary_update_trigger ON public.orders;
DROP TRIGGER IF EXISTS auto_inventory_trigger ON public.orders;

-- Create robust sync function
CREATE OR REPLACE FUNCTION public.sync_order_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.order_date IS NOT NULL THEN
      NEW.date = NEW.order_date;
    ELSIF NEW.date IS NOT NULL THEN
      NEW.order_date = NEW.date;
    ELSE
      NEW.order_date = CURRENT_DATE;
      NEW.date = CURRENT_DATE;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.order_date != OLD.order_date THEN
      NEW.date = NEW.order_date;
    ELSIF NEW.date != OLD.date THEN
      NEW.order_date = NEW.date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the sync trigger
CREATE TRIGGER sync_order_date_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_date();

-- Fix existing data
UPDATE public.orders SET date = order_date WHERE date IS NULL AND order_date IS NOT NULL;
UPDATE public.orders SET order_date = date WHERE order_date IS NULL AND date IS NOT NULL;
UPDATE public.orders SET order_date = created_at::date, date = created_at::date WHERE order_date IS NULL AND date IS NULL;

-- ============================================================================
-- 2. CREATE/UPDATE BUSINESS TABLES
-- ============================================================================

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  table_type text NOT NULL, -- 'orders', 'expenses', 'charging', etc.
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(name, table_type, user_id)
);

-- Payment modes table
CREATE TABLE IF NOT EXISTS public.payment_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  table_type text NOT NULL, -- 'orders', 'expenses', 'charging', etc.
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(name, table_type, user_id)
);

-- VAT entries table
CREATE TABLE IF NOT EXISTS public.vat_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL, -- 'order' or 'charging'
  entry_id uuid NOT NULL, -- Reference to orders.id or charging_sessions.id
  item_name text NOT NULL,
  amount numeric NOT NULL,
  vat_rate numeric DEFAULT 13, -- Nepal VAT rate
  vat_amount numeric GENERATED ALWAYS AS (amount * vat_rate / 100) STORED,
  total_with_vat numeric GENERATED ALWAYS AS (amount + (amount * vat_rate / 100)) STORED,
  bill_generated boolean DEFAULT false,
  bill_number text,
  bill_date date,
  customer_pan text,
  customer_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  description text,
  category text,
  quantity numeric DEFAULT 0,
  unit_cost numeric,
  total_cost numeric GENERATED ALWAYS AS (quantity * COALESCE(unit_cost, 0)) STORED,
  supplier text,
  purchase_date date,
  expiry_date date,
  location text,
  minimum_stock numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  expense_id uuid, -- Reference to expenses table
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Inventory transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- 'stock_in', 'stock_out'
  quantity numeric NOT NULL,
  unit_cost numeric,
  total_cost numeric,
  reference_type text, -- 'expense', 'manual', 'adjustment'
  reference_id uuid, -- Reference to related record
  notes text,
  transaction_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Expense bookings table
CREATE TABLE IF NOT EXISTS public.expense_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_name text NOT NULL,
  description text,
  amount numeric NOT NULL,
  category text,
  payment_mode text,
  booking_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Custom calculations table
CREATE TABLE IF NOT EXISTS public.custom_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  calculation_config jsonb NOT NULL, -- Stores the calculation formula and configuration
  result_cache jsonb, -- Cached calculation results
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 3. ADD MISSING DATE COLUMNS TO OTHER TABLES
-- ============================================================================

-- Charging sessions
ALTER TABLE public.charging_sessions ADD COLUMN IF NOT EXISTS date DATE;
CREATE OR REPLACE FUNCTION public.sync_charging_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date = NEW.session_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_charging_date_trigger ON public.charging_sessions;
CREATE TRIGGER sync_charging_date_trigger
  BEFORE INSERT OR UPDATE ON public.charging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_charging_date();

UPDATE public.charging_sessions SET date = session_date WHERE date IS NULL;

-- Expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS date DATE;
CREATE OR REPLACE FUNCTION public.sync_expense_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date = NEW.expense_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_expense_date_trigger ON public.expenses;
CREATE TRIGGER sync_expense_date_trigger
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_expense_date();

UPDATE public.expenses SET date = expense_date WHERE date IS NULL;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_table_type_user ON public.categories(table_type, user_id);
CREATE INDEX IF NOT EXISTS idx_payment_modes_table_type_user ON public.payment_modes(table_type, user_id);
CREATE INDEX IF NOT EXISTS idx_vat_entries_entry_type_user ON public.vat_entries(entry_type, user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_active ON public.inventory(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_expense_bookings_status_user ON public.expense_bookings(status, user_id);
CREATE INDEX IF NOT EXISTS idx_custom_calculations_user_active ON public.custom_calculations(user_id, is_active);

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_calculations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES
-- ============================================================================

-- Categories policies
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

-- Payment modes policies
DROP POLICY IF EXISTS "Users can manage own payment modes" ON public.payment_modes;
CREATE POLICY "Users can manage own payment modes" ON public.payment_modes
  FOR ALL USING (auth.uid() = user_id);

-- VAT entries policies
DROP POLICY IF EXISTS "Users can manage own vat entries" ON public.vat_entries;
CREATE POLICY "Users can manage own vat entries" ON public.vat_entries
  FOR ALL USING (auth.uid() = user_id);

-- Inventory policies
DROP POLICY IF EXISTS "Users can manage own inventory" ON public.inventory;
CREATE POLICY "Users can manage own inventory" ON public.inventory
  FOR ALL USING (auth.uid() = user_id);

-- Inventory transactions policies
DROP POLICY IF EXISTS "Users can manage own inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Users can manage own inventory transactions" ON public.inventory_transactions
  FOR ALL USING (auth.uid() = user_id);

-- Expense bookings policies
DROP POLICY IF EXISTS "Users can manage own expense bookings" ON public.expense_bookings;
CREATE POLICY "Users can manage own expense bookings" ON public.expense_bookings
  FOR ALL USING (auth.uid() = user_id);

-- Custom calculations policies
DROP POLICY IF EXISTS "Users can manage own custom calculations" ON public.custom_calculations;
CREATE POLICY "Users can manage own custom calculations" ON public.custom_calculations
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 7. CREATE/UPDATE RPC FUNCTIONS
-- ============================================================================

-- Safe order insertion function
CREATE OR REPLACE FUNCTION public.insert_order_safe(
  p_user_id uuid,
  p_item_name text,
  p_quantity integer,
  p_rate numeric,
  p_total numeric,
  p_payment_mode text,
  p_order_date date
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  item_name text,
  quantity integer,
  rate numeric,
  total numeric,
  payment_mode text,
  order_date date,
  date date,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_order_id uuid;
BEGIN
  INSERT INTO public.orders (
    user_id, 
    item_name, 
    quantity, 
    rate, 
    total, 
    payment_mode, 
    order_date, 
    date
  ) VALUES (
    p_user_id, 
    p_item_name, 
    p_quantity, 
    p_rate, 
    p_total, 
    p_payment_mode, 
    p_order_date, 
    p_order_date
  )
  RETURNING orders.id INTO new_order_id;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.user_id,
    o.item_name,
    o.quantity,
    o.rate,
    o.total,
    o.payment_mode,
    o.order_date,
    o.date,
    o.created_at
  FROM public.orders o
  WHERE o.id = new_order_id;
END;
$$;

-- VAT calculation function
CREATE OR REPLACE FUNCTION public.calculate_vat(amount numeric, vat_rate numeric DEFAULT 13)
RETURNS numeric AS $$
BEGIN
  RETURN amount * vat_rate / 100;
END;
$$ LANGUAGE plpgsql;

-- Daily closing function
CREATE OR REPLACE FUNCTION public.daily_closing(
  p_user_id uuid,
  p_closing_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_summary jsonb;
  cash_total numeric := 0;
  bank_total numeric := 0;
  total_income numeric := 0;
  total_expenses numeric := 0;
BEGIN
  -- Calculate daily totals
  SELECT 
    COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_mode != 'Cash' THEN total ELSE 0 END), 0),
    COALESCE(SUM(total), 0)
  INTO cash_total, bank_total, total_income
  FROM orders 
  WHERE user_id = p_user_id AND order_date = p_closing_date;
  
  -- Add charging income
  SELECT 
    cash_total + COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN total_amount ELSE 0 END), 0),
    bank_total + COALESCE(SUM(CASE WHEN payment_mode != 'Cash' THEN total_amount ELSE 0 END), 0),
    total_income + COALESCE(SUM(total_amount), 0)
  INTO cash_total, bank_total, total_income
  FROM charging_sessions 
  WHERE user_id = p_user_id AND session_date = p_closing_date;
  
  -- Subtract expenses
  SELECT 
    COALESCE(SUM(amount), 0)
  INTO total_expenses
  FROM expenses 
  WHERE user_id = p_user_id AND expense_date = p_closing_date;
  
  -- Create summary
  daily_summary := jsonb_build_object(
    'date', p_closing_date,
    'cash_total', cash_total,
    'bank_total', bank_total,
    'total_income', total_income,
    'total_expenses', total_expenses,
    'net_total', total_income - total_expenses
  );
  
  RETURN daily_summary;
END;
$$;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.insert_order_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_vat TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_closing TO authenticated;

-- ============================================================================
-- 9. INSERT DEFAULT DATA
-- ============================================================================

-- Insert default categories (if they don't exist)
INSERT INTO public.categories (name, table_type, user_id) 
SELECT 'Food & Beverages', 'orders', auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Food & Beverages' AND table_type = 'orders' AND user_id = auth.uid()
);

INSERT INTO public.categories (name, table_type, user_id) 
SELECT 'Equipment', 'expenses', auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Equipment' AND table_type = 'expenses' AND user_id = auth.uid()
);

-- Insert default payment modes (if they don't exist)
INSERT INTO public.payment_modes (name, table_type, user_id) 
SELECT 'Cash', 'all', auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_modes 
  WHERE name = 'Cash' AND table_type = 'all' AND user_id = auth.uid()
);

INSERT INTO public.payment_modes (name, table_type, user_id) 
SELECT 'Esewa', 'all', auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_modes 
  WHERE name = 'Esewa' AND table_type = 'all' AND user_id = auth.uid()
);

INSERT INTO public.payment_modes (name, table_type, user_id) 
SELECT 'Fonepay', 'all', auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_modes 
  WHERE name = 'Fonepay' AND table_type = 'all' AND user_id = auth.uid()
);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Add helpful comments
COMMENT ON TABLE public.orders IS 'Orders table with synchronized date fields';
COMMENT ON TABLE public.vat_entries IS 'VAT entries for Nepal VAT compliance (13% rate)';
COMMENT ON TABLE public.inventory IS 'Inventory management with auto-population from expenses';
COMMENT ON TABLE public.inventory_transactions IS 'Stock movement tracking';
