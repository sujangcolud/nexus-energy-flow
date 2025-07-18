-- Comprehensive database migration for business management features
-- This migration adds all necessary tables and functions for the enhanced business management system

-- 1. Create categories table for dynamic category management
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

-- 2. Create payment_modes table for dynamic payment mode management
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

-- 3. Create VAT entries table for VAT management
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

-- 4. Create inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  description text,
  category text,
  quantity numeric DEFAULT 0,
  unit_cost numeric,
  total_cost numeric,
  supplier text,
  purchase_date date,
  expiry_date date,
  location text,
  minimum_stock numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  expense_id uuid, -- Reference to the expense that created this inventory item
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Create inventory transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- 'stock_in', 'stock_out', 'adjustment'
  quantity numeric NOT NULL,
  unit_cost numeric,
  total_cost numeric,
  reference_type text, -- 'expense', 'order', 'manual'
  reference_id uuid,
  notes text,
  transaction_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 6. Create expense bookings table
CREATE TABLE IF NOT EXISTS public.expense_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  category text,
  vendor text,
  due_date date,
  status text DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  notes text,
  expense_id uuid, -- Reference to expenses table when paid
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 7. Create custom calculations table
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

-- 8. Add VAT columns to existing tables if they don't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_vat_applicable boolean DEFAULT false;

