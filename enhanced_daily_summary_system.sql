-- Enhanced Daily Summary System with Auto-Update
-- This script creates a comprehensive system to populate and maintain daily_summary table

-- Drop existing functions and triggers to avoid conflicts
DROP TRIGGER IF EXISTS daily_summary_orders_trigger ON orders CASCADE;
DROP TRIGGER IF EXISTS daily_summary_charging_trigger ON charging_sessions CASCADE;
DROP TRIGGER IF EXISTS daily_summary_expenses_trigger ON expenses CASCADE;
DROP TRIGGER IF EXISTS daily_summary_deposits_trigger ON deposits CASCADE;
DROP TRIGGER IF EXISTS daily_summary_withdrawals_trigger ON withdrawals CASCADE;
DROP TRIGGER IF EXISTS daily_summary_savings_trigger ON cooperative_savings CASCADE;

DROP FUNCTION IF EXISTS trigger_update_daily_summary() CASCADE;
DROP FUNCTION IF EXISTS update_enhanced_daily_summary(DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_enhanced_daily_summary(DATE) CASCADE;
DROP FUNCTION IF EXISTS populate_historical_daily_summaries() CASCADE;

-- Enhanced calculation function based on existing data
CREATE OR REPLACE FUNCTION calculate_enhanced_daily_summary(target_date DATE)
RETURNS TABLE(
    summary_date DATE,
    total_income_from_orders NUMERIC,
    total_income_from_orders_cash NUMERIC,
    total_income_from_orders_fonepay NUMERIC,
    total_income_from_orders_esewa NUMERIC,
    total_income_from_charging NUMERIC,
    total_income_from_charging_fonepay NUMERIC,
    total_income_from_charging_esewa NUMERIC,
    total_income_from_charging_cash NUMERIC,
    total_expenses NUMERIC,
    total_expenses_cash NUMERIC,
    total_expenses_esewa NUMERIC,
    total_expenses_fonepay NUMERIC,
    total_deposits NUMERIC,
    total_deposits_cash NUMERIC,
    total_deposits_esewa NUMERIC,
    total_savings NUMERIC,
    total_savings_cash NUMERIC,
    total_savings_fonepay NUMERIC,
    total_savings_esewa NUMERIC,
    total_withdrawals NUMERIC,
    total_withdrawals_cooperative NUMERIC,
    total_withdrawals_cooperative_cash NUMERIC,
    total_withdrawals_cooperative_esewa NUMERIC,
    total_withdrawals_cooperative_fonepay NUMERIC,
    total_withdrawals_bank NUMERIC,
    total_withdrawals_bank_cash NUMERIC,
    total_withdrawals_bank_esewa NUMERIC,
    total_income NUMERIC,
    total_cash_income NUMERIC,
    total_fonepay_income NUMERIC,
    total_esewa_income NUMERIC,
    cash_balance NUMERIC,
    esewa_balance NUMERIC,
    fonepay_balance NUMERIC,
    cooperative_balance NUMERIC,
    total_balance NUMERIC
) AS $$
DECLARE
    -- Orders variables
    v_orders_total NUMERIC := 0;
    v_orders_cash NUMERIC := 0;
    v_orders_fonepay NUMERIC := 0;
    v_orders_esewa NUMERIC := 0;
    
    -- Charging variables
    v_charging_total NUMERIC := 0;
    v_charging_cash NUMERIC := 0;
    v_charging_fonepay NUMERIC := 0;
    v_charging_esewa NUMERIC := 0;
    
    -- Expense variables
    v_expenses_total NUMERIC := 0;
    v_expenses_cash NUMERIC := 0;
    v_expenses_esewa NUMERIC := 0;
    v_expenses_fonepay NUMERIC := 0;
    
    -- Deposit variables
    v_deposits_total NUMERIC := 0;
    v_deposits_cash NUMERIC := 0;
    v_deposits_esewa NUMERIC := 0;
    
    -- Savings variables
    v_savings_total NUMERIC := 0;
    v_savings_cash NUMERIC := 0;
    v_savings_fonepay NUMERIC := 0;
    v_savings_esewa NUMERIC := 0;
    
    -- Withdrawal variables
    v_withdrawals_total NUMERIC := 0;
    v_withdrawals_coop NUMERIC := 0;
    v_withdrawals_coop_cash NUMERIC := 0;
    v_withdrawals_coop_esewa NUMERIC := 0;
    v_withdrawals_coop_fonepay NUMERIC := 0;
    v_withdrawals_bank NUMERIC := 0;
    v_withdrawals_bank_cash NUMERIC := 0;
    v_withdrawals_bank_esewa NUMERIC := 0;
    
    -- Calculated totals
    v_total_income NUMERIC := 0;
    v_total_cash_income NUMERIC := 0;
    v_total_fonepay_income NUMERIC := 0;
    v_total_esewa_income NUMERIC := 0;
    
    -- Balances
    v_cash_balance NUMERIC := 0;
    v_esewa_balance NUMERIC := 0;
    v_fonepay_balance NUMERIC := 0;
    v_cooperative_balance NUMERIC := 0;
    v_total_balance NUMERIC := 0;
BEGIN
    -- Calculate Orders Income by Payment Mode
    SELECT 
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(cash|Cash)%' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(fonepay|Fonepay|bank|Bank)%' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(esewa|Esewa|eSewa)%' THEN total ELSE 0 END), 0)
    INTO v_orders_total, v_orders_cash, v_orders_fonepay, v_orders_esewa
    FROM orders 
    WHERE order_date = target_date;
    
    -- Calculate Charging Income by Payment Mode
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(cash|Cash)%' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(fonepay|Fonepay|bank|Bank)%' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(esewa|Esewa|eSewa)%' THEN total_amount ELSE 0 END), 0)
    INTO v_charging_total, v_charging_cash, v_charging_fonepay, v_charging_esewa
    FROM charging_sessions 
    WHERE session_date = target_date;
    
    -- Calculate Expenses by Payment Mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(cash|Cash)%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(esewa|Esewa|eSewa)%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) SIMILAR TO '%(fonepay|Fonepay|bank|Bank)%' THEN amount ELSE 0 END), 0)
    INTO v_expenses_total, v_expenses_cash, v_expenses_esewa, v_expenses_fonepay
    FROM expenses 
    WHERE expense_date = target_date;
    
    -- Calculate Deposits by Mode - check both mode and deposited_to columns
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode, 'cash')) SIMILAR TO '%(cash|Cash)%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode, 'cash')) SIMILAR TO '%(esewa|Esewa|eSewa)%' THEN amount ELSE 0 END), 0)
    INTO v_deposits_total, v_deposits_cash, v_deposits_esewa
    FROM deposits 
    WHERE deposit_date = target_date;
    
    -- Calculate Savings by Payment Mode
    SELECT 
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) SIMILAR TO '%(cash|Cash)%' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) SIMILAR TO '%(fonepay|Fonepay|bank|Bank)%' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) SIMILAR TO '%(esewa|Esewa|eSewa)%' THEN contribution_amount ELSE 0 END), 0)
    INTO v_savings_total, v_savings_cash, v_savings_fonepay, v_savings_esewa
    FROM cooperative_savings 
    WHERE contribution_date = target_date;
    
    -- Calculate Withdrawals by Source and Payment Mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'cooperative' AND LOWER(payment_mode) SIMILAR TO '%(cash|Cash)%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'cooperative' AND LOWER(payment_mode) SIMILAR TO '%(esewa|Esewa|eSewa)%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'cooperative' AND LOWER(payment_mode) SIMILAR TO '%(fonepay|Fonepay|bank|Bank)%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'bank' AND LOWER(payment_mode) SIMILAR TO '%(cash|Cash)%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'bank' AND LOWER(payment_mode) SIMILAR TO '%(esewa|Esewa|eSewa)%' THEN amount ELSE 0 END), 0)
    INTO v_withdrawals_total, v_withdrawals_coop, v_withdrawals_coop_cash, v_withdrawals_coop_esewa, 
         v_withdrawals_coop_fonepay, v_withdrawals_bank, v_withdrawals_bank_cash, v_withdrawals_bank_esewa
    FROM withdrawals 
    WHERE withdrawal_date = target_date;
    
    -- Calculate derived totals
    v_total_income := v_orders_total + v_charging_total;
    v_total_cash_income := v_orders_cash + v_charging_cash;
    v_total_fonepay_income := v_orders_fonepay + v_charging_fonepay;
    v_total_esewa_income := v_orders_esewa + v_charging_esewa;
    
    -- Calculate balances based on business logic
    v_cash_balance := v_total_cash_income - v_expenses_cash - v_deposits_cash - v_savings_cash + (v_withdrawals_coop_cash + v_withdrawals_bank_cash);
    v_esewa_balance := v_total_esewa_income - v_expenses_esewa - v_deposits_esewa - v_savings_esewa + (v_withdrawals_coop_esewa + v_withdrawals_bank_esewa);
    v_fonepay_balance := v_total_fonepay_income - v_expenses_fonepay - v_savings_fonepay + v_withdrawals_coop_fonepay;
    v_cooperative_balance := v_savings_total - v_withdrawals_coop;
    v_total_balance := v_cash_balance + v_esewa_balance + v_fonepay_balance + v_cooperative_balance;
    
    -- Return the calculated values
    RETURN QUERY SELECT
        target_date,
        v_orders_total,
        v_orders_cash,
        v_orders_fonepay,
        v_orders_esewa,
        v_charging_total,
        v_charging_fonepay,
        v_charging_esewa,
        v_charging_cash,
        v_expenses_total,
        v_expenses_cash,
        v_expenses_esewa,
        v_expenses_fonepay,
        v_deposits_total,
        v_deposits_cash,
        v_deposits_esewa,
        v_savings_total,
        v_savings_cash,
        v_savings_fonepay,
        v_savings_esewa,
        v_withdrawals_total,
        v_withdrawals_coop,
        v_withdrawals_coop_cash,
        v_withdrawals_coop_esewa,
        v_withdrawals_coop_fonepay,
        v_withdrawals_bank,
        v_withdrawals_bank_cash,
        v_withdrawals_bank_esewa,
        v_total_income,
        v_total_cash_income,
        v_total_fonepay_income,
        v_total_esewa_income,
        v_cash_balance,
        v_esewa_balance,
        v_fonepay_balance,
        v_cooperative_balance,
        v_total_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily summary with enhanced calculations
