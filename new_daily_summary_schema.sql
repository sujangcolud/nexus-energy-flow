-- New Daily Summary Table Schema based on CSV requirements
-- This replaces the existing daily_summary table with more detailed breakdown

-- Drop existing table and recreate with new structure
DROP TABLE IF EXISTS daily_summary CASCADE;

CREATE TABLE daily_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  
  -- Orders Income Breakdown
  total_income_from_orders NUMERIC DEFAULT 0,
  total_income_from_orders_cash NUMERIC DEFAULT 0,
  total_income_from_orders_fonepay NUMERIC DEFAULT 0,
  total_income_from_orders_esewa NUMERIC DEFAULT 0,
  
  -- Charging Income Breakdown
  total_income_from_charging NUMERIC DEFAULT 0,
  total_income_from_charging_fonepay NUMERIC DEFAULT 0,
  total_income_from_charging_esewa NUMERIC DEFAULT 0,
  total_income_from_charging_cash NUMERIC DEFAULT 0,
  
  -- Expenses Breakdown
  total_expenses NUMERIC DEFAULT 0,
  total_expenses_cash NUMERIC DEFAULT 0,
  total_expenses_esewa NUMERIC DEFAULT 0,
  total_expenses_fonepay NUMERIC DEFAULT 0,
  
  -- Deposits Breakdown
  total_deposits NUMERIC DEFAULT 0,
  total_deposits_cash NUMERIC DEFAULT 0,
  total_deposits_esewa NUMERIC DEFAULT 0,
  
  -- Savings Breakdown
  total_savings NUMERIC DEFAULT 0,
  total_savings_cash NUMERIC DEFAULT 0,
  total_savings_fonepay NUMERIC DEFAULT 0,
  total_savings_esewa NUMERIC DEFAULT 0,
  
  -- Withdrawals Breakdown by Source and Payment Mode
  total_withdrawals NUMERIC DEFAULT 0,
  total_withdrawals_cooperative NUMERIC DEFAULT 0,
  total_withdrawals_cooperative_cash NUMERIC DEFAULT 0,
  total_withdrawals_cooperative_esewa NUMERIC DEFAULT 0,
  total_withdrawals_cooperative_fonepay NUMERIC DEFAULT 0,
  total_withdrawals_bank NUMERIC DEFAULT 0,
  total_withdrawals_bank_cash NUMERIC DEFAULT 0,
  total_withdrawals_bank_esewa NUMERIC DEFAULT 0,
  
  -- Calculated Total Incomes
  total_income NUMERIC DEFAULT 0,
  total_cash_income NUMERIC DEFAULT 0,
  total_fonepay_income NUMERIC DEFAULT 0,
  total_esewa_income NUMERIC DEFAULT 0,
  
  -- Calculated Balances
  cash_balance NUMERIC DEFAULT 0,
  esewa_balance NUMERIC DEFAULT 0,
  fonepay_balance NUMERIC DEFAULT 0,
  cooperative_balance NUMERIC DEFAULT 0,
  total_balance NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced calculation function based on CSV logic
