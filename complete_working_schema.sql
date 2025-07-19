-- Complete Energy Palace Nexus Database Schema
-- Includes corrected daily_summary functionality
-- Run this to fix all schema issues

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing problematic triggers first
DROP TRIGGER IF EXISTS orders_summary_trigger ON orders CASCADE;
DROP TRIGGER IF EXISTS charging_sessions_summary_trigger ON charging_sessions CASCADE;
DROP TRIGGER IF EXISTS expenses_summary_trigger ON expenses CASCADE;
DROP TRIGGER IF EXISTS deposits_summary_trigger ON deposits CASCADE;
DROP TRIGGER IF EXISTS cooperative_savings_summary_trigger ON cooperative_savings CASCADE;
DROP TRIGGER IF EXISTS withdrawals_summary_trigger ON withdrawals CASCADE;

-- Drop functions that might have column issues
DROP FUNCTION IF EXISTS update_daily_summary(DATE) CASCADE;
DROP FUNCTION IF EXISTS trigger_update_daily_summary() CASCADE;

-- Create the app_role enum
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM (
      'user',
      'super_user', 
      'super_admin',
      'data_entry',
      'reports_viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===========================
-- CORE TABLES (Drop and recreate to ensure consistency)
-- ===========================

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS daily_summary CASCADE;
DROP TABLE IF EXISTS analytics_cache CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS custom_calculations CASCADE;
DROP TABLE IF EXISTS vat_entries CASCADE;
DROP TABLE IF EXISTS expense_bookings CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS share_investments CASCADE;
DROP TABLE IF EXISTS opening_balances CASCADE;
DROP TABLE IF EXISTS static_expenses CASCADE;
DROP TABLE IF EXISTS cooperative_savings CASCADE;
DROP TABLE IF EXISTS charging_sessions CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS payment_modes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS balances CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- PROFILES TABLE
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for authenticated users only" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- USER ROLES TABLE
CREATE TABLE user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON user_roles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- BALANCES TABLE
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

ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own balances" ON balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balances" ON balances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own balances" ON balances FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CATEGORIES TABLE
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

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- PAYMENT MODES TABLE
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

ALTER TABLE payment_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payment modes" ON payment_modes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own payment modes" ON payment_modes FOR ALL USING (auth.uid() = user_id);

-- ORDERS TABLE (with both total and amount columns for compatibility)
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  rate DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2), -- Compatibility column
  payment_mode TEXT NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE, -- Compatibility column
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own orders" ON orders FOR ALL USING (auth.uid() = user_id);

-- EXPENSES TABLE
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE, -- Compatibility column
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);

-- DEPOSITS TABLE
CREATE TABLE deposits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  mode TEXT NOT NULL,
  deposited_to TEXT, -- Added for summary compatibility
  deposited_by TEXT NOT NULL,
  deposit_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE, -- Compatibility column
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own deposits" ON deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own deposits" ON deposits FOR ALL USING (auth.uid() = user_id);

-- WITHDRAWALS TABLE
CREATE TABLE withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  purpose TEXT NOT NULL,
  category TEXT, -- Added for summary compatibility
  recipient TEXT,
  reference_number TEXT,
  withdrawal_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE, -- Compatibility column
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own withdrawals" ON withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own withdrawals" ON withdrawals FOR ALL USING (auth.uid() = user_id);

-- CHARGING SESSIONS TABLE
CREATE TABLE charging_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE, -- Compatibility column
  start_time TIMESTAMPTZ DEFAULT NOW(), -- Added for summary compatibility
  start_percentage INTEGER,
  end_percentage INTEGER,
  kcal DECIMAL(10,2),
  per_percent_rate DECIMAL(10,2),
  per_unit_rate DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2), -- Compatibility column (will be synced with total_amount)
  payment_mode TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE charging_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own charging sessions" ON charging_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own charging sessions" ON charging_sessions FOR ALL USING (auth.uid() = user_id);

-- COOPERATIVE SAVINGS TABLE
CREATE TABLE cooperative_savings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  contribution_amount DECIMAL(10,2) NOT NULL,
  contribution_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE, -- Compatibility column
  cycle_period TEXT,
  payment_mode TEXT DEFAULT 'cash', -- Added for summary compatibility
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cooperative_savings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cooperative savings" ON cooperative_savings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cooperative savings" ON cooperative_savings FOR ALL USING (auth.uid() = user_id);

