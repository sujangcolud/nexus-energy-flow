-- Complete Daily Summary Synchronization Script
-- This script will populate the daily_summary table with historical data from all transaction tables
-- Run this in your Supabase SQL editor to sync all historical data

-- First, let's create a function to safely aggregate daily data
CREATE OR REPLACE FUNCTION sync_daily_summary_for_date(target_date DATE)
RETURNS VOID AS $$
DECLARE
    orders_data RECORD;
    charging_data RECORD;
    expenses_data RECORD;
    deposits_data RECORD;
    withdrawals_data RECORD;
    savings_data RECORD;
    balances_data RECORD;
BEGIN
    -- Get orders data for the date
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'esewa' THEN total_amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_method = 'fonepay' THEN total_amount ELSE 0 END), 0) as fonepay_total
    INTO orders_data
    FROM orders 
    WHERE DATE(created_at) = target_date;

    -- Get charging data for the date
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'esewa' THEN amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_method = 'fonepay' THEN amount ELSE 0 END), 0) as fonepay_total
    INTO charging_data
    FROM charging_sessions 
    WHERE DATE(created_at) = target_date;

    -- Get expenses data for the date
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'esewa' THEN amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_method = 'fonepay' THEN amount ELSE 0 END), 0) as fonepay_total
    INTO expenses_data
    FROM expenses 
    WHERE DATE(created_at) = target_date;

    -- Get deposits data for the date
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'esewa' THEN amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_method = 'fonepay' THEN amount ELSE 0 END), 0) as fonepay_total
    INTO deposits_data
    FROM deposits 
    WHERE DATE(created_at) = target_date;

    -- Get withdrawals data for the date
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN withdrawal_source = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN withdrawal_source = 'bank' THEN amount ELSE 0 END), 0) as bank_total,
        COALESCE(SUM(CASE WHEN withdrawal_source = 'cooperative' THEN amount ELSE 0 END), 0) as cooperative_total
    INTO withdrawals_data
    FROM withdrawals 
    WHERE DATE(created_at) = target_date;

    -- Get cooperative savings data for the date
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'esewa' THEN amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_method = 'fonepay' THEN amount ELSE 0 END), 0) as fonepay_total
    INTO savings_data
    FROM cooperative_savings 
    WHERE DATE(created_at) = target_date;

    -- Calculate running balances (this is simplified - you may need to adjust based on your balance calculation logic)
    SELECT 
        COALESCE((orders_data.cash_total + charging_data.cash_total + deposits_data.cash_total) - 
                 (expenses_data.cash_total + withdrawals_data.cash_total + savings_data.cash_total), 0) as cash_balance,
        COALESCE((orders_data.esewa_total + charging_data.esewa_total + deposits_data.esewa_total) - 
                 (expenses_data.esewa_total + savings_data.esewa_total), 0) as esewa_balance,
        COALESCE((orders_data.fonepay_total + charging_data.fonepay_total + deposits_data.fonepay_total) - 
                 (expenses_data.fonepay_total + savings_data.fonepay_total), 0) as fonepay_balance,
        COALESCE(deposits_data.cash_total + deposits_data.esewa_total - withdrawals_data.bank_total, 0) as bank_balance,
        COALESCE(savings_data.total_amount - withdrawals_data.cooperative_total, 0) as cooperative_balance
    INTO balances_data;

    -- Insert or update the daily summary
    INSERT INTO daily_summary (
        summary_date,
        -- Orders totals
        total_income_from_orders,
        total_income_from_orders_cash,
        total_income_from_orders_esewa,
        total_income_from_orders_fonepay,
        -- Alternative column names for compatibility
        total_income,
        total_cash_income,
        total_esewa_income,
        total_fonepay_income,
        -- Charging totals
        total_income_from_charging,
        total_income_from_charging_cash,
        total_income_from_charging_esewa,
        total_income_from_charging_fonepay,
        -- Expenses totals
        total_expenses,
        total_expenses_cash,
        total_expenses_esewa,
        total_expenses_fonepay,
        -- Deposits totals
        total_deposits,
        total_deposits_cash,
        total_deposits_esewa,
        -- Withdrawals totals
        total_withdrawals,
        total_withdrawals_cash,
        total_withdrawals_bank,
        total_withdrawals_cooperative,
        -- Savings totals
        total_savings,
        total_savings_cash,
        total_savings_esewa,
        total_savings_fonepay,
        -- Current balances
        cash_balance,
        esewa_balance,
        fonepay_balance,
        bank_balance,
        cooperative_balance,
        -- Metadata
        created_at,
        updated_at
    ) VALUES (
        target_date,
        -- Orders totals
        orders_data.total_amount,
        orders_data.cash_total,
        orders_data.esewa_total,
        orders_data.fonepay_total,
        -- Alternative column names (same values for compatibility)
        orders_data.total_amount,
        orders_data.cash_total,
        orders_data.esewa_total,
        orders_data.fonepay_total,
        -- Charging totals
        charging_data.total_amount,
        charging_data.cash_total,
        charging_data.esewa_total,
        charging_data.fonepay_total,
        -- Expenses totals
        expenses_data.total_amount,
        expenses_data.cash_total,
        expenses_data.esewa_total,
        expenses_data.fonepay_total,
        -- Deposits totals
        deposits_data.total_amount,
        deposits_data.cash_total,
        deposits_data.esewa_total,
        -- Withdrawals totals
        withdrawals_data.total_amount,
        withdrawals_data.cash_total,
        withdrawals_data.bank_total,
        withdrawals_data.cooperative_total,
        -- Savings totals
        savings_data.total_amount,
        savings_data.cash_total,
        savings_data.esewa_total,
        savings_data.fonepay_total,
        -- Current balances
        balances_data.cash_balance,
        balances_data.esewa_balance,
        balances_data.fonepay_balance,
        balances_data.bank_balance,
        balances_data.cooperative_balance,
        -- Metadata
        NOW(),
        NOW()
    )
    ON CONFLICT (summary_date) DO UPDATE SET
        -- Orders totals
        total_income_from_orders = EXCLUDED.total_income_from_orders,
        total_income_from_orders_cash = EXCLUDED.total_income_from_orders_cash,
        total_income_from_orders_esewa = EXCLUDED.total_income_from_orders_esewa,
        total_income_from_orders_fonepay = EXCLUDED.total_income_from_orders_fonepay,
        -- Alternative column names
        total_income = EXCLUDED.total_income,
        total_cash_income = EXCLUDED.total_cash_income,
        total_esewa_income = EXCLUDED.total_esewa_income,
        total_fonepay_income = EXCLUDED.total_fonepay_income,
        -- Charging totals
        total_income_from_charging = EXCLUDED.total_income_from_charging,
        total_income_from_charging_cash = EXCLUDED.total_income_from_charging_cash,
        total_income_from_charging_esewa = EXCLUDED.total_income_from_charging_esewa,
        total_income_from_charging_fonepay = EXCLUDED.total_income_from_charging_fonepay,
        -- Expenses totals
        total_expenses = EXCLUDED.total_expenses,
        total_expenses_cash = EXCLUDED.total_expenses_cash,
        total_expenses_esewa = EXCLUDED.total_expenses_esewa,
        total_expenses_fonepay = EXCLUDED.total_expenses_fonepay,
        -- Deposits totals
        total_deposits = EXCLUDED.total_deposits,
        total_deposits_cash = EXCLUDED.total_deposits_cash,
        total_deposits_esewa = EXCLUDED.total_deposits_esewa,
        -- Withdrawals totals
        total_withdrawals = EXCLUDED.total_withdrawals,
        total_withdrawals_cash = EXCLUDED.total_withdrawals_cash,
        total_withdrawals_bank = EXCLUDED.total_withdrawals_bank,
        total_withdrawals_cooperative = EXCLUDED.total_withdrawals_cooperative,
        -- Savings totals
        total_savings = EXCLUDED.total_savings,
        total_savings_cash = EXCLUDED.total_savings_cash,
        total_savings_esewa = EXCLUDED.total_savings_esewa,
        total_savings_fonepay = EXCLUDED.total_savings_fonepay,
        -- Current balances
        cash_balance = EXCLUDED.cash_balance,
        esewa_balance = EXCLUDED.esewa_balance,
        fonepay_balance = EXCLUDED.fonepay_balance,
        bank_balance = EXCLUDED.bank_balance,
        cooperative_balance = EXCLUDED.cooperative_balance,
        -- Metadata
        updated_at = NOW();

    RAISE NOTICE 'Synced daily summary for date: %', target_date;
