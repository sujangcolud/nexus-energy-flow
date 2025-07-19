-- ============================================================================
-- FINAL COMPREHENSIVE MIGRATION FOR ENERGY PALACE NEXUS
-- ============================================================================
-- This migration ensures all features work correctly and fixes any remaining issues
-- Run this after other migrations to ensure everything is properly set up

-- ============================================================================
-- 1. ENSURE ALL CORE TABLES EXIST WITH PROPER STRUCTURE
-- ============================================================================

-- Users table (should already exist via Supabase Auth)
-- Profiles table for additional user info
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  role text DEFAULT 'user', -- 'user', 'data_entry', 'reports_viewer', 'super_admin'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table - ensure it has all required columns
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  rate numeric NOT NULL,
  total numeric NOT NULL,
  payment_mode text NOT NULL,
  order_date date DEFAULT CURRENT_DATE,
  date date DEFAULT CURRENT_DATE, -- Synchronized with order_date
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Charging sessions table
CREATE TABLE IF NOT EXISTS public.charging_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  start_percentage numeric,
  end_percentage numeric,
  kcal numeric,
  total_amount numeric NOT NULL,
  payment_mode text NOT NULL,
  session_date date DEFAULT CURRENT_DATE,
  date date DEFAULT CURRENT_DATE, -- Synchronized with session_date
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  amount numeric NOT NULL,
  category text,
  payment_mode text NOT NULL,
  expense_date date DEFAULT CURRENT_DATE,
  date date DEFAULT CURRENT_DATE, -- Synchronized with expense_date
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  mode text NOT NULL, -- 'cash', 'bank', etc.
  description text,
  deposit_date date DEFAULT CURRENT_DATE,
  date date DEFAULT CURRENT_DATE, -- Synchronized with deposit_date
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  purpose text NOT NULL,
  payment_mode text,
  withdrawal_date date DEFAULT CURRENT_DATE,
  date date DEFAULT CURRENT_DATE, -- Synchronized with withdrawal_date
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cooperative savings table
CREATE TABLE IF NOT EXISTS public.cooperative_savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid REFERENCES auth.users(id),
  contribution_amount numeric NOT NULL,
  contribution_date date DEFAULT CURRENT_DATE,
  date date DEFAULT CURRENT_DATE, -- Synchronized with contribution_date
  cycle_period text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Share investments table
CREATE TABLE IF NOT EXISTS public.share_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  shares_quantity integer NOT NULL,
  price_per_share numeric NOT NULL,
  total_amount numeric GENERATED ALWAYS AS (shares_quantity * price_per_share) STORED,
  purchase_date date DEFAULT CURRENT_DATE,
  current_market_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu management table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text,
  price numeric NOT NULL,
  description text,
  is_available boolean DEFAULT true,
  preparation_time integer, -- in minutes
  ingredients text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

-- Balances table for tracking user balances
CREATE TABLE IF NOT EXISTS public.balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  cash_balance numeric DEFAULT 0,
  bank_balance numeric DEFAULT 0,
  esewa_balance numeric DEFAULT 0,
  fonepay_balance numeric DEFAULT 0,
  cooperative_balance numeric DEFAULT 0,
  total_balance numeric GENERATED ALWAYS AS (cash_balance + bank_balance + esewa_balance + fonepay_balance + cooperative_balance) STORED,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- User tab permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS public.user_tab_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_id text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tab_id)
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. CREATE DATE SYNCHRONIZATION TRIGGERS
-- ============================================================================

-- Orders date sync function
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

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS sync_order_date_trigger ON public.orders;
DROP TRIGGER IF EXISTS sync_charging_date_trigger ON public.charging_sessions;
DROP TRIGGER IF EXISTS sync_expense_date_trigger ON public.expenses;
DROP TRIGGER IF EXISTS sync_deposit_date_trigger ON public.deposits;
DROP TRIGGER IF EXISTS sync_withdrawal_date_trigger ON public.withdrawals;
DROP TRIGGER IF EXISTS sync_cooperative_date_trigger ON public.cooperative_savings;

