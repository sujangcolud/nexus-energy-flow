-- CORRECTED Daily Summary Synchronization Script
-- This script matches your EXACT database schema
-- Run this in your Supabase SQL editor to sync all historical data

-- Create function to safely aggregate daily data matching your exact schema
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
    -- Get orders data for the date (using 'total' column and 'payment_mode')
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN total ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN total ELSE 0 END), 0) as fonepay_total
    INTO orders_data
    FROM orders 
    WHERE order_date = target_date;

    -- Get charging data for the date (using 'total_amount' column and 'payment_mode')
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN total_amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN total_amount ELSE 0 END), 0) as fonepay_total
    INTO charging_data
    FROM charging_sessions 
    WHERE session_date = target_date;

    -- Get expenses data for the date (using 'amount' column and 'payment_mode')
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN amount ELSE 0 END), 0) as fonepay_total
    INTO expenses_data
    FROM expenses 
    WHERE expense_date = target_date;

    -- Get deposits data for the date (using 'amount' column and 'mode' column)
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN mode = 'esewa' THEN amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN mode = 'fonepay' THEN amount ELSE 0 END), 0) as fonepay_total
    INTO deposits_data
    FROM deposits 
    WHERE deposit_date = target_date;

    -- Get withdrawals data for the date (using 'withdrawal_from' and 'payment_mode' columns)
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        -- Cooperative withdrawals by payment method
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as cooperative_cash_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND payment_mode = 'Esewa' THEN amount ELSE 0 END), 0) as cooperative_esewa_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND payment_mode = 'Fonepay' THEN amount ELSE 0 END), 0) as cooperative_fonepay_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' THEN amount ELSE 0 END), 0) as cooperative_total,
        -- Bank withdrawals by payment method
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' AND payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as bank_cash_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' AND payment_mode = 'Esewa' THEN amount ELSE 0 END), 0) as bank_esewa_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' THEN amount ELSE 0 END), 0) as bank_total
    INTO withdrawals_data
    FROM withdrawals 
    WHERE withdrawal_date = target_date;

    -- Get cooperative savings data for the date (using 'contribution_amount' column and 'payment_mode')
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(contribution_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN contribution_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN contribution_amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN contribution_amount ELSE 0 END), 0) as fonepay_total
    INTO savings_data
    FROM cooperative_savings 
    WHERE contribution_date = target_date;

    -- Calculate running balances
    SELECT 
        COALESCE((orders_data.cash_total + charging_data.cash_total + deposits_data.cash_total) - 
                 (expenses_data.cash_total + withdrawals_data.cooperative_cash_total + withdrawals_data.bank_cash_total + savings_data.cash_total), 0) as cash_balance,
        COALESCE((orders_data.esewa_total + charging_data.esewa_total + deposits_data.esewa_total) - 
                 (expenses_data.esewa_total + withdrawals_data.cooperative_esewa_total + withdrawals_data.bank_esewa_total + savings_data.esewa_total), 0) as esewa_balance,
        COALESCE((orders_data.fonepay_total + charging_data.fonepay_total + deposits_data.fonepay_total) - 
                 (expenses_data.fonepay_total + withdrawals_data.cooperative_fonepay_total + savings_data.fonepay_total), 0) as fonepay_balance,
        COALESCE(savings_data.total_amount - withdrawals_data.cooperative_total, 0) as cooperative_balance
    INTO balances_data;

    -- Insert or update the daily summary using EXACT column names from your schema
    INSERT INTO daily_summary (
        summary_date,
        total_income_from_orders,
        total_income_from_orders_cash,
        total_income_from_orders_esewa,
        total_income_from_orders_fonepay,
        total_income,
        total_cash_income,
        total_esewa_income,
        total_fonepay_income,
        total_income_from_charging,
        total_income_from_charging_cash,
        total_income_from_charging_esewa,
        total_income_from_charging_fonepay,
        total_expenses,
        total_expenses_cash,
        total_expenses_esewa,
        total_expenses_fonepay,
        total_deposits,
        total_deposits_cash,
        total_deposits_esewa,
        total_withdrawals,
        total_withdrawals_cooperative,
        total_withdrawals_cooperative_cash,
        total_withdrawals_cooperative_esewa,
        total_withdrawals_cooperative_fonepay,
        total_withdrawals_bank,
        total_withdrawals_bank_cash,
        total_withdrawals_bank_esewa,
        total_savings,
        total_savings_cash,
        total_savings_esewa,
        total_savings_fonepay,
        cash_balance,
        esewa_balance,
        fonepay_balance,
        cooperative_balance,
        total_balance,
        total_income_cash,
        total_income_esewa,
        total_income_fonepay,
        created_at,
        updated_at
    ) VALUES (
        target_date,
        orders_data.total_amount,
        orders_data.cash_total,
        orders_data.esewa_total,
        orders_data.fonepay_total,
        orders_data.total_amount + charging_data.total_amount,
        orders_data.cash_total + charging_data.cash_total,
        orders_data.esewa_total + charging_data.esewa_total,
        orders_data.fonepay_total + charging_data.fonepay_total,
        charging_data.total_amount,
        charging_data.cash_total,
        charging_data.esewa_total,
        charging_data.fonepay_total,
        expenses_data.total_amount,
        expenses_data.cash_total,
        expenses_data.esewa_total,
        expenses_data.fonepay_total,
        deposits_data.total_amount,
        deposits_data.cash_total,
        deposits_data.esewa_total,
        withdrawals_data.total_amount,
        withdrawals_data.cooperative_total,
        withdrawals_data.cooperative_cash_total,
        withdrawals_data.cooperative_esewa_total,
        withdrawals_data.cooperative_fonepay_total,
        withdrawals_data.bank_total,
        withdrawals_data.bank_cash_total,
        withdrawals_data.bank_esewa_total,
        savings_data.total_amount,
        savings_data.cash_total,
        savings_data.esewa_total,
        savings_data.fonepay_total,
        balances_data.cash_balance,
        balances_data.esewa_balance,
        balances_data.fonepay_balance,
        balances_data.cooperative_balance,
        balances_data.cash_balance + balances_data.esewa_balance + balances_data.fonepay_balance + balances_data.cooperative_balance,
        orders_data.cash_total + charging_data.cash_total,
        orders_data.esewa_total + charging_data.esewa_total,
        orders_data.fonepay_total + charging_data.fonepay_total,
        NOW(),
        NOW()
    )
    ON CONFLICT (summary_date) DO UPDATE SET
        total_income_from_orders = EXCLUDED.total_income_from_orders,
        total_income_from_orders_cash = EXCLUDED.total_income_from_orders_cash,
        total_income_from_orders_esewa = EXCLUDED.total_income_from_orders_esewa,
        total_income_from_orders_fonepay = EXCLUDED.total_income_from_orders_fonepay,
        total_income = EXCLUDED.total_income,
        total_cash_income = EXCLUDED.total_cash_income,
        total_esewa_income = EXCLUDED.total_esewa_income,
        total_fonepay_income = EXCLUDED.total_fonepay_income,
        total_income_from_charging = EXCLUDED.total_income_from_charging,
        total_income_from_charging_cash = EXCLUDED.total_income_from_charging_cash,
        total_income_from_charging_esewa = EXCLUDED.total_income_from_charging_esewa,
        total_income_from_charging_fonepay = EXCLUDED.total_income_from_charging_fonepay,
        total_expenses = EXCLUDED.total_expenses,
        total_expenses_cash = EXCLUDED.total_expenses_cash,
        total_expenses_esewa = EXCLUDED.total_expenses_esewa,
        total_expenses_fonepay = EXCLUDED.total_expenses_fonepay,
        total_deposits = EXCLUDED.total_deposits,
        total_deposits_cash = EXCLUDED.total_deposits_cash,
        total_deposits_esewa = EXCLUDED.total_deposits_esewa,
        total_withdrawals = EXCLUDED.total_withdrawals,
        total_withdrawals_cooperative = EXCLUDED.total_withdrawals_cooperative,
        total_withdrawals_cooperative_cash = EXCLUDED.total_withdrawals_cooperative_cash,
        total_withdrawals_cooperative_esewa = EXCLUDED.total_withdrawals_cooperative_esewa,
        total_withdrawals_cooperative_fonepay = EXCLUDED.total_withdrawals_cooperative_fonepay,
        total_withdrawals_bank = EXCLUDED.total_withdrawals_bank,
        total_withdrawals_bank_cash = EXCLUDED.total_withdrawals_bank_cash,
        total_withdrawals_bank_esewa = EXCLUDED.total_withdrawals_bank_esewa,
        total_savings = EXCLUDED.total_savings,
        total_savings_cash = EXCLUDED.total_savings_cash,
        total_savings_esewa = EXCLUDED.total_savings_esewa,
        total_savings_fonepay = EXCLUDED.total_savings_fonepay,
        cash_balance = EXCLUDED.cash_balance,
        esewa_balance = EXCLUDED.esewa_balance,
        fonepay_balance = EXCLUDED.fonepay_balance,
        cooperative_balance = EXCLUDED.cooperative_balance,
        total_balance = EXCLUDED.total_balance,
        total_income_cash = EXCLUDED.total_income_cash,
        total_income_esewa = EXCLUDED.total_income_esewa,
        total_income_fonepay = EXCLUDED.total_income_fonepay,
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
        SELECT DISTINCT transaction_date
        FROM (
            SELECT order_date as transaction_date FROM orders
            UNION
            SELECT session_date as transaction_date FROM charging_sessions
            UNION
            SELECT expense_date as transaction_date FROM expenses
            UNION
            SELECT deposit_date as transaction_date FROM deposits
            UNION
            SELECT withdrawal_date as transaction_date FROM withdrawals
            UNION
            SELECT contribution_date as transaction_date FROM cooperative_savings
        ) all_dates
        WHERE transaction_date IS NOT NULL
        ORDER BY transaction_date
    ) LOOP
        -- Sync daily summary for each date
        PERFORM sync_daily_summary_for_date(target_date);
    END LOOP;
    
    RAISE NOTICE 'Daily summary synchronization completed for all historical dates';
END $$;