CREATE OR REPLACE FUNCTION calculate_enhanced_daily_summary(target_date date)
RETURNS TABLE(
    summary_date date,
    total_income_from_orders numeric,
    total_income_from_orders_cash numeric,
    total_income_from_orders_fonepay numeric,
    total_income_from_orders_esewa numeric,
    total_income_from_charging numeric,
    total_income_from_charging_fonepay numeric,
    total_income_from_charging_esewa numeric,
    total_income_from_charging_cash numeric,
    total_expenses numeric,
    total_expenses_cash numeric,
    total_expenses_esewa numeric,
    total_expenses_fonepay numeric,
    total_deposits numeric,
    total_deposits_cash numeric,
    total_deposits_esewa numeric,
    total_savings numeric,
    total_savings_cash numeric,
    total_savings_fonepay numeric,
    total_savings_esewa numeric,
    total_withdrawals numeric,
    total_withdrawals_cooperative numeric,
    total_withdrawals_cooperative_cash numeric,
    total_withdrawals_cooperative_esewa numeric,
    total_withdrawals_cooperative_fonepay numeric,
    total_withdrawals_bank numeric,
    total_withdrawals_bank_cash numeric,
    total_withdrawals_bank_esewa numeric,
    total_income numeric,
    total_cash_income numeric,
    total_fonepay_income numeric,
    total_esewa_income numeric,
    cash_balance numeric,
    esewa_balance numeric,
    fonepay_balance numeric,
    cooperative_balance numeric,
    total_balance numeric
) AS $$
DECLARE
    -- Orders variables
    v_orders_total numeric := 0;
    v_orders_cash numeric := 0;
    v_orders_fonepay numeric := 0;
    v_orders_esewa numeric := 0;
    
    -- Charging variables
    v_charging_total numeric := 0;
    v_charging_cash numeric := 0;
    v_charging_fonepay numeric := 0;
    v_charging_esewa numeric := 0;
    
    -- Expense variables
    v_expenses_total numeric := 0;
    v_expenses_cash numeric := 0;
    v_expenses_esewa numeric := 0;
    v_expenses_fonepay numeric := 0;
    
    -- Deposit variables
    v_deposits_total numeric := 0;
    v_deposits_cash numeric := 0;
    v_deposits_esewa numeric := 0;
    
    -- Savings variables
    v_savings_total numeric := 0;
    v_savings_cash numeric := 0;
    v_savings_fonepay numeric := 0;
    v_savings_esewa numeric := 0;
    
    -- Withdrawal variables
    v_withdrawals_total numeric := 0;
    v_withdrawals_coop numeric := 0;
    v_withdrawals_coop_cash numeric := 0;
    v_withdrawals_coop_esewa numeric := 0;
    v_withdrawals_coop_fonepay numeric := 0;
    v_withdrawals_bank numeric := 0;
    v_withdrawals_bank_cash numeric := 0;
    v_withdrawals_bank_esewa numeric := 0;
    
    -- Calculated totals
    v_total_income numeric := 0;
    v_total_cash_income numeric := 0;
    v_total_fonepay_income numeric := 0;
    v_total_esewa_income numeric := 0;
    
    -- Balances
    v_cash_balance numeric := 0;
    v_esewa_balance numeric := 0;
    v_fonepay_balance numeric := 0;
    v_cooperative_balance numeric := 0;
    v_total_balance numeric := 0;
BEGIN
    -- Calculate Orders Income by Payment Mode
    SELECT 
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN total ELSE 0 END), 0)
    INTO v_orders_total, v_orders_cash, v_orders_fonepay, v_orders_esewa
    FROM orders 
    WHERE order_date = target_date;
    
    -- Calculate Charging Income by Payment Mode
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN total_amount ELSE 0 END), 0)
    INTO v_charging_total, v_charging_cash, v_charging_fonepay, v_charging_esewa
    FROM charging_sessions 
    WHERE session_date = target_date;
    
    -- Calculate Expenses by Payment Mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN amount ELSE 0 END), 0)
    INTO v_expenses_total, v_expenses_cash, v_expenses_esewa, v_expenses_fonepay
    FROM expenses 
    WHERE expense_date = target_date;
    
    -- Calculate Deposits by Destination
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode)) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode)) LIKE '%esewa%' THEN amount ELSE 0 END), 0)
    INTO v_deposits_total, v_deposits_cash, v_deposits_esewa
    FROM deposits 
    WHERE deposit_date = target_date;
    
    -- Calculate Savings by Payment Mode
    SELECT 
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%cash%' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%fonepay%' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%esewa%' THEN contribution_amount ELSE 0 END), 0)
    INTO v_savings_total, v_savings_cash, v_savings_fonepay, v_savings_esewa
    FROM cooperative_savings 
    WHERE contribution_date = target_date;
    
    -- Calculate Withdrawals by Source and Payment Mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND LOWER(payment_mode) LIKE '%esewa%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND LOWER(payment_mode) LIKE '%fonepay%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' AND LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' AND LOWER(payment_mode) LIKE '%esewa%' THEN amount ELSE 0 END), 0)
    INTO v_withdrawals_total, v_withdrawals_coop, v_withdrawals_coop_cash, v_withdrawals_coop_esewa, 
         v_withdrawals_coop_fonepay, v_withdrawals_bank, v_withdrawals_bank_cash, v_withdrawals_bank_esewa
    FROM withdrawals 
    WHERE withdrawal_date = target_date;
    
    -- Calculate derived totals as per CSV logic
    v_total_income := v_orders_total + v_charging_total;
    v_total_cash_income := v_orders_cash + v_charging_cash;
    v_total_fonepay_income := v_orders_fonepay + v_charging_fonepay;
    v_total_esewa_income := v_orders_esewa + v_charging_esewa;
    
    -- Calculate balances as per CSV formulas
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_enhanced_daily_summary(date) TO authenticated;
GRANT EXECUTE ON FUNCTION update_enhanced_daily_summary(date) TO authenticated;

-- Add comments
COMMENT ON TABLE daily_summary IS 'Enhanced daily summary table with detailed payment mode breakdown as per CSV requirements';
COMMENT ON FUNCTION calculate_enhanced_daily_summary IS 'Calculate enhanced daily summary with detailed breakdown by payment modes and sources';
COMMENT ON FUNCTION update_enhanced_daily_summary IS 'Update daily summary table with enhanced calculations';
