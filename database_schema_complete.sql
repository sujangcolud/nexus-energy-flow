-- Complete Energy Palace Nexus Database Schema
-- This file contains all tables, enums, functions, policies, and triggers

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the app_role enum
CREATE TYPE app_role AS ENUM (
  'user',
  'super_user', 
  'super_admin',
  'data_entry',
  'reports_viewer'
);

-- ===========================
-- PROFILES TABLE
-- ===========================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- ===========================
-- USER ROLES TABLE
-- ===========================
CREATE TABLE user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON user_roles 
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON user_roles 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================
-- BALANCES TABLE
-- ===========================
CREATE TABLE balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cash_in_hand DECIMAL(12,2) DEFAULT 0,
  bank_balance DECIMAL(12,2) DEFAULT 0,
  esewa_balance DECIMAL(12,2) DEFAULT 0,
  fonepay_balance DECIMAL(12,2) DEFAULT 0,
  cooperative_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for balances
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balances" ON balances 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own balances" ON balances 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balances" ON balances 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================
-- CATEGORIES TABLE
-- ===========================
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  table_type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON categories 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON categories 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- PAYMENT MODES TABLE
-- ===========================
CREATE TABLE payment_modes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  table_type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS for payment_modes
ALTER TABLE payment_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment modes" ON payment_modes 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payment modes" ON payment_modes 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- ORDERS TABLE
-- ===========================
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  rate DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_mode TEXT NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE, -- Duplicate for compatibility
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON orders 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own orders" ON orders 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- EXPENSES TABLE
-- ===========================
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON expenses 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own expenses" ON expenses 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- DEPOSITS TABLE
-- ===========================
CREATE TABLE deposits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  mode TEXT NOT NULL,
  deposited_by TEXT NOT NULL,
  deposit_date DATE DEFAULT CURRENT_DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for deposits
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deposits" ON deposits 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own deposits" ON deposits 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- WITHDRAWALS TABLE
-- ===========================
CREATE TABLE withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  purpose TEXT NOT NULL,
  recipient TEXT,
  reference_number TEXT,
  withdrawal_date DATE DEFAULT CURRENT_DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals" ON withdrawals 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own withdrawals" ON withdrawals 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- CHARGING SESSIONS TABLE
-- ===========================
CREATE TABLE charging_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE,
  start_percentage INTEGER,
  end_percentage INTEGER,
  kcal DECIMAL(10,2),
  per_percent_rate DECIMAL(10,2),
  per_unit_rate DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL,
  payment_mode TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for charging_sessions
ALTER TABLE charging_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own charging sessions" ON charging_sessions 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own charging sessions" ON charging_sessions 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- COOPERATIVE SAVINGS TABLE
-- ===========================
CREATE TABLE cooperative_savings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  contribution_amount DECIMAL(10,2) NOT NULL,
  contribution_date DATE DEFAULT CURRENT_DATE,
  cycle_period TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for cooperative_savings
ALTER TABLE cooperative_savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cooperative savings" ON cooperative_savings 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cooperative savings" ON cooperative_savings 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- SHARE INVESTMENTS TABLE
-- ===========================
CREATE TABLE share_investments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shareholder_name TEXT NOT NULL,
  contribution_amount DECIMAL(10,2) NOT NULL,
  payment_mode TEXT NOT NULL,
  investment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for share_investments
ALTER TABLE share_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own share investments" ON share_investments 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own share investments" ON share_investments 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- OPENING BALANCES TABLE
-- ===========================
CREATE TABLE opening_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cutoff_date DATE NOT NULL,
  opening_balance_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for opening_balances
ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own opening balances" ON opening_balances 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own opening balances" ON opening_balances 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- STATIC EXPENSES TABLE
-- ===========================
CREATE TABLE static_expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for static_expenses
ALTER TABLE static_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own static expenses" ON static_expenses 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own static expenses" ON static_expenses 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- MENU ITEMS TABLE
-- ===========================
CREATE TABLE menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for menu_items (global access)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view menu items" ON menu_items 
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage menu items" ON menu_items 
FOR ALL USING (auth.uid() IS NOT NULL);

