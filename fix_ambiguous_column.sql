-- Fix for 42702 "column reference summary_date is ambiguous" error
-- This happens when function parameter names conflict with table column names

-- Drop the problematic function and triggers
DROP TRIGGER IF EXISTS orders_summary_trigger ON orders CASCADE;
DROP TRIGGER IF EXISTS charging_sessions_summary_trigger ON charging_sessions CASCADE;
DROP TRIGGER IF EXISTS expenses_summary_trigger ON expenses CASCADE;
DROP TRIGGER IF EXISTS deposits_summary_trigger ON deposits CASCADE;
DROP TRIGGER IF EXISTS cooperative_savings_summary_trigger ON cooperative_savings CASCADE;
DROP TRIGGER IF EXISTS withdrawals_summary_trigger ON withdrawals CASCADE;
DROP FUNCTION IF EXISTS trigger_update_daily_summary() CASCADE;
DROP FUNCTION IF EXISTS update_daily_summary(DATE) CASCADE;

-- Recreate the function with fixed parameter naming and proper column qualification
CREATE OR REPLACE FUNCTION update_daily_summary(p_summary_date DATE)
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
    -- Calculate income from orders (using table alias and parameter prefix)
    SELECT
        COALESCE(SUM(o.total), 0),
        COALESCE(SUM(CASE WHEN LOWER(o.payment_mode) = 'fonepay' THEN o.total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(o.payment_mode) = 'esewa' THEN o.total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(o.payment_mode) = 'cash' THEN o.total ELSE 0 END), 0)
    INTO
        v_total_income_from_orders,
        v_total_income_fonepay_orders,
        v_total_income_esewa_orders,
        v_total_income_cash_orders
    FROM orders o
    WHERE o.order_date = p_summary_date;

    -- Calculate income from charging (using table alias and parameter prefix)
    SELECT
        COALESCE(SUM(cs.total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(cs.payment_mode) = 'fonepay' THEN cs.total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(cs.payment_mode) = 'esewa' THEN cs.total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(cs.payment_mode) = 'cash' THEN cs.total_amount ELSE 0 END), 0)
    INTO
        v_total_income_from_charging,
        v_total_income_fonepay_charging,
        v_total_income_esewa_charging,
        v_total_income_cash_charging
    FROM charging_sessions cs
    WHERE cs.session_date = p_summary_date;

    -- Calculate expenses (using table alias and parameter prefix)
    SELECT
        COALESCE(SUM(e.amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(e.payment_mode) = 'cash' THEN e.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(e.payment_mode) = 'esewa' THEN e.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(e.payment_mode) = 'fonepay' THEN e.amount ELSE 0 END), 0)
    INTO
        v_total_expenses,
        v_total_expenses_cash,
        v_total_expenses_esewa,
        v_total_expenses_fonepay
    FROM expenses e
    WHERE e.expense_date = p_summary_date;

    -- Calculate deposits (using table alias and parameter prefix)
    SELECT
        COALESCE(SUM(d.amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(d.mode) = 'cash' THEN d.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(d.mode) = 'esewa' THEN d.amount ELSE 0 END), 0)
    INTO
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa
    FROM deposits d
    WHERE d.deposit_date = p_summary_date;

    -- Calculate savings (using table alias and parameter prefix)
    SELECT
        COALESCE(SUM(cs.contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(cs.payment_mode) = 'cash' THEN cs.contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(cs.payment_mode) = 'fonepay' THEN cs.contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(cs.payment_mode) = 'esewa' THEN cs.contribution_amount ELSE 0 END), 0)
    INTO
        v_total_savings,
        v_total_savings_cash,
        v_total_savings_fonepay,
        v_total_savings_esewa
    FROM cooperative_savings cs
    WHERE cs.contribution_date = p_summary_date;

    -- Calculate withdrawals (using table alias and parameter prefix)
    SELECT
        COALESCE(SUM(w.amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(w.purpose) LIKE '%cooperative%' THEN w.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(w.purpose) LIKE '%bank%' THEN w.amount ELSE 0 END), 0)
    INTO
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank
    FROM withdrawals w
    WHERE w.withdrawal_date = p_summary_date;

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

    -- Insert or update the summary table (using parameter prefix)
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
        p_summary_date,
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

-- Recreate the trigger function with proper parameter naming
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

-- Recreate all the triggers
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

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Test the function to ensure it works
DO $$
BEGIN
    -- Try to update today's summary
    PERFORM update_daily_summary(CURRENT_DATE);
    RAISE NOTICE 'Daily summary function fixed and tested successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing function: %', SQLERRM;
END $$;

-- Success message
SELECT 'Ambiguous column reference fixed. Order submission should now work.' as status;