ALTER TABLE public.charging_sessions ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0;
ALTER TABLE public.charging_sessions ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;
ALTER TABLE public.charging_sessions ADD COLUMN IF NOT EXISTS is_vat_applicable boolean DEFAULT false;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_table_type_user ON public.categories(table_type, user_id);
CREATE INDEX IF NOT EXISTS idx_payment_modes_table_type_user ON public.payment_modes(table_type, user_id);
CREATE INDEX IF NOT EXISTS idx_vat_entries_entry_type_user ON public.vat_entries(entry_type, user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_active ON public.inventory(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_expense_bookings_status_user ON public.expense_bookings(status, user_id);
CREATE INDEX IF NOT EXISTS idx_custom_calculations_user_active ON public.custom_calculations(user_id, is_active);

-- 10. Enable RLS on all new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_calculations ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies
-- Categories policies
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

-- Payment modes policies
CREATE POLICY "Users can manage own payment modes" ON public.payment_modes
  FOR ALL USING (auth.uid() = user_id);

-- VAT entries policies
CREATE POLICY "Users can manage own VAT entries" ON public.vat_entries
  FOR ALL USING (auth.uid() = user_id);

-- Inventory policies
CREATE POLICY "Users can manage own inventory" ON public.inventory
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own inventory transactions" ON public.inventory_transactions
  FOR ALL USING (auth.uid() = user_id);

-- Expense bookings policies
CREATE POLICY "Users can manage own expense bookings" ON public.expense_bookings
  FOR ALL USING (auth.uid() = user_id);

-- Custom calculations policies
CREATE POLICY "Users can manage own custom calculations" ON public.custom_calculations
  FOR ALL USING (auth.uid() = user_id);

-- Super admin policies (view all data)
CREATE POLICY "Super admins can view all categories" ON public.categories
  FOR SELECT USING (public.has_role('super_admin'));

CREATE POLICY "Super admins can view all payment modes" ON public.payment_modes
  FOR SELECT USING (public.has_role('super_admin'));

CREATE POLICY "Super admins can view all VAT entries" ON public.vat_entries
  FOR SELECT USING (public.has_role('super_admin'));

CREATE POLICY "Super admins can view all inventory" ON public.inventory
  FOR SELECT USING (public.has_role('super_admin'));

CREATE POLICY "Super admins can view all inventory transactions" ON public.inventory_transactions
  FOR SELECT USING (public.has_role('super_admin'));

CREATE POLICY "Super admins can view all expense bookings" ON public.expense_bookings
  FOR SELECT USING (public.has_role('super_admin'));

CREATE POLICY "Super admins can view all custom calculations" ON public.custom_calculations
  FOR SELECT USING (public.has_role('super_admin'));

-- 12. Create functions for business logic

-- Function to get VAT amount based on Nepal VAT rules
CREATE OR REPLACE FUNCTION public.calculate_vat(amount numeric, vat_rate numeric DEFAULT 13)
RETURNS numeric AS $$
BEGIN
  RETURN amount * vat_rate / 100;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create inventory from expenses
CREATE OR REPLACE FUNCTION public.auto_create_inventory_from_expense()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create inventory for certain categories that indicate purchases
  IF NEW.category IN ('Equipment', 'Office Supplies', 'Food & Beverages', 'Inventory Purchase') THEN
    INSERT INTO public.inventory (
      item_name,
      description,
      category,
      quantity,
      unit_cost,
      total_cost,
      expense_id,
      user_id
    ) VALUES (
      NEW.description,
      'Auto-created from expense: ' || NEW.description,
      NEW.category,
      1, -- Default quantity
      NEW.amount,
      NEW.amount,
      NEW.id,
      NEW.user_id
    );
    
    -- Create inventory transaction
    INSERT INTO public.inventory_transactions (
      inventory_id,
      transaction_type,
      quantity,
      unit_cost,
      total_cost,
      reference_type,
      reference_id,
      notes,
      user_id
    ) SELECT 
      i.id,
      'stock_in',
      1,
      NEW.amount,
      NEW.amount,
      'expense',
      NEW.id,
      'Auto stock-in from expense',
      NEW.user_id
    FROM public.inventory i
    WHERE i.expense_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto inventory creation
DROP TRIGGER IF EXISTS auto_create_inventory_trigger ON public.expenses;
CREATE TRIGGER auto_create_inventory_trigger
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_inventory_from_expense();

-- Function to update inventory quantity
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.inventory 
    SET quantity = quantity + CASE 
      WHEN NEW.transaction_type = 'stock_in' THEN NEW.quantity
      WHEN NEW.transaction_type = 'stock_out' THEN -NEW.quantity
      ELSE NEW.quantity
    END,
    updated_at = now()
    WHERE id = NEW.inventory_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for inventory quantity updates
DROP TRIGGER IF EXISTS update_inventory_quantity_trigger ON public.inventory_transactions;
CREATE TRIGGER update_inventory_quantity_trigger
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_quantity();

-- Function to calculate custom formulas
CREATE OR REPLACE FUNCTION public.calculate_custom_formula(
  calculation_config jsonb
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- This function will be enhanced to handle complex calculations
  -- For now, it returns a basic structure
  result := jsonb_build_object(
    'status', 'calculated',
    'timestamp', now(),
    'result', 0
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Insert default categories and payment modes
INSERT INTO public.categories (name, table_type, user_id) 
SELECT * FROM (VALUES 
  ('Food & Beverages', 'orders'),
  ('Equipment', 'expenses'),
  ('Office Supplies', 'expenses'),
  ('Utilities', 'expenses'),
  ('Transportation', 'expenses'),
  ('Marketing', 'expenses'),
  ('Maintenance', 'expenses'),
  ('Insurance', 'expenses'),
  ('Legal & Professional', 'expenses'),
  ('Inventory Purchase', 'expenses'),
  ('DC Fast Charging', 'charging'),
  ('AC Charging', 'charging'),
  ('Monthly Contribution', 'savings'),
  ('Emergency Fund', 'savings'),
  ('Business Investment', 'savings')
) AS t(name, table_type)
CROSS JOIN (SELECT id FROM auth.users LIMIT 1) u(user_id)
ON CONFLICT (name, table_type, user_id) DO NOTHING;

INSERT INTO public.payment_modes (name, table_type, user_id)
SELECT * FROM (VALUES 
  ('Cash', 'orders'),
  ('Esewa', 'orders'),
  ('Fonepay', 'orders'),
  ('Bank Transfer', 'orders'),
  ('Credit Card', 'orders'),
  ('Cash', 'expenses'),
  ('Esewa', 'expenses'),
  ('Fonepay', 'expenses'),
  ('Bank Transfer', 'expenses'),
  ('Cheque', 'expenses'),
  ('Cash', 'charging'),
  ('Esewa', 'charging'),
  ('Fonepay', 'charging'),
  ('Card Payment', 'charging')
) AS t(name, table_type)
CROSS JOIN (SELECT id FROM auth.users LIMIT 1) u(user_id)
ON CONFLICT (name, table_type, user_id) DO NOTHING;

-- 14. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_modes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vat_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_calculations TO authenticated;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 15. Create updated triggers for date field synchronization
CREATE OR REPLACE FUNCTION public.sync_date_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync date fields for all tables
  IF TG_TABLE_NAME = 'orders' THEN
    NEW.date = NEW.order_date;
  ELSIF TG_TABLE_NAME = 'charging_sessions' THEN
    NEW.date = NEW.session_date;
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    NEW.date = NEW.expense_date;
  ELSIF TG_TABLE_NAME = 'deposits' THEN
    NEW.date = NEW.deposit_date;
  ELSIF TG_TABLE_NAME = 'withdrawals' THEN
    NEW.date = NEW.withdrawal_date;
  ELSIF TG_TABLE_NAME = 'cooperative_savings' THEN
    NEW.date = NEW.contribution_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply sync triggers to all relevant tables
DROP TRIGGER IF EXISTS sync_date_trigger ON public.charging_sessions;
CREATE TRIGGER sync_date_trigger
  BEFORE INSERT OR UPDATE ON public.charging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_date_fields();

DROP TRIGGER IF EXISTS sync_date_trigger ON public.expenses;
CREATE TRIGGER sync_date_trigger
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_date_fields();

DROP TRIGGER IF EXISTS sync_date_trigger ON public.deposits;
CREATE TRIGGER sync_date_trigger
  BEFORE INSERT OR UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_date_fields();

DROP TRIGGER IF EXISTS sync_date_trigger ON public.withdrawals;
CREATE TRIGGER sync_date_trigger
  BEFORE INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_date_fields();

DROP TRIGGER IF EXISTS sync_date_trigger ON public.cooperative_savings;
CREATE TRIGGER sync_date_trigger
  BEFORE INSERT OR UPDATE ON public.cooperative_savings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_date_fields();
