-- Database Schema Updates for Savings & Withdrawals Integration
-- This file contains all necessary SQL commands to implement the requested changes

-- =====================================================
-- 1. UPDATE COOPERATIVE_SAVINGS TABLE
-- =====================================================
-- Add payment_mode column to cooperative_savings table
ALTER TABLE cooperative_savings 
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Cash';

-- Update existing records to have a payment mode
UPDATE cooperative_savings 
SET payment_mode = 'Cash' 
WHERE payment_mode IS NULL;

-- Add constraint to ensure payment_mode is valid
ALTER TABLE cooperative_savings 
ADD CONSTRAINT cooperative_savings_payment_mode_check 
CHECK (payment_mode IN ('Cash', 'Esewa', 'Fonepay'));

-- =====================================================
-- 2. UPDATE WITHDRAWALS TABLE  
-- =====================================================
-- Add payment_mode column to withdrawals table
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Cash';

-- Add withdrawal_from column to withdrawals table
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS withdrawal_from VARCHAR(50) DEFAULT 'Cooperative';

-- Update existing records to have payment mode and withdrawal source
UPDATE withdrawals 
SET payment_mode = 'Cash', withdrawal_from = 'Cooperative' 
WHERE payment_mode IS NULL OR withdrawal_from IS NULL;

-- Add constraints to ensure valid values
ALTER TABLE withdrawals 
ADD CONSTRAINT withdrawals_payment_mode_check 
CHECK (payment_mode IN ('Cash', 'Esewa', 'Fonepay'));

ALTER TABLE withdrawals 
ADD CONSTRAINT withdrawals_withdrawal_from_check 
CHECK (withdrawal_from IN ('Esewa', 'Bank', 'Cooperative'));

-- =====================================================
-- 3. UPDATE DEPOSITS TABLE
-- =====================================================
-- Add deposited_by_type column to deposits table
ALTER TABLE deposits 
ADD COLUMN IF NOT EXISTS deposited_by_type VARCHAR(50) DEFAULT 'Customer';

-- Update existing records to have deposited_by_type
UPDATE deposits 
SET deposited_by_type = 'Customer' 
WHERE deposited_by_type IS NULL;

-- Add constraint to ensure deposited_by_type is valid
ALTER TABLE deposits 
ADD CONSTRAINT deposits_deposited_by_type_check 
CHECK (deposited_by_type IN ('Customer', 'Staff'));

-- =====================================================
-- 4. CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================
-- Create indexes on payment_mode columns for faster queries
CREATE INDEX IF NOT EXISTS idx_cooperative_savings_payment_mode 
ON cooperative_savings(payment_mode);

CREATE INDEX IF NOT EXISTS idx_withdrawals_payment_mode 
ON withdrawals(payment_mode);

CREATE INDEX IF NOT EXISTS idx_withdrawals_withdrawal_from 
ON withdrawals(withdrawal_from);

CREATE INDEX IF NOT EXISTS idx_deposits_deposited_by_type 
ON deposits(deposited_by_type);

-- Create composite indexes for date range queries with payment modes
CREATE INDEX IF NOT EXISTS idx_cooperative_savings_date_payment 
ON cooperative_savings(contribution_date, payment_mode);

CREATE INDEX IF NOT EXISTS idx_withdrawals_date_payment 
ON withdrawals(withdrawal_date, payment_mode);

CREATE INDEX IF NOT EXISTS idx_deposits_date_type 
ON deposits(deposit_date, deposited_by_type);

-- =====================================================
-- 5. UPDATE DAILY_SUMMARY TABLE FOR BALANCE CALCULATIONS
-- =====================================================
-- Add balance calculation columns to daily_summary table
ALTER TABLE daily_summary 
ADD COLUMN IF NOT EXISTS cash_balance_calculated DECIMAL(10,2) DEFAULT 0;

ALTER TABLE daily_summary 
ADD COLUMN IF NOT EXISTS bank_balance_calculated DECIMAL(10,2) DEFAULT 0;

ALTER TABLE daily_summary 
ADD COLUMN IF NOT EXISTS esewa_balance_calculated DECIMAL(10,2) DEFAULT 0;