END;
$$ LANGUAGE plpgsql;

-- Now sync all historical data
-- This will process all dates that have transactions
DO $$
DECLARE
    target_date DATE;
BEGIN
    -- Get all unique dates from all transaction tables
    FOR target_date IN (
        SELECT DISTINCT DATE(created_at) as transaction_date
        FROM (
            SELECT created_at FROM orders
            UNION
            SELECT created_at FROM charging_sessions
            UNION
            SELECT created_at FROM expenses
            UNION
            SELECT created_at FROM deposits
            UNION
            SELECT created_at FROM withdrawals
            UNION
            SELECT created_at FROM cooperative_savings
        ) all_dates
        ORDER BY transaction_date
    ) LOOP
        -- Sync daily summary for each date
        PERFORM sync_daily_summary_for_date(target_date);
    END LOOP;
    
    RAISE NOTICE 'Daily summary synchronization completed for all historical dates';
END $$;

-- Optional: Create a function to sync daily summaries on a schedule
CREATE OR REPLACE FUNCTION update_all_daily_summaries()
RETURNS void AS $$
DECLARE
    target_date DATE;
BEGIN
    FOR target_date IN (
        SELECT DISTINCT DATE(created_at) as transaction_date
        FROM (
            SELECT created_at FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            UNION
            SELECT created_at FROM charging_sessions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            UNION
            SELECT created_at FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            UNION
            SELECT created_at FROM deposits WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            UNION
            SELECT created_at FROM withdrawals WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            UNION
            SELECT created_at FROM cooperative_savings WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        ) recent_dates
        ORDER BY transaction_date
    ) LOOP
        PERFORM sync_daily_summary_for_date(target_date);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Check the results
SELECT 
    summary_date,
    total_income_from_orders,
    total_income_from_charging,
    total_expenses,
    total_deposits,
    total_withdrawals,
    total_savings,
    cash_balance,
    esewa_balance,
    fonepay_balance,
    bank_balance,
    cooperative_balance
FROM daily_summary 
ORDER BY summary_date DESC
LIMIT 20;
