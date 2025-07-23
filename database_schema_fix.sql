-- Database Schema Fix for Missing Payment Mode Columns
-- Run this to add missing withdrawal payment mode columns to daily_summary table

-- Add missing withdrawal payment mode columns
ALTER TABLE public.daily_summary 
ADD COLUMN IF NOT EXISTS total_withdrawals_cash numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawals_esewa numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawals_fonepay numeric DEFAULT 0;

-- Add missing expense payment mode columns for safety (might already exist)
ALTER TABLE public.daily_summary 
ADD COLUMN IF NOT EXISTS total_expenses_cash numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_expenses_esewa numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_expenses_fonepay numeric DEFAULT 0;

-- Create improved daily summary calculation function
CREATE OR REPLACE FUNCTION calculate_daily_summary_fixed(target_date date, target_user_id uuid)
RETURNS TABLE(
    summary_date date,
    total_income_from_orders numeric,
    total_income_from_charging numeric,
    total_income_fonepay numeric,
    total_income_esewa numeric,
    total_income_cash numeric,
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
    total_withdrawals_bank numeric,
    total_withdrawals_cash numeric,
    total_withdrawals_esewa numeric,
    total_withdrawals_fonepay numeric,
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
    -- Income variables
    v_income_orders numeric := 0;
    v_income_charging numeric := 0;
    v_income_cash numeric := 0;
    v_income_esewa numeric := 0;
    v_income_fonepay numeric := 0;
    
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
    v_savings_esewa numeric := 0;
    v_savings_fonepay numeric := 0;
    
    -- Withdrawal variables
    v_withdrawals_total numeric := 0;
    v_withdrawals_cooperative numeric := 0;
    v_withdrawals_bank numeric := 0;
    v_withdrawals_cash numeric := 0;
    v_withdrawals_esewa numeric := 0;
    v_withdrawals_fonepay numeric := 0;
    
    -- Balance variables
    v_cash_balance numeric := 0;
    v_esewa_balance numeric := 0;
    v_fonepay_balance numeric := 0;
    v_cooperative_balance numeric := 0;
    v_total_balance numeric := 0;
BEGIN
    -- Calculate income from orders by payment mode
    SELECT 
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' THEN total ELSE 0 END), 0)
    INTO v_income_orders, v_income_cash, v_income_esewa, v_income_fonepay
    FROM orders 
    WHERE user_id = target_user_id 
    AND order_date = target_date;
    
    -- Calculate income from charging by payment mode
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' THEN total_amount ELSE 0 END), 0)
    INTO v_income_charging, 
         v_income_cash,      -- Add to existing cash
         v_income_esewa,     -- Add to existing esewa  
         v_income_fonepay    -- Add to existing fonepay
    FROM charging_sessions 
    WHERE user_id = target_user_id 
    AND session_date = target_date;
    
    -- Update total income by payment mode (orders + charging)
    v_income_cash := v_income_cash + 
        COALESCE((SELECT SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN total_amount ELSE 0 END) 
                  FROM charging_sessions WHERE user_id = target_user_id AND session_date = target_date), 0);
    
    v_income_esewa := v_income_esewa + 
        COALESCE((SELECT SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN total_amount ELSE 0 END) 
                  FROM charging_sessions WHERE user_id = target_user_id AND session_date = target_date), 0);
    
    v_income_fonepay := v_income_fonepay + 
        COALESCE((SELECT SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN total_amount ELSE 0 END) 
                  FROM charging_sessions WHERE user_id = target_user_id AND session_date = target_date), 0);
    
    -- Calculate expenses by payment mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN amount ELSE 0 END), 0)
    INTO v_expenses_total, v_expenses_cash, v_expenses_esewa, v_expenses_fonepay
    FROM expenses 
    WHERE user_id = target_user_id 
    AND expense_date = target_date;
    
    -- Calculate deposits by destination
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode)) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode)) LIKE '%esewa%' THEN amount ELSE 0 END), 0)
    INTO v_deposits_total, v_deposits_cash, v_deposits_esewa
    FROM deposits 
    WHERE user_id = target_user_id 
    AND deposit_date = target_date;
    
    -- Calculate savings by payment mode and destination
    SELECT 
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%cash%' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%esewa%' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%fonepay%' THEN contribution_amount ELSE 0 END), 0)
    INTO v_savings_total, v_savings_cash, v_savings_esewa, v_savings_fonepay
    FROM cooperative_savings 
    WHERE user_id = target_user_id 
    AND contribution_date = target_date;
    
    -- Calculate withdrawals by source and payment mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' THEN amount ELSE 0 END), 0)
    INTO v_withdrawals_total, v_withdrawals_cooperative, v_withdrawals_bank, 
         v_withdrawals_cash, v_withdrawals_esewa, v_withdrawals_fonepay
    FROM withdrawals 
    WHERE user_id = target_user_id 
    AND withdrawal_date = target_date;
    
    -- Calculate balances using proper formulas
    v_cash_balance := v_income_cash - v_expenses_cash - v_savings_cash - v_deposits_cash + v_withdrawals_cash;
    v_esewa_balance := v_income_esewa - v_expenses_esewa - v_savings_esewa + v_deposits_esewa - v_withdrawals_esewa;
    v_fonepay_balance := v_income_fonepay - v_expenses_fonepay - v_savings_fonepay;
    v_cooperative_balance := v_savings_total - v_withdrawals_cooperative;
    v_total_balance := v_cash_balance + v_esewa_balance + v_fonepay_balance + v_cooperative_balance;
    
    -- Return the calculated values
    RETURN QUERY SELECT
        target_date,
        v_income_orders,
        v_income_charging,
        v_income_fonepay,
        v_income_esewa,
        v_income_cash,
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
        v_withdrawals_cooperative,
        v_withdrawals_bank,
        v_withdrawals_cash,
        v_withdrawals_esewa,
        v_withdrawals_fonepay,
        (v_income_orders + v_income_charging), -- total_income
        v_income_cash,                          -- total_cash_income
        v_income_fonepay,                       -- total_fonepay_income
        v_income_esewa,                         -- total_esewa_income
        v_cash_balance,
        v_esewa_balance,
        v_fonepay_balance,
        v_cooperative_balance,
        v_total_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate historical data