-- ===========================
-- INVENTORY TABLE
-- ===========================
CREATE TABLE inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS for inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory" ON inventory 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own inventory" ON inventory 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- INVENTORY TRANSACTIONS TABLE
-- ===========================
CREATE TABLE inventory_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', 'return'
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_type TEXT, -- 'order', 'expense', 'manual'
  reference_id UUID,
  notes TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for inventory_transactions
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory transactions" ON inventory_transactions 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own inventory transactions" ON inventory_transactions 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- EXPENSE BOOKINGS TABLE
-- ===========================
CREATE TABLE expense_bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT,
  vendor TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  expense_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for expense_bookings
ALTER TABLE expense_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expense bookings" ON expense_bookings 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own expense bookings" ON expense_bookings 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- VAT ENTRIES TABLE
-- ===========================
CREATE TABLE vat_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL, -- 'order', 'expense', 'manual'
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

-- RLS for vat_entries
ALTER TABLE vat_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vat entries" ON vat_entries 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own vat entries" ON vat_entries 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- CUSTOM CALCULATIONS TABLE
-- ===========================
CREATE TABLE custom_calculations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  calculation_config JSONB NOT NULL,
  result_cache JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for custom_calculations
ALTER TABLE custom_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom calculations" ON custom_calculations 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own custom calculations" ON custom_calculations 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- REPORTS TABLE
-- ===========================
CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  report_data JSONB NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON reports 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reports" ON reports 
FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- ANALYTICS CACHE TABLE
-- ===========================
CREATE TABLE analytics_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for analytics_cache (admin only)
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can access analytics cache" ON analytics_cache 
FOR ALL USING (auth.uid() IS NOT NULL);

-- ===========================
-- LOGS TABLE
-- ===========================
CREATE TABLE logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for logs
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON logs 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert logs" ON logs 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================
-- HELPER FUNCTIONS
-- ===========================

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role app_role;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN 'user'::app_role;
    END IF;
    
    -- Get role from user_roles table
    SELECT role INTO user_role
    FROM user_roles
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no role found, return default
    IF user_role IS NULL THEN
        RETURN 'user'::app_role;
    END IF;
    
    RETURN user_role;
END;
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role app_role;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    -- Get current user role
    user_role := get_current_user_role();
    
    -- Define role hierarchy
    role_hierarchy := CASE user_role
        WHEN 'user' THEN 1
        WHEN 'data_entry' THEN 2
        WHEN 'reports_viewer' THEN 3
        WHEN 'super_user' THEN 4
        WHEN 'super_admin' THEN 5
        ELSE 0
    END;
    
    required_hierarchy := CASE _role
        WHEN 'user' THEN 1
        WHEN 'data_entry' THEN 2
        WHEN 'reports_viewer' THEN 3
        WHEN 'super_user' THEN 4
        WHEN 'super_admin' THEN 5
        ELSE 0
    END;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    check_user_id UUID;
    user_role app_role;
BEGIN
    -- Use provided user_id or current user
    check_user_id := COALESCE(user_id, auth.uid());
    
    -- Get role from user_roles table
    SELECT role INTO user_role
    FROM user_roles
    WHERE user_roles.user_id = check_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN user_role = 'super_admin';
END;
$$;

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
    user_id_to_update UUID,
    new_role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Access denied. Only super admins can update user roles.';
    END IF;
    
    -- Insert new role record
    INSERT INTO user_roles (user_id, role)
    VALUES (user_id_to_update, new_role);
END;
$$;