-- MENU ITEMS TABLE
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

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage menu items" ON menu_items FOR ALL USING (auth.uid() IS NOT NULL);

-- Add other tables (simplified for key functionality)
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

CREATE TABLE opening_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cutoff_date DATE NOT NULL,
  opening_balance_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for additional tables
ALTER TABLE share_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own share investments" ON share_investments FOR ALL USING (auth.uid() = user_id);

ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own opening balances" ON opening_balances FOR ALL USING (auth.uid() = user_id);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert logs" ON logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================
-- DAILY SUMMARY TABLE (Your addition, but fixed)
-- ===========================
CREATE TABLE daily_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_income_from_orders NUMERIC DEFAULT 0,
  total_income_from_charging NUMERIC DEFAULT 0,
  total_income_fonepay NUMERIC DEFAULT 0,
  total_income_esewa NUMERIC DEFAULT 0,
  total_income_cash NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  total_expenses_cash NUMERIC DEFAULT 0,
  total_expenses_esewa NUMERIC DEFAULT 0,
  total_expenses_fonepay NUMERIC DEFAULT 0,
  total_deposits NUMERIC DEFAULT 0,
  total_deposits_cash NUMERIC DEFAULT 0,
  total_deposits_esewa NUMERIC DEFAULT 0,
  total_savings NUMERIC DEFAULT 0,
  total_savings_cash NUMERIC DEFAULT 0,
  total_savings_fonepay NUMERIC DEFAULT 0,
  total_savings_esewa NUMERIC DEFAULT 0,
  total_withdrawals NUMERIC DEFAULT 0,
  total_withdrawals_cooperative NUMERIC DEFAULT 0,
  total_withdrawals_bank NUMERIC DEFAULT 0,
  total_income NUMERIC DEFAULT 0,
  total_cash_income NUMERIC DEFAULT 0,
  total_fonepay_income NUMERIC DEFAULT 0,
  total_esewa_income NUMERIC DEFAULT 0,
  cash_balance NUMERIC DEFAULT 0,
  esewa_balance NUMERIC DEFAULT 0,
  fonepay_balance NUMERIC DEFAULT 0,
  cooperative_balance NUMERIC DEFAULT 0,
  total_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- TRIGGERS TO SYNC COMPATIBILITY COLUMNS
-- ===========================

-- Function to sync amount columns
CREATE OR REPLACE FUNCTION sync_amount_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- For orders table
    IF TG_TABLE_NAME = 'orders' THEN
        NEW.amount := NEW.total;
        NEW.date := NEW.order_date;
    END IF;
    
    -- For charging_sessions table
    IF TG_TABLE_NAME = 'charging_sessions' THEN
        NEW.amount := NEW.total_amount;
        NEW.date := NEW.session_date;
        IF NEW.start_time IS NULL THEN
            NEW.start_time := NEW.session_date::TIMESTAMPTZ;
        END IF;
    END IF;
    
    -- For other tables, sync date columns
    IF TG_TABLE_NAME = 'expenses' THEN
        NEW.date := NEW.expense_date;
    END IF;
    
    IF TG_TABLE_NAME = 'deposits' THEN
        NEW.date := NEW.deposit_date;
        IF NEW.deposited_to IS NULL THEN
            NEW.deposited_to := NEW.mode;
        END IF;
    END IF;
    
    IF TG_TABLE_NAME = 'withdrawals' THEN
        NEW.date := NEW.withdrawal_date;
        IF NEW.category IS NULL THEN
            NEW.category := 'general';
        END IF;
    END IF;
    
    IF TG_TABLE_NAME = 'cooperative_savings' THEN
        NEW.date := NEW.contribution_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all relevant tables
CREATE TRIGGER sync_orders_columns BEFORE INSERT OR UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION sync_amount_columns();

CREATE TRIGGER sync_charging_columns BEFORE INSERT OR UPDATE ON charging_sessions 
    FOR EACH ROW EXECUTE FUNCTION sync_amount_columns();

CREATE TRIGGER sync_expenses_columns BEFORE INSERT OR UPDATE ON expenses 
    FOR EACH ROW EXECUTE FUNCTION sync_amount_columns();

CREATE TRIGGER sync_deposits_columns BEFORE INSERT OR UPDATE ON deposits 
    FOR EACH ROW EXECUTE FUNCTION sync_amount_columns();