ALTER TABLE daily_summary 
ADD COLUMN IF NOT EXISTS cooperative_balance_calculated DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- 6. CREATE VIEWS FOR BALANCE CALCULATIONS
-- =====================================================
-- Create view for real-time balance calculations
CREATE OR REPLACE VIEW balance_summary AS
WITH payment_totals AS (
  -- Income totals by payment mode
  SELECT 
    COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN total ELSE 0 END), 0) as cash_income_orders,
    COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN total ELSE 0 END), 0) as esewa_income_orders,
    COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN total ELSE 0 END), 0) as fonepay_income_orders
  FROM orders
  UNION ALL
  SELECT 
    COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN total_amount ELSE 0 END), 0) as cash_income_charging,
    COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN total_amount ELSE 0 END), 0) as esewa_income_charging,
    COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN total_amount ELSE 0 END), 0) as fonepay_income_charging
  FROM charging_sessions
),
expense_totals AS (
  SELECT 
    COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as cash_expenses,
    COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN amount ELSE 0 END), 0) as esewa_expenses,
    COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN amount ELSE 0 END), 0) as fonepay_expenses
  FROM expenses
),
deposit_totals AS (
  SELECT 
    COALESCE(SUM(CASE WHEN mode = 'Cash' THEN amount ELSE 0 END), 0) as cash_deposits,
    COALESCE(SUM(CASE WHEN mode = 'Esewa' THEN amount ELSE 0 END), 0) as esewa_deposits,
    COALESCE(SUM(CASE WHEN mode = 'Fonepay' THEN amount ELSE 0 END), 0) as fonepay_deposits
  FROM deposits
),
withdrawal_totals AS (
  SELECT 
    COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as cash_withdrawals,
    COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN amount ELSE 0 END), 0) as esewa_withdrawals,
    COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN amount ELSE 0 END), 0) as fonepay_withdrawals,
    COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' THEN amount ELSE 0 END), 0) as bank_withdrawals,
    COALESCE(SUM(CASE WHEN withdrawal_from = 'Esewa' THEN amount ELSE 0 END), 0) as esewa_source_withdrawals,
    COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' THEN amount ELSE 0 END), 0) as cooperative_withdrawals
  FROM withdrawals
),
savings_totals AS (
  SELECT 
    COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN contribution_amount ELSE 0 END), 0) as cash_savings,
    COALESCE(SUM(contribution_amount), 0) as total_savings
  FROM cooperative_savings
)
SELECT 
  -- Cash Balance: Total Cash Income (Charging + Order) - Total Cash Expenses - Total Cash Savings - cash deposits + cash withdrawals
  (pt.cash_income_orders + pt.cash_income_charging) - et.cash_expenses - st.cash_savings - dt.cash_deposits + wt.cash_withdrawals as cash_balance,
  
  -- Bank Balance: Total Fonepay Income (Charging + Order) - total fonepay(Bank) Expenses - total fonepay (bank) withdrawals
  (pt.fonepay_income_orders + pt.fonepay_income_charging) - et.fonepay_expenses - wt.bank_withdrawals as bank_balance,
  
  -- Esewa Balance: Total income in esewa (Charging + Order) - expense from esewa - withdrawal from esewa
  (pt.esewa_income_orders + pt.esewa_income_charging) - et.esewa_expenses - wt.esewa_source_withdrawals as esewa_balance,
  
  -- Cooperative balance: Total savings - total withdrawals (Current withdrawals are all from Cooperative)
  st.total_savings - wt.cooperative_withdrawals as cooperative_balance
  
FROM payment_totals pt
CROSS JOIN expense_totals et  
CROSS JOIN deposit_totals dt
CROSS JOIN withdrawal_totals wt
CROSS JOIN savings_totals st;

-- =====================================================
-- 7. CREATE FUNCTION FOR BALANCE CALCULATION
-- =====================================================
-- Create function to calculate balances for a specific date range
CREATE OR REPLACE FUNCTION calculate_balances_for_period(
  start_date DATE,
  end_date DATE,
  user_id_param UUID
)
RETURNS TABLE (
  cash_balance DECIMAL(10,2),
  bank_balance DECIMAL(10,2), 
  esewa_balance DECIMAL(10,2),
  cooperative_balance DECIMAL(10,2)
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH period_income AS (
    SELECT 
      COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN total ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN total_amount ELSE 0 END), 0) as cash_income,
      COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN total ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN total_amount ELSE 0 END), 0) as esewa_income,
      COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN total ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN total_amount ELSE 0 END), 0) as fonepay_income
    FROM (
      SELECT payment_mode, total, 0 as total_amount FROM orders 
      WHERE user_id = user_id_param AND order_date BETWEEN start_date AND end_date
      UNION ALL
      SELECT payment_mode, 0 as total, total_amount FROM charging_sessions 
      WHERE user_id = user_id_param AND session_date BETWEEN start_date AND end_date
    ) combined_income
  ),
  period_expenses AS (
    SELECT 
      COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as cash_expenses,
      COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN amount ELSE 0 END), 0) as esewa_expenses,
      COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN amount ELSE 0 END), 0) as fonepay_expenses
    FROM expenses 
    WHERE user_id = user_id_param AND expense_date BETWEEN start_date AND end_date
  ),
  period_deposits AS (
    SELECT 
      COALESCE(SUM(CASE WHEN mode = 'Cash' THEN amount ELSE 0 END), 0) as cash_deposits
    FROM deposits 
    WHERE user_id = user_id_param AND deposit_date BETWEEN start_date AND end_date
  ),
  period_withdrawals AS (
    SELECT 
      COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as cash_withdrawals,
      COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' THEN amount ELSE 0 END), 0) as bank_withdrawals,
      COALESCE(SUM(CASE WHEN withdrawal_from = 'Esewa' THEN amount ELSE 0 END), 0) as esewa_withdrawals,
      COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' THEN amount ELSE 0 END), 0) as cooperative_withdrawals
    FROM withdrawals 
    WHERE user_id = user_id_param AND withdrawal_date BETWEEN start_date AND end_date
  ),
  period_savings AS (
    SELECT 
      COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN contribution_amount ELSE 0 END), 0) as cash_savings,
      COALESCE(SUM(contribution_amount), 0) as total_savings
    FROM cooperative_savings 
    WHERE user_id = user_id_param AND contribution_date BETWEEN start_date AND end_date
  )
  SELECT 
    (pi.cash_income - pe.cash_expenses - ps.cash_savings - pd.cash_deposits + pw.cash_withdrawals)::DECIMAL(10,2),
    (pi.fonepay_income - pe.fonepay_expenses - pw.bank_withdrawals)::DECIMAL(10,2),
    (pi.esewa_income - pe.esewa_expenses - pw.esewa_withdrawals)::DECIMAL(10,2),
    (ps.total_savings - pw.cooperative_withdrawals)::DECIMAL(10,2)
  FROM period_income pi
  CROSS JOIN period_expenses pe
  CROSS JOIN period_deposits pd  
  CROSS JOIN period_withdrawals pw
  CROSS JOIN period_savings ps;