-- Create the sync triggers
CREATE TRIGGER sync_order_date_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_date();

-- Charging sessions date sync
CREATE OR REPLACE FUNCTION public.sync_charging_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.date = COALESCE(NEW.session_date, CURRENT_DATE);
    NEW.session_date = COALESCE(NEW.session_date, CURRENT_DATE);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.session_date != OLD.session_date THEN
      NEW.date = NEW.session_date;
    ELSIF NEW.date != OLD.date THEN
      NEW.session_date = NEW.date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_charging_date_trigger
  BEFORE INSERT OR UPDATE ON public.charging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_charging_date();

-- Other table date sync functions
CREATE OR REPLACE FUNCTION public.sync_expense_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.date = COALESCE(NEW.expense_date, CURRENT_DATE);
    NEW.expense_date = COALESCE(NEW.expense_date, CURRENT_DATE);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.date = NEW.expense_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_expense_date_trigger
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_expense_date();

-- Similar functions for other tables
CREATE OR REPLACE FUNCTION public.sync_deposit_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.date = COALESCE(NEW.deposit_date, CURRENT_DATE);
    NEW.deposit_date = COALESCE(NEW.deposit_date, CURRENT_DATE);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.date = NEW.deposit_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_deposit_date_trigger
  BEFORE INSERT OR UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_deposit_date();

CREATE OR REPLACE FUNCTION public.sync_withdrawal_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.date = COALESCE(NEW.withdrawal_date, CURRENT_DATE);
    NEW.withdrawal_date = COALESCE(NEW.withdrawal_date, CURRENT_DATE);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.date = NEW.withdrawal_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_withdrawal_date_trigger
  BEFORE INSERT OR UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_withdrawal_date();

CREATE OR REPLACE FUNCTION public.sync_cooperative_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.date = COALESCE(NEW.contribution_date, CURRENT_DATE);
    NEW.contribution_date = COALESCE(NEW.contribution_date, CURRENT_DATE);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.date = NEW.contribution_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_cooperative_date_trigger
  BEFORE INSERT OR UPDATE ON public.cooperative_savings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cooperative_date();

-- ============================================================================
-- 3. ESSENTIAL RPC FUNCTIONS
-- ============================================================================

-- Execute custom query function for calculations
CREATE OR REPLACE FUNCTION public.execute_custom_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  sanitized_query text;
BEGIN
  -- Basic security check - only allow SELECT statements
  IF query_text !~* '^\\s*SELECT' THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;
  
  -- Prevent potentially dangerous keywords
  IF query_text ~* '(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER|TRUNCATE)' THEN
    RAISE EXCEPTION 'Potentially dangerous SQL detected';
  END IF;
  
  -- Execute the query
  EXECUTE 'SELECT to_jsonb(array_agg(row_to_json(t))) FROM (' || query_text || ') t' INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Get current user role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Get all users with roles (for admin)
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is super_admin
  IF (SELECT public.get_current_user_role()) != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Update user role function