CREATE TRIGGER sync_withdrawals_columns BEFORE INSERT OR UPDATE ON withdrawals 
    FOR EACH ROW EXECUTE FUNCTION sync_amount_columns();

CREATE TRIGGER sync_savings_columns BEFORE INSERT OR UPDATE ON cooperative_savings 
    FOR EACH ROW EXECUTE FUNCTION sync_amount_columns();

-- ===========================
-- CORRECTED DAILY SUMMARY FUNCTION
-- ===========================

CREATE OR REPLACE FUNCTION update_daily_summary(summary_date DATE)
RETURNS VOID AS $$
DECLARE
    -- Income from orders
    v_total_income_from_orders NUMERIC;
    v_total_income_fonepay_orders NUMERIC;
    v_total_income_esewa_orders NUMERIC;
    v_total_income_cash_orders NUMERIC;

    -- Income from charging
    v_total_income_from_charging NUMERIC;
    v_total_income_fonepay_charging NUMERIC;
    v_total_income_esewa_charging NUMERIC;
    v_total_income_cash_charging NUMERIC;

    -- Expenses
    v_total_expenses NUMERIC;
    v_total_expenses_cash NUMERIC;
    v_total_expenses_esewa NUMERIC;
    v_total_expenses_fonepay NUMERIC;

    -- Deposits
    v_total_deposits NUMERIC;
    v_total_deposits_cash NUMERIC;
    v_total_deposits_esewa NUMERIC;

    -- Savings
    v_total_savings NUMERIC;
    v_total_savings_cash NUMERIC;
    v_total_savings_fonepay NUMERIC;
    v_total_savings_esewa NUMERIC;

    -- Withdrawals
    v_total_withdrawals NUMERIC;
    v_total_withdrawals_cooperative NUMERIC;
    v_total_withdrawals_bank NUMERIC;

    -- Calculated fields
    v_total_income NUMERIC;
    v_total_cash_income NUMERIC;
    v_total_fonepay_income NUMERIC;
    v_total_esewa_income NUMERIC;
    v_cash_balance NUMERIC;
    v_esewa_balance NUMERIC;
    v_fonepay_balance NUMERIC;
    v_cooperative_balance NUMERIC;
    v_total_balance NUMERIC;