END;
$$;

-- =====================================================
-- 8. UPDATE RLS POLICIES
-- =====================================================
-- Update RLS policies to include new columns

-- Update policy for cooperative_savings table
DROP POLICY IF EXISTS "Users can view own cooperative_savings" ON cooperative_savings;
CREATE POLICY "Users can view own cooperative_savings" 
ON cooperative_savings FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cooperative_savings" ON cooperative_savings;
CREATE POLICY "Users can insert own cooperative_savings" 
ON cooperative_savings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cooperative_savings" ON cooperative_savings;
CREATE POLICY "Users can update own cooperative_savings" 
ON cooperative_savings FOR UPDATE 
USING (auth.uid() = user_id);

-- Update policy for withdrawals table  
DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawals;
CREATE POLICY "Users can view own withdrawals" 
ON withdrawals FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own withdrawals" ON withdrawals;
CREATE POLICY "Users can insert own withdrawals" 
ON withdrawals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own withdrawals" ON withdrawals;
CREATE POLICY "Users can update own withdrawals" 
ON withdrawals FOR UPDATE 
USING (auth.uid() = user_id);

-- Update policy for deposits table
DROP POLICY IF EXISTS "Users can view own deposits" ON deposits;
CREATE POLICY "Users can view own deposits" 
ON deposits FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own deposits" ON deposits;
CREATE POLICY "Users can insert own deposits" 
ON deposits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own deposits" ON deposits;
CREATE POLICY "Users can update own deposits" 
ON deposits FOR UPDATE 
USING (auth.uid() = user_id);

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================
-- These queries can be run to verify the changes were applied correctly

-- Verify cooperative_savings table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'cooperative_savings' 
-- ORDER BY ordinal_position;

-- Verify withdrawals table structure  
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'withdrawals'
-- ORDER BY ordinal_position;

-- Verify deposits table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'deposits' 
-- ORDER BY ordinal_position;

-- Test balance calculation function
-- SELECT * FROM calculate_balances_for_period('2024-01-01', '2024-12-31', 'your-user-id-here');

-- =====================================================
-- 10. SAMPLE DATA UPDATES (OPTIONAL)
-- =====================================================
-- Update sample records to demonstrate the new functionality

-- Update some existing cooperative_savings records with different payment modes
-- UPDATE cooperative_savings 
-- SET payment_mode = 'Esewa' 
-- WHERE id IN (SELECT id FROM cooperative_savings LIMIT 2);

-- UPDATE cooperative_savings 
-- SET payment_mode = 'Fonepay' 
-- WHERE id IN (SELECT id FROM cooperative_savings OFFSET 2 LIMIT 2);

-- Update some existing withdrawals records with different payment modes and sources  
-- UPDATE withdrawals 
-- SET payment_mode = 'Esewa', withdrawal_from = 'Esewa'
-- WHERE id IN (SELECT id FROM withdrawals LIMIT 2);

-- UPDATE withdrawals 
-- SET payment_mode = 'Fonepay', withdrawal_from = 'Bank'
-- WHERE id IN (SELECT id FROM withdrawals OFFSET 2 LIMIT 2);

-- Update some existing deposits records with different deposited_by_type
-- UPDATE deposits 
-- SET deposited_by_type = 'Staff'
-- WHERE id IN (SELECT id FROM deposits LIMIT 3);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This completes all database schema updates required for:
-- 1. Combined Savings & Withdrawals functionality
-- 2. Payment mode tracking for consistency
-- 3. Withdrawal source tracking (esewa, bank, cooperative)  
-- 4. Deposited by type tracking (Customer, Staff)
-- 5. Enhanced balance calculations for daily closing
-- 6. Performance optimizations with indexes
-- 7. Security with updated RLS policies