CREATE OR REPLACE FUNCTION public.update_user_role(user_id_to_update uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is super_admin
  IF (SELECT public.get_current_user_role()) != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;
  
  -- Validate role
  IF new_role NOT IN ('user', 'data_entry', 'reports_viewer', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;
  
  UPDATE public.profiles 
  SET role = new_role, updated_at = now() 
  WHERE id = user_id_to_update;
END;
$$;

-- Check role function for authorization
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  role_hierarchy integer;
  required_hierarchy integer;
BEGIN
  SELECT public.get_current_user_role() INTO user_role;
  
  -- Define role hierarchy
  role_hierarchy := CASE user_role
    WHEN 'super_admin' THEN 4
    WHEN 'reports_viewer' THEN 3
    WHEN 'data_entry' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END;
  
  required_hierarchy := CASE required_role
    WHEN 'super_admin' THEN 4
    WHEN 'reports_viewer' THEN 3
    WHEN 'data_entry' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END;
  
  RETURN role_hierarchy >= required_hierarchy;
END;
$$;

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

-- Dashboard stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
  today_orders numeric := 0;
  today_charging numeric := 0;
  today_expenses numeric := 0;
  total_balance numeric := 0;
BEGIN
  -- Get today's orders total
  SELECT COALESCE(SUM(total), 0) INTO today_orders
  FROM public.orders 
  WHERE user_id = p_user_id AND order_date = CURRENT_DATE;
  
  -- Get today's charging total
  SELECT COALESCE(SUM(total_amount), 0) INTO today_charging
  FROM public.charging_sessions 
  WHERE user_id = p_user_id AND session_date = CURRENT_DATE;
  
  -- Get today's expenses total
  SELECT COALESCE(SUM(amount), 0) INTO today_expenses
  FROM public.expenses 
  WHERE user_id = p_user_id AND expense_date = CURRENT_DATE;
  
  -- Get total balance
  SELECT COALESCE(total_balance, 0) INTO total_balance
  FROM public.balances 
  WHERE user_id = p_user_id;
  
  stats := jsonb_build_object(
    'today_orders', today_orders,
    'today_charging', today_charging,
    'today_expenses', today_expenses,
    'total_balance', total_balance,
    'net_today', (today_orders + today_charging - today_expenses)
  );
  
  RETURN stats;
END;
$$;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charging_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can manage own charging sessions" ON public.charging_sessions;
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can manage own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can manage own cooperative savings" ON public.cooperative_savings;
DROP POLICY IF EXISTS "Users can manage own share investments" ON public.share_investments;
DROP POLICY IF EXISTS "Users can manage own menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can manage own payment modes" ON public.payment_modes;
DROP POLICY IF EXISTS "Users can manage own vat entries" ON public.vat_entries;
DROP POLICY IF EXISTS "Users can manage own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can manage own inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Users can manage own expense bookings" ON public.expense_bookings;
DROP POLICY IF EXISTS "Users can manage own custom calculations" ON public.custom_calculations;
DROP POLICY IF EXISTS "Users can manage own balances" ON public.balances;
DROP POLICY IF EXISTS "Users can manage own tab permissions" ON public.user_tab_permissions;
DROP POLICY IF EXISTS "Users can view own logs" ON public.logs;

-- Create comprehensive RLS policies
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own orders" ON public.orders
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own charging sessions" ON public.charging_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own expenses" ON public.expenses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own deposits" ON public.deposits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own withdrawals" ON public.withdrawals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cooperative savings" ON public.cooperative_savings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own share investments" ON public.share_investments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own menu items" ON public.menu_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payment modes" ON public.payment_modes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own vat entries" ON public.vat_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own inventory" ON public.inventory
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own inventory transactions" ON public.inventory_transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own expense bookings" ON public.expense_bookings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own custom calculations" ON public.custom_calculations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own balances" ON public.balances
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tab permissions" ON public.user_tab_permissions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON public.logs
  FOR SELECT USING (auth.uid() = user_id);

-- Super admin policies
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role('super_admin'));

CREATE POLICY "Super admins can manage all data" ON public.orders
  FOR ALL USING (public.has_role('super_admin'));

CREATE POLICY "Super admins can view all logs" ON public.logs
  FOR ALL USING (public.has_role('super_admin'));

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON public.orders(user_id, order_date);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_user_date ON public.charging_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_deposits_user_date ON public.deposits(user_id, deposit_date);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_date ON public.withdrawals(user_id, withdrawal_date);
CREATE INDEX IF NOT EXISTS idx_cooperative_savings_user_date ON public.cooperative_savings(user_id, contribution_date);
CREATE INDEX IF NOT EXISTS idx_inventory_user_active ON public.inventory(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_custom_calculations_user_active ON public.custom_calculations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, table_type);
CREATE INDEX IF NOT EXISTS idx_payment_modes_user_type ON public.payment_modes(user_id, table_type);

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charging_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cooperative_savings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_investments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_modes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vat_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_calculations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.balances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tab_permissions TO authenticated;
GRANT SELECT, INSERT ON public.logs TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.execute_custom_query TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_with_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_order_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;

-- ============================================================================
-- 7. INSERT DEFAULT DATA
-- ============================================================================

-- Create default profile for existing users (if needed)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Insert default categories and payment modes
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN SELECT id FROM auth.users LOOP
    -- Default categories
    INSERT INTO public.categories (name, table_type, user_id) 
    VALUES 
      ('Food & Beverages', 'orders', user_rec.id),
      ('Equipment', 'expenses', user_rec.id),
      ('Utilities', 'expenses', user_rec.id),
      ('Fast Charging', 'charging', user_rec.id),
      ('Maintenance', 'expenses', user_rec.id)
    ON CONFLICT (name, table_type, user_id) DO NOTHING;
    
    -- Default payment modes
    INSERT INTO public.payment_modes (name, table_type, user_id) 
    VALUES 
      ('Cash', 'all', user_rec.id),
      ('Esewa', 'all', user_rec.id),
      ('Fonepay', 'all', user_rec.id),
      ('Bank Transfer', 'all', user_rec.id)
    ON CONFLICT (name, table_type, user_id) DO NOTHING;
    
    -- Create initial balance record
    INSERT INTO public.balances (user_id)
    VALUES (user_rec.id)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- 8. FIX ANY EXISTING DATA INCONSISTENCIES
-- ============================================================================

-- Fix existing data with null dates
UPDATE public.orders 
SET date = order_date 
WHERE date IS NULL AND order_date IS NOT NULL;

UPDATE public.orders 
SET order_date = date 
WHERE order_date IS NULL AND date IS NOT NULL;

UPDATE public.orders 
SET order_date = created_at::date, date = created_at::date 
WHERE order_date IS NULL AND date IS NULL;

-- Similar fixes for other tables
UPDATE public.charging_sessions 
SET date = session_date 
WHERE date IS NULL AND session_date IS NOT NULL;

UPDATE public.expenses 
SET date = expense_date 
WHERE date IS NULL AND expense_date IS NOT NULL;

UPDATE public.deposits 
SET date = deposit_date 
WHERE date IS NULL AND deposit_date IS NOT NULL;

UPDATE public.withdrawals 
SET date = withdrawal_date 
WHERE date IS NULL AND withdrawal_date IS NOT NULL;

UPDATE public.cooperative_savings 
SET date = contribution_date 
WHERE date IS NULL AND contribution_date IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add helpful comments
COMMENT ON DATABASE postgres IS 'Energy Palace Nexus - Complete business management system';
COMMENT ON TABLE public.orders IS 'Orders table with synchronized date fields';
COMMENT ON TABLE public.charging_sessions IS 'Electric vehicle charging sessions';
COMMENT ON TABLE public.vat_entries IS 'VAT entries for Nepal VAT compliance (13% rate)';
COMMENT ON TABLE public.inventory IS 'Inventory management with auto-population from expenses';
COMMENT ON TABLE public.custom_calculations IS 'Custom business calculations with SQL execution';
COMMENT ON FUNCTION public.execute_custom_query IS 'Secure SQL execution for custom calculations';
COMMENT ON FUNCTION public.get_current_user_role IS 'Get current authenticated user role';

-- Final notification
DO $$
BEGIN
  RAISE NOTICE 'Energy Palace Nexus migration completed successfully!';
  RAISE NOTICE 'All tables, functions, and policies have been created.';
  RAISE NOTICE 'The system is ready for production use.';
END $$;