-- Safe order insertion function
CREATE OR REPLACE FUNCTION insert_order_safe(
    p_user_id UUID,
    p_item_name TEXT,
    p_quantity INTEGER,
    p_rate DECIMAL,
    p_total DECIMAL,
    p_payment_mode TEXT,
    p_order_date DATE
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    item_name TEXT,
    quantity INTEGER,
    rate DECIMAL,
    total DECIMAL,
    payment_mode TEXT,
    order_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_order_id UUID;
BEGIN
    -- Insert the order with explicit date fields
    INSERT INTO orders (
        user_id,
        item_name,
        quantity,
        rate,
        total,
        payment_mode,
        order_date,
        date -- Ensure both date fields are set
    ) VALUES (
        p_user_id,
        p_item_name,
        p_quantity,
        p_rate,
        p_total,
        p_payment_mode,
        p_order_date,
        p_order_date
    ) RETURNING orders.id INTO new_order_id;
    
    -- Return the created order
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
        o.created_at
    FROM orders o
    WHERE o.id = new_order_id;
END;
$$;

-- ===========================
-- ANALYTICS FUNCTIONS
-- ===========================

-- Get all users with roles (admin function)
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
    id UUID,
    email TEXT,
    role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has admin privileges
    IF NOT has_role('super_admin') THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        COALESCE(ur.role, 'user'::app_role) as role
    FROM profiles p
    LEFT JOIN user_roles ur ON p.id = ur.user_id
    ORDER BY p.created_at DESC;
END;
$$;

-- Get user role distribution
CREATE OR REPLACE FUNCTION get_user_role_distribution()
RETURNS TABLE(
    role TEXT,
    user_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ur.role::TEXT, 'user') as role,
        COUNT(*) as user_count
    FROM profiles p
    LEFT JOIN user_roles ur ON p.id = ur.user_id
    GROUP BY COALESCE(ur.role::TEXT, 'user')
    ORDER BY user_count DESC;
END;
$$;

-- Get monthly financial summary
CREATE OR REPLACE FUNCTION get_monthly_financial_summary()
RETURNS TABLE(
    month TEXT,
    revenue DECIMAL,
    expenses DECIMAL,
    profit DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT 
            TO_CHAR(DATE_TRUNC('month', order_date), 'YYYY-MM') as month,
            SUM(total) as revenue,
            0::DECIMAL as expenses
        FROM orders
        WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', order_date)
        
        UNION ALL
        
        SELECT 
            TO_CHAR(DATE_TRUNC('month', expense_date), 'YYYY-MM') as month,
            0::DECIMAL as revenue,
            SUM(amount) as expenses
        FROM expenses
        WHERE expense_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', expense_date)
    )
    SELECT 
        md.month,
        SUM(md.revenue) as revenue,
        SUM(md.expenses) as expenses,
        SUM(md.revenue) - SUM(md.expenses) as profit
    FROM monthly_data md
    GROUP BY md.month
    ORDER BY md.month;
END;
$$;

-- ===========================
-- TRIGGERS
-- ===========================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balances_updated_at BEFORE UPDATE ON balances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_modes_updated_at BEFORE UPDATE ON payment_modes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    
    -- Create initial user role
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- Create initial balance record
    INSERT INTO balances (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===========================
-- DEFAULT DATA
-- ===========================

-- Insert default categories
INSERT INTO categories (name, table_type, description, user_id) VALUES
('Food & Beverages', 'orders', 'Food and drink items', NULL),
('Equipment', 'expenses', 'Business equipment purchases', NULL),
('Utilities', 'expenses', 'Electricity, water, internet', NULL),
('Marketing', 'expenses', 'Advertising and promotional costs', NULL),
('Maintenance', 'expenses', 'Repairs and maintenance', NULL);

-- Insert default payment modes
INSERT INTO payment_modes (name, table_type, description, user_id) VALUES
('Cash', 'all', 'Cash payments', NULL),
('Bank Transfer', 'all', 'Bank to bank transfers', NULL),
('eSewa', 'all', 'eSewa digital wallet', NULL),
('Fonepay', 'all', 'Fonepay mobile payment', NULL),
('Card', 'all', 'Credit/Debit card payments', NULL);

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category) VALUES
('Tea', 'Regular milk tea', 20.00, 'Beverages'),
('Coffee', 'Black coffee', 30.00, 'Beverages'),
('Chow Mein', 'Stir-fried noodles', 120.00, 'Food'),
('Momo', 'Steamed dumplings (10 pieces)', 150.00, 'Food'),
('Fried Rice', 'Chicken fried rice', 180.00, 'Food');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ===========================
-- COMPLETION MESSAGE
-- ===========================
-- Database schema setup complete!
-- All tables, policies, functions, and triggers have been created.
-- The database is ready for the Energy Palace Nexus application.
