-- Migration: Add withdrawal_from and cooperative_member_id to withdrawals table
-- Add enhanced fields for cooperative savings 
-- Created to support the UI changes made to withdrawal and savings forms

-- ===========================
-- ADD WITHDRAWAL SOURCE FIELDS
-- ===========================

-- Add withdrawal_from column to track withdrawal source (Bank, Cooperative, Esewa, Cash)
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS withdrawal_from TEXT;

-- Add cooperative_member_id column for when withdrawal is from cooperative
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS cooperative_member_id TEXT;

-- Add payment_mode column to withdrawals for consistency with other tables
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payment_mode TEXT;

-- ===========================
-- UPDATE EXISTING DATA
-- ===========================

-- Set default values for existing records to maintain data integrity
UPDATE withdrawals 
SET withdrawal_from = 'Cash' 
WHERE withdrawal_from IS NULL;

UPDATE withdrawals 
SET payment_mode = 'Cash' 
WHERE payment_mode IS NULL;

-- Extract cooperative member IDs from purpose field if they exist
-- (This handles the temporary storage approach we used)
UPDATE withdrawals 
SET 
  withdrawal_from = 'Cooperative',
  cooperative_member_id = CASE 
    WHEN purpose LIKE '%DF1%' THEN 'DF1'
    WHEN purpose LIKE '%SF1%' THEN 'SF1'
    ELSE NULL
  END
WHERE purpose LIKE '%cooperative%' OR purpose LIKE '%DF1%' OR purpose LIKE '%SF1%';

-- ===========================
-- ADD CONSTRAINTS AND INDEXES
-- ===========================

-- Add check constraint for withdrawal_from values
ALTER TABLE withdrawals 
ADD CONSTRAINT withdrawals_withdrawal_from_check 
CHECK (withdrawal_from IN ('Bank', 'Cooperative', 'Esewa', 'Cash'));

-- Add index for faster queries on withdrawal_from
CREATE INDEX IF NOT EXISTS idx_withdrawals_withdrawal_from ON withdrawals(withdrawal_from);

-- Add index for cooperative_member_id
CREATE INDEX IF NOT EXISTS idx_withdrawals_cooperative_member_id ON withdrawals(cooperative_member_id);

-- ===========================
-- UPDATE DAILY SUMMARY FUNCTION
-- ===========================

-- Update the daily summary function to use the new withdrawal_from field
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

    -- Withdrawals (now using withdrawal_from field)
    v_total_withdrawals NUMERIC;
    v_total_withdrawals_cooperative NUMERIC;
    v_total_withdrawals_bank NUMERIC;
    v_total_withdrawals_esewa NUMERIC;
    v_total_withdrawals_cash NUMERIC;

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

    -- Calculate withdrawals using new withdrawal_from field
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'cash' THEN amount ELSE 0 END), 0)
    INTO
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank,
        v_total_withdrawals_esewa,
        v_total_withdrawals_cash
    FROM withdrawals
    WHERE withdrawal_date = summary_date;

    -- Calculate total income
    v_total_income := v_total_income_from_orders + v_total_income_from_charging;
    v_total_cash_income := v_total_income_cash_orders + v_total_income_cash_charging;
    v_total_fonepay_income := v_total_income_fonepay_orders + v_total_income_fonepay_charging;
    v_total_esewa_income := v_total_income_esewa_orders + v_total_income_esewa_charging;

    -- Calculate balances (now accounting for withdrawal sources)
    v_cash_balance := v_total_cash_income - v_total_expenses_cash - v_total_savings_cash + v_total_deposits_cash - v_total_withdrawals_cash;
    v_esewa_balance := v_total_esewa_income - v_total_expenses_esewa - v_total_savings_esewa + v_total_deposits_esewa - v_total_withdrawals_esewa;
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

-- ===========================
-- ADD ENHANCED COLUMNS TO DAILY SUMMARY
-- ===========================

-- Add new withdrawal breakdown columns to daily_summary table
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_withdrawals_esewa NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_withdrawals_cash NUMERIC DEFAULT 0;

-- ===========================
-- REFRESH DATA
-- ===========================

-- Refresh all daily summaries to incorporate the new withdrawal tracking
DO $$
DECLARE
    d DATE;
BEGIN
    FOR d IN
        SELECT DISTINCT withdrawal_date 
        FROM withdrawals 
        WHERE withdrawal_date IS NOT NULL
    LOOP
        PERFORM update_daily_summary(d);
    END LOOP;
    
    RAISE NOTICE 'Withdrawal enhancements applied and daily summaries updated';
END;
$$;

-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- ===========================
-- COMPLETION MESSAGE
-- ===========================
SELECT 'Withdrawal and savings enhancements completed successfully!' as status;

-- Show the updated withdrawals table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'withdrawals' 
AND table_schema = 'public'
ORDER BY ordinal_position;