CREATE OR REPLACE FUNCTION recalculate_historical_daily_summaries(target_user_id uuid)
RETURNS integer AS $$
DECLARE
    rec record;
    updated_count integer := 0;
BEGIN
    -- Loop through all existing daily summaries that need recalculation
    FOR rec IN 
        SELECT DISTINCT summary_date 
        FROM daily_summary 
        WHERE summary_date < '2025-07-19'  -- Only fix historical data
        ORDER BY summary_date
    LOOP
        -- Calculate corrected values
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
            total_withdrawals_cash,
            total_withdrawals_esewa,
            total_withdrawals_fonepay,
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
        FROM calculate_daily_summary_fixed(rec.summary_date, target_user_id)
        ON CONFLICT (summary_date) 
        DO UPDATE SET
            total_expenses_cash = EXCLUDED.total_expenses_cash,
            total_expenses_esewa = EXCLUDED.total_expenses_esewa,
            total_expenses_fonepay = EXCLUDED.total_expenses_fonepay,
            total_withdrawals_cash = EXCLUDED.total_withdrawals_cash,
            total_withdrawals_esewa = EXCLUDED.total_withdrawals_esewa,
            total_withdrawals_fonepay = EXCLUDED.total_withdrawals_fonepay,
            cash_balance = EXCLUDED.cash_balance,
            esewa_balance = EXCLUDED.esewa_balance,
            fonepay_balance = EXCLUDED.fonepay_balance,
            cooperative_balance = EXCLUDED.cooperative_balance,
            total_balance = EXCLUDED.total_balance,
            updated_at = NOW();
            
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Comments explaining the fix
COMMENT ON FUNCTION calculate_daily_summary_fixed IS 'Fixed calculation function that properly handles payment mode breakdowns and date parsing';
COMMENT ON FUNCTION recalculate_historical_daily_summaries IS 'Recalculates historical daily summaries with corrected payment mode breakdowns';