BEGIN
    -- Calculate income from orders (using correct column names)
    SELECT
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total ELSE 0 END), 0)
    INTO
        v_total_income_from_orders,
        v_total_income_fonepay_orders,
        v_total_income_esewa_orders,
        v_total_income_cash_orders
    FROM orders
    WHERE order_date = summary_date;

    -- Calculate income from charging (using correct column names)
    SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total_amount ELSE 0 END), 0)
    INTO
        v_total_income_from_charging,
        v_total_income_fonepay_charging,
        v_total_income_esewa_charging,
        v_total_income_cash_charging
    FROM charging_sessions
    WHERE session_date = summary_date;

    -- Calculate expenses (using correct column names)
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN amount ELSE 0 END), 0)
    INTO
        v_total_expenses,
        v_total_expenses_cash,
        v_total_expenses_esewa,
        v_total_expenses_fonepay
    FROM expenses
    WHERE expense_date = summary_date;

    -- Calculate deposits (using correct column names)
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'esewa' THEN amount ELSE 0 END), 0)
    INTO
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa
    FROM deposits
    WHERE deposit_date = summary_date;

    -- Calculate savings (using correct column names)
    SELECT
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN contribution_amount ELSE 0 END), 0)
    INTO
        v_total_savings,
        v_total_savings_cash,
        v_total_savings_fonepay,
        v_total_savings_esewa
    FROM cooperative_savings
    WHERE contribution_date = summary_date;

    -- Calculate withdrawals (using correct column names)
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(purpose) LIKE '%cooperative%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(purpose) LIKE '%bank%' THEN amount ELSE 0 END), 0)
    INTO
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank
    FROM withdrawals
    WHERE withdrawal_date = summary_date;

    -- Calculate total income
    v_total_income := v_total_income_from_orders + v_total_income_from_charging;
    v_total_cash_income := v_total_income_cash_orders + v_total_income_cash_charging;
    v_total_fonepay_income := v_total_income_fonepay_orders + v_total_income_fonepay_charging;
    v_total_esewa_income := v_total_income_esewa_orders + v_total_income_esewa_charging;

    -- Calculate balances
    v_cash_balance := v_total_cash_income - v_total_expenses_cash - v_total_savings_cash + v_total_deposits_cash;
    v_esewa_balance := v_total_esewa_income - v_total_expenses_esewa - v_total_savings_esewa + v_total_deposits_esewa;
    v_fonepay_balance := v_total_fonepay_income - v_total_expenses_fonepay - v_total_savings_fonepay;
    v_cooperative_balance := v_total_savings - v_total_withdrawals_cooperative;
    v_total_balance := v_cash_balance + v_fonepay_balance + v_cooperative_balance + v_esewa_balance;

    -- Insert or update the summary table
    INSERT INTO daily_summary (
        summary_date,
        total_income_from_orders,
        total_income_from_charging,
        total_income_fonepay,
        total_income_esewa,
        total_income_cash,
        total_expenses,
        total_expenses_cash,
        total_expenses_esewa,
        total_expenses_fonepay,
        total_deposits,
        total_deposits_cash,
        total_deposits_esewa,
        total_savings,
        total_savings_cash,
        total_savings_fonepay,
        total_savings_esewa,
        total_withdrawals,
        total_withdrawals_cooperative,
        total_withdrawals_bank,
        total_income,
        total_cash_income,
        total_fonepay_income,
        total_esewa_income,
        cash_balance,
        esewa_balance,
        fonepay_balance,
        cooperative_balance,
        total_balance
    ) VALUES (
        summary_date,
        v_total_income_from_orders,
        v_total_income_from_charging,
        v_total_fonepay_income,
        v_total_esewa_income,
        v_total_cash_income,
        v_total_expenses,
        v_total_expenses_cash,
        v_total_expenses_esewa,
        v_total_expenses_fonepay,
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa,
        v_total_savings,
        v_total_savings_cash,
        v_total_savings_fonepay,
        v_total_savings_esewa,
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank,
        v_total_income,
        v_total_cash_income,
        v_total_fonepay_income,
        v_total_esewa_income,
        v_cash_balance,
        v_esewa_balance,
        v_fonepay_balance,
        v_cooperative_balance,
        v_total_balance
    )
    ON CONFLICT (summary_date) DO UPDATE SET
        total_income_from_orders = EXCLUDED.total_income_from_orders,
        total_income_from_charging = EXCLUDED.total_income_from_charging,
        total_income_fonepay = EXCLUDED.total_income_fonepay,
        total_income_esewa = EXCLUDED.total_income_esewa,
        total_income_cash = EXCLUDED.total_income_cash,
        total_expenses = EXCLUDED.total_expenses,
        total_expenses_cash = EXCLUDED.total_expenses_cash,
        total_expenses_esewa = EXCLUDED.total_expenses_esewa,
        total_expenses_fonepay = EXCLUDED.total_expenses_fonepay,
        total_deposits = EXCLUDED.total_deposits,
        total_deposits_cash = EXCLUDED.total_deposits_cash,
        total_deposits_esewa = EXCLUDED.total_deposits_esewa,
        total_savings = EXCLUDED.total_savings,
        total_savings_cash = EXCLUDED.total_savings_cash,
        total_savings_fonepay = EXCLUDED.total_savings_fonepay,
        total_savings_esewa = EXCLUDED.total_savings_esewa,
        total_withdrawals = EXCLUDED.total_withdrawals,
        total_withdrawals_cooperative = EXCLUDED.total_withdrawals_cooperative,
        total_withdrawals_bank = EXCLUDED.total_withdrawals_bank,
        total_income = EXCLUDED.total_income,
        total_cash_income = EXCLUDED.total_cash_income,
        total_fonepay_income = EXCLUDED.total_fonepay_income,
        total_esewa_income = EXCLUDED.total_esewa_income,
        cash_balance = EXCLUDED.cash_balance,
        esewa_balance = EXCLUDED.esewa_balance,
        fonepay_balance = EXCLUDED.fonepay_balance,
        cooperative_balance = EXCLUDED.cooperative_balance,
        total_balance = EXCLUDED.total_balance,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to trigger daily summary updates
