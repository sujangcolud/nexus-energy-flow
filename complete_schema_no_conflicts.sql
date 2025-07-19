-- Complete Energy Palace Nexus Database Schema (No Conflicts Version)
-- Run this after fixing function conflicts

-- ===========================
-- FIRST: Handle function conflicts
-- ===========================

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS has_role(app_role) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_user_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS insert_order_safe(UUID, TEXT, INTEGER, DECIMAL, DECIMAL, TEXT, DATE) CASCADE;
DROP FUNCTION IF EXISTS update_daily_summary(DATE) CASCADE;
DROP FUNCTION IF EXISTS trigger_update_daily_summary() CASCADE;
DROP FUNCTION IF EXISTS sync_amount_columns() CASCADE;

-- Drop and recreate enum
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM (
  'user',
  'super_user', 
  'super_admin',
  'data_entry',
  'reports_viewer'
);

-- ===========================
-- CORE TABLES STRUCTURE
-- ===========================

-- Ensure all tables have correct structure
-- Only modify structure if needed, preserve data

-- Add missing columns to existing tables
DO $$
BEGIN
    -- Add amount column to orders if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'amount'
    ) THEN
        ALTER TABLE orders ADD COLUMN amount DECIMAL(10,2);
        UPDATE orders SET amount = total WHERE amount IS NULL;
    END IF;

    -- Add date column to orders if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'date'
    ) THEN
        ALTER TABLE orders ADD COLUMN date DATE DEFAULT CURRENT_DATE;
        UPDATE orders SET date = order_date WHERE date IS NULL;
    END IF;

    -- Add amount column to charging_sessions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'charging_sessions' AND column_name = 'amount'
    ) THEN
        ALTER TABLE charging_sessions ADD COLUMN amount DECIMAL(10,2);
        UPDATE charging_sessions SET amount = total_amount WHERE amount IS NULL;
    END IF;

    -- Add date column to charging_sessions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'charging_sessions' AND column_name = 'date'
    ) THEN
        ALTER TABLE charging_sessions ADD COLUMN date DATE DEFAULT CURRENT_DATE;
        UPDATE charging_sessions SET date = session_date WHERE date IS NULL;
    END IF;

    -- Add start_time column to charging_sessions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'charging_sessions' AND column_name = 'start_time'
    ) THEN
        ALTER TABLE charging_sessions ADD COLUMN start_time TIMESTAMPTZ DEFAULT NOW();
        UPDATE charging_sessions SET start_time = session_date::TIMESTAMPTZ WHERE start_time IS NULL;
    END IF;

    -- Add date column to expenses if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'date'
    ) THEN
        ALTER TABLE expenses ADD COLUMN date DATE DEFAULT CURRENT_DATE;
        UPDATE expenses SET date = expense_date WHERE date IS NULL;
    END IF;

    -- Add date column to deposits if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deposits' AND column_name = 'date'
    ) THEN
        ALTER TABLE deposits ADD COLUMN date DATE DEFAULT CURRENT_DATE;
        UPDATE deposits SET date = deposit_date WHERE date IS NULL;
    END IF;

    -- Add deposited_to column to deposits if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deposits' AND column_name = 'deposited_to'
    ) THEN
        ALTER TABLE deposits ADD COLUMN deposited_to TEXT;
        UPDATE deposits SET deposited_to = mode WHERE deposited_to IS NULL;
    END IF;

    -- Add date column to withdrawals if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'withdrawals' AND column_name = 'date'
    ) THEN
        ALTER TABLE withdrawals ADD COLUMN date DATE DEFAULT CURRENT_DATE;
        UPDATE withdrawals SET date = withdrawal_date WHERE date IS NULL;
    END IF;

    -- Add category column to withdrawals if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'withdrawals' AND column_name = 'category'
    ) THEN
        ALTER TABLE withdrawals ADD COLUMN category TEXT DEFAULT 'general';
    END IF;

    -- Add date column to cooperative_savings if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cooperative_savings' AND column_name = 'date'
    ) THEN
        ALTER TABLE cooperative_savings ADD COLUMN date DATE DEFAULT CURRENT_DATE;
        UPDATE cooperative_savings SET date = contribution_date WHERE date IS NULL;
    END IF;

    -- Add payment_mode column to cooperative_savings if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cooperative_savings' AND column_name = 'payment_mode'
    ) THEN
        ALTER TABLE cooperative_savings ADD COLUMN payment_mode TEXT DEFAULT 'cash';
    END IF;

END $$;

-- Create daily_summary table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_summary (
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
-- SYNC TRIGGERS
-- ===========================

-- Function to sync compatibility columns
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
        IF NEW.payment_mode IS NULL THEN
            NEW.payment_mode := 'cash';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing sync triggers and recreate
DROP TRIGGER IF EXISTS sync_orders_columns ON orders;
DROP TRIGGER IF EXISTS sync_charging_columns ON charging_sessions;
DROP TRIGGER IF EXISTS sync_expenses_columns ON expenses;
DROP TRIGGER IF EXISTS sync_deposits_columns ON deposits;
DROP TRIGGER IF EXISTS sync_withdrawals_columns ON withdrawals;
DROP TRIGGER IF EXISTS sync_savings_columns ON cooperative_savings;

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
    -- Calculate income from orders
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

    -- Calculate income from charging
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

    -- Calculate expenses
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

    -- Calculate deposits
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

    -- Calculate savings
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

    -- Calculate withdrawals
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

-- Drop and recreate summary triggers
DROP TRIGGER IF EXISTS orders_summary_trigger ON orders;
DROP TRIGGER IF EXISTS charging_sessions_summary_trigger ON charging_sessions;
DROP TRIGGER IF EXISTS expenses_summary_trigger ON expenses;
DROP TRIGGER IF EXISTS deposits_summary_trigger ON deposits;
DROP TRIGGER IF EXISTS cooperative_savings_summary_trigger ON cooperative_savings;
DROP TRIGGER IF EXISTS withdrawals_summary_trigger ON withdrawals;

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
-- ESSENTIAL FUNCTIONS
-- ===========================

-- Recreate essential functions
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

-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Final success message
SELECT 'Schema fixed successfully! All forms should now work with daily summary functionality.' as status;