CREATE OR REPLACE FUNCTION update_enhanced_daily_summary(target_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_summary (
        summary_date,
        total_income_from_orders,
        total_income_from_orders_cash,
        total_income_from_orders_fonepay,
        total_income_from_orders_esewa,
        total_income_from_charging,
        total_income_from_charging_fonepay,
        total_income_from_charging_esewa,
        total_income_from_charging_cash,
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
        total_withdrawals_cooperative_cash,
        total_withdrawals_cooperative_esewa,
        total_withdrawals_cooperative_fonepay,
        total_withdrawals_bank,
        total_withdrawals_bank_cash,
        total_withdrawals_bank_esewa,
        total_income,
        total_cash_income,
        total_fonepay_income,
        total_esewa_income,
        cash_balance,
        esewa_balance,
        fonepay_balance,
        cooperative_balance,
        total_balance,
        updated_at
    )
    SELECT 
        *,
        NOW()
    FROM calculate_enhanced_daily_summary(target_date)
    ON CONFLICT (summary_date) 
    DO UPDATE SET
        total_income_from_orders = EXCLUDED.total_income_from_orders,
        total_income_from_orders_cash = EXCLUDED.total_income_from_orders_cash,
        total_income_from_orders_fonepay = EXCLUDED.total_income_from_orders_fonepay,
        total_income_from_orders_esewa = EXCLUDED.total_income_from_orders_esewa,
        total_income_from_charging = EXCLUDED.total_income_from_charging,
        total_income_from_charging_fonepay = EXCLUDED.total_income_from_charging_fonepay,
        total_income_from_charging_esewa = EXCLUDED.total_income_from_charging_esewa,
        total_income_from_charging_cash = EXCLUDED.total_income_from_charging_cash,
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
        total_withdrawals_cooperative_cash = EXCLUDED.total_withdrawals_cooperative_cash,
        total_withdrawals_cooperative_esewa = EXCLUDED.total_withdrawals_cooperative_esewa,
        total_withdrawals_cooperative_fonepay = EXCLUDED.total_withdrawals_cooperative_fonepay,
        total_withdrawals_bank = EXCLUDED.total_withdrawals_bank,
        total_withdrawals_bank_cash = EXCLUDED.total_withdrawals_bank_cash,
        total_withdrawals_bank_esewa = EXCLUDED.total_withdrawals_bank_esewa,
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

-- Trigger function for auto-updating daily summary
CREATE OR REPLACE FUNCTION trigger_update_daily_summary()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
BEGIN
    -- Determine the date to update based on the table and operation
    IF TG_TABLE_NAME = 'orders' THEN
        target_date := COALESCE(NEW.order_date, OLD.order_date);
    ELSIF TG_TABLE_NAME = 'charging_sessions' THEN
        target_date := COALESCE(NEW.session_date, OLD.session_date);
    ELSIF TG_TABLE_NAME = 'expenses' THEN
        target_date := COALESCE(NEW.expense_date, OLD.expense_date);
    ELSIF TG_TABLE_NAME = 'deposits' THEN
        target_date := COALESCE(NEW.deposit_date, OLD.deposit_date);
    ELSIF TG_TABLE_NAME = 'withdrawals' THEN
        target_date := COALESCE(NEW.withdrawal_date, OLD.withdrawal_date);
    ELSIF TG_TABLE_NAME = 'cooperative_savings' THEN
        target_date := COALESCE(NEW.contribution_date, OLD.contribution_date);
    END IF;
    
    -- Update the daily summary for the target date
    IF target_date IS NOT NULL THEN
        PERFORM update_enhanced_daily_summary(target_date);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic daily summary updates
CREATE TRIGGER daily_summary_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER daily_summary_charging_trigger
    AFTER INSERT OR UPDATE OR DELETE ON charging_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER daily_summary_expenses_trigger
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER daily_summary_deposits_trigger
    AFTER INSERT OR UPDATE OR DELETE ON deposits
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER daily_summary_withdrawals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER daily_summary_savings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON cooperative_savings
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

-- Function to populate historical daily summaries
CREATE OR REPLACE FUNCTION populate_historical_daily_summaries()
RETURNS VOID AS $$
DECLARE
    d DATE;
BEGIN
    RAISE NOTICE 'Starting historical daily summary population...';
    
    -- Get all unique dates from all tables and populate them
    FOR d IN (
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
        ORDER BY summary_date
    )
    LOOP
        -- Update summary for each date
        PERFORM update_enhanced_daily_summary(d);
        RAISE NOTICE 'Updated daily summary for: %', d;
    END LOOP;
    
    RAISE NOTICE 'Historical daily summaries populated successfully';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_enhanced_daily_summary(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_enhanced_daily_summary(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_update_daily_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION populate_historical_daily_summaries() TO authenticated;

-- Add comments
COMMENT ON FUNCTION calculate_enhanced_daily_summary IS 'Calculate enhanced daily summary with detailed breakdown by payment modes and sources';
COMMENT ON FUNCTION update_enhanced_daily_summary IS 'Update daily summary table with enhanced calculations';
COMMENT ON FUNCTION trigger_update_daily_summary IS 'Trigger function for auto-updating daily summary when source tables change';
COMMENT ON FUNCTION populate_historical_daily_summaries IS 'Populate historical data in daily_summary table from all existing transactions';

-- Execute historical population (uncomment to run)
-- SELECT populate_historical_daily_summaries();

RAISE NOTICE 'Enhanced Daily Summary System created successfully!';
RAISE NOTICE 'To populate historical data, run: SELECT populate_historical_daily_summaries();';