CREATE OR REPLACE FUNCTION trigger_update_daily_summary()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
BEGIN
    -- Determine the date to update based on table and operation
    IF TG_TABLE_NAME = 'orders' THEN
        target_date := COALESCE(NEW.order_date, OLD.order_date);
    ELSIF TG_TABLE_NAME = 'charging_sessions' THEN
        target_date := COALESCE(NEW.session_date, OLD.session_date);
    ELSIF TG_TABLE_NAME = 'expenses' THEN
        target_date := COALESCE(NEW.expense_date, OLD.expense_date);
    ELSIF TG_TABLE_NAME = 'deposits' THEN
        target_date := COALESCE(NEW.deposit_date, OLD.deposit_date);
    ELSIF TG_TABLE_NAME = 'cooperative_savings' THEN
        target_date := COALESCE(NEW.contribution_date, OLD.contribution_date);
    ELSIF TG_TABLE_NAME = 'withdrawals' THEN
        target_date := COALESCE(NEW.withdrawal_date, OLD.withdrawal_date);
    ELSE
        target_date := CURRENT_DATE;
    END IF;

    -- Update the daily summary for the target date
    PERFORM update_daily_summary(target_date);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the corrected summary triggers
CREATE TRIGGER orders_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER charging_sessions_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON charging_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER expenses_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER deposits_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON deposits
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER cooperative_savings_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON cooperative_savings
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER withdrawals_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

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
    IF auth.uid() IS NULL THEN
        RETURN 'user'::app_role;
    END IF;
    
    SELECT role INTO user_role
    FROM user_roles
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF user_role IS NULL THEN
        RETURN 'user'::app_role;
    END IF;
    
    RETURN user_role;
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
    INSERT INTO orders (
        user_id,
        item_name,
        quantity,
        rate,
        total,
        payment_mode,
        order_date
    ) VALUES (
        p_user_id,
        p_item_name,
        p_quantity,
        p_rate,
        p_total,
        p_payment_mode,
        p_order_date
    ) RETURNING orders.id INTO new_order_id;
    
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
('Maintenance', 'expenses', 'Repairs and maintenance', NULL)
ON CONFLICT DO NOTHING;

-- Insert default payment modes
INSERT INTO payment_modes (name, table_type, description, user_id) VALUES
('Cash', 'all', 'Cash payments', NULL),
('Bank Transfer', 'all', 'Bank to bank transfers', NULL),
('eSewa', 'all', 'eSewa digital wallet', NULL),
('Fonepay', 'all', 'Fonepay mobile payment', NULL),
('Card', 'all', 'Credit/Debit card payments', NULL)
ON CONFLICT DO NOTHING;

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category) VALUES
('Tea', 'Regular milk tea', 20.00, 'Beverages'),
('Coffee', 'Black coffee', 30.00, 'Beverages'),
('Chow Mein', 'Stir-fried noodles', 120.00, 'Food'),
('Momo', 'Steamed dumplings (10 pieces)', 150.00, 'Food'),
('Fried Rice', 'Chicken fried rice', 180.00, 'Food')
ON CONFLICT DO NOTHING;

-- ===========================
-- PERMISSIONS
-- ===========================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ===========================
-- REBUILD DAILY SUMMARIES
-- ===========================

-- Rebuild all daily summaries with correct data
DO $$
DECLARE
    d DATE;
BEGIN
    -- Get all unique dates from all relevant tables
    FOR d IN
        SELECT DISTINCT summary_date FROM (
            SELECT order_date AS summary_date FROM orders WHERE order_date IS NOT NULL
            UNION
            SELECT session_date AS summary_date FROM charging_sessions WHERE session_date IS NOT NULL
            UNION
            SELECT expense_date AS summary_date FROM expenses WHERE expense_date IS NOT NULL
            UNION
            SELECT deposit_date AS summary_date FROM deposits WHERE deposit_date IS NOT NULL
            UNION
            SELECT contribution_date AS summary_date FROM cooperative_savings WHERE contribution_date IS NOT NULL
            UNION
            SELECT withdrawal_date AS summary_date FROM withdrawals WHERE withdrawal_date IS NOT NULL
        ) AS all_dates
        WHERE summary_date IS NOT NULL
    LOOP
        -- Update summary for each date
        PERFORM update_daily_summary(d);
    END LOOP;
    
    RAISE NOTICE 'Daily summaries rebuilt successfully';
END;
$$;

-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Final verification
SELECT 'Schema setup complete! Tables created:' as status;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'expenses', 'charging_sessions', 'deposits', 'withdrawals', 'cooperative_savings', 'daily_summary')
ORDER BY tablename;
