-- SECURITY FIXES - Phase 2: Fix remaining functions with search_path vulnerabilities
-- This addresses the 41 remaining function search_path warnings

-- Fix all remaining functions to include proper SET search_path = 'public'
CREATE OR REPLACE FUNCTION public.sync_daily_summary_for_date_v2(target_date date)
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
    orders_data RECORD;
    charging_data RECORD;
    expenses_data RECORD;
    deposits_data RECORD;
    withdrawals_data RECORD;
    savings_data RECORD;
    balances_data RECORD;
BEGIN
    -- Get orders data for the date (using 'order_date' column)
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN total ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN total ELSE 0 END), 0) as fonepay_total
    INTO orders_data
    FROM public.orders 
    WHERE order_date = target_date;

    -- Get charging data for the date (using 'session_date' column)
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN total_amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN total_amount ELSE 0 END), 0) as fonepay_total
    INTO charging_data
    FROM public.charging_sessions 
    WHERE session_date = target_date;

    -- Get expenses data for the date (using 'expense_date' column)
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN amount ELSE 0 END), 0) as fonepay_total
    INTO expenses_data
    FROM public.expenses 
    WHERE expense_date = target_date;

    -- Get deposits data for the date (using 'deposit_date' column)
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN mode = 'esewa' THEN amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN mode = 'fonepay' THEN amount ELSE 0 END), 0) as fonepay_total
    INTO deposits_data
    FROM public.deposits 
    WHERE deposit_date = target_date;

    -- Get withdrawals data for the date (using 'withdrawal_date' column)
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as cooperative_cash_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND payment_mode = 'Esewa' THEN amount ELSE 0 END), 0) as cooperative_esewa_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND payment_mode = 'Fonepay' THEN amount ELSE 0 END), 0) as cooperative_fonepay_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' THEN amount ELSE 0 END), 0) as cooperative_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' AND payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as bank_cash_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' AND payment_mode = 'Esewa' THEN amount ELSE 0 END), 0) as bank_esewa_total,
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' THEN amount ELSE 0 END), 0) as bank_total
    INTO withdrawals_data
    FROM public.withdrawals 
    WHERE withdrawal_date = target_date;

    -- Get cooperative savings data for the date (using 'contribution_date' column)
    SELECT 
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(contribution_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN contribution_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'Esewa' THEN contribution_amount ELSE 0 END), 0) as esewa_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'Fonepay' THEN contribution_amount ELSE 0 END), 0) as fonepay_total
    INTO savings_data
    FROM public.cooperative_savings 
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

    -- Insert or update the daily summary
    INSERT INTO public.daily_summary (
        summary_date,
        total_income_from_orders, total_income_from_orders_cash, total_income_from_orders_esewa, total_income_from_orders_fonepay,
        total_income, total_cash_income, total_esewa_income, total_fonepay_income,
        total_income_from_charging, total_income_from_charging_cash, total_income_from_charging_esewa, total_income_from_charging_fonepay,
        total_expenses, total_expenses_cash, total_expenses_esewa, total_expenses_fonepay,
        total_deposits, total_deposits_cash, total_deposits_esewa,
        total_withdrawals, total_withdrawals_cooperative, total_withdrawals_cooperative_cash, total_withdrawals_cooperative_esewa, total_withdrawals_cooperative_fonepay,
        total_withdrawals_bank, total_withdrawals_bank_cash, total_withdrawals_bank_esewa,
        total_savings, total_savings_cash, total_savings_esewa, total_savings_fonepay,
        cash_balance, esewa_balance, fonepay_balance, cooperative_balance, total_balance,
        total_income_cash, total_income_esewa, total_income_fonepay,
        created_at, updated_at
    ) VALUES (
        target_date,
        orders_data.total_amount, orders_data.cash_total, orders_data.esewa_total, orders_data.fonepay_total,
        orders_data.total_amount + charging_data.total_amount, 
        orders_data.cash_total + charging_data.cash_total, 
        orders_data.esewa_total + charging_data.esewa_total, 
        orders_data.fonepay_total + charging_data.fonepay_total,
        charging_data.total_amount, charging_data.cash_total, charging_data.esewa_total, charging_data.fonepay_total,
        expenses_data.total_amount, expenses_data.cash_total, expenses_data.esewa_total, expenses_data.fonepay_total,
        deposits_data.total_amount, deposits_data.cash_total, deposits_data.esewa_total,
        withdrawals_data.total_amount, withdrawals_data.cooperative_total, withdrawals_data.cooperative_cash_total, withdrawals_data.cooperative_esewa_total, withdrawals_data.cooperative_fonepay_total,
        withdrawals_data.bank_total, withdrawals_data.bank_cash_total, withdrawals_data.bank_esewa_total,
        savings_data.total_amount, savings_data.cash_total, savings_data.esewa_total, savings_data.fonepay_total,
        balances_data.cash_balance, balances_data.esewa_balance, balances_data.fonepay_balance, balances_data.cooperative_balance,
        balances_data.cash_balance + balances_data.esewa_balance + balances_data.fonepay_balance + balances_data.cooperative_balance,
        orders_data.cash_total + charging_data.cash_total,
        orders_data.esewa_total + charging_data.esewa_total,
        orders_data.fonepay_total + charging_data.fonepay_total,
        NOW(), NOW()
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
$function$;

CREATE OR REPLACE FUNCTION public.calculate_daily_summary_fixed(target_date date, target_user_id uuid)
RETURNS TABLE(summary_date date, total_income_from_orders numeric, total_income_from_charging numeric, total_income_fonepay numeric, total_income_esewa numeric, total_income_cash numeric, total_expenses numeric, total_expenses_cash numeric, total_expenses_esewa numeric, total_expenses_fonepay numeric, total_deposits numeric, total_deposits_cash numeric, total_deposits_esewa numeric, total_savings numeric, total_savings_cash numeric, total_savings_fonepay numeric, total_savings_esewa numeric, total_withdrawals numeric, total_withdrawals_cooperative numeric, total_withdrawals_bank numeric, total_withdrawals_cash numeric, total_withdrawals_esewa numeric, total_withdrawals_fonepay numeric, total_income numeric, total_cash_income numeric, total_fonepay_income numeric, total_esewa_income numeric, cash_balance numeric, esewa_balance numeric, fonepay_balance numeric, cooperative_balance numeric, total_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
    FROM public.orders 
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
    FROM public.charging_sessions 
    WHERE user_id = target_user_id 
    AND session_date = target_date;
    
    -- Update total income by payment mode (orders + charging)
    v_income_cash := v_income_cash + 
        COALESCE((SELECT SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN total_amount ELSE 0 END) 
                  FROM public.charging_sessions WHERE user_id = target_user_id AND session_date = target_date), 0);
    
    v_income_esewa := v_income_esewa + 
        COALESCE((SELECT SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN total_amount ELSE 0 END) 
                  FROM public.charging_sessions WHERE user_id = target_user_id AND session_date = target_date), 0);
    
    v_income_fonepay := v_income_fonepay + 
        COALESCE((SELECT SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN total_amount ELSE 0 END) 
                  FROM public.charging_sessions WHERE user_id = target_user_id AND session_date = target_date), 0);
    
    -- Calculate expenses by payment mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN amount ELSE 0 END), 0)
    INTO v_expenses_total, v_expenses_cash, v_expenses_esewa, v_expenses_fonepay
    FROM public.expenses 
    WHERE user_id = target_user_id 
    AND expense_date = target_date;
    
    -- Calculate deposits by destination
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode)) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode)) LIKE '%esewa%' THEN amount ELSE 0 END), 0)
    INTO v_deposits_total, v_deposits_cash, v_deposits_esewa
    FROM public.deposits 
    WHERE user_id = target_user_id 
    AND deposit_date = target_date;
    
    -- Calculate savings by payment mode and destination
    SELECT 
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%cash%' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%esewa%' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) LIKE '%fonepay%' THEN contribution_amount ELSE 0 END), 0)
    INTO v_savings_total, v_savings_cash, v_savings_esewa, v_savings_fonepay
    FROM public.cooperative_savings 
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
    FROM public.withdrawals 
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
$function$;