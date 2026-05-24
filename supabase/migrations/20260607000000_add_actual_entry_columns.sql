-- Add analytical columns to daily_summary for actual vs system comparison
ALTER TABLE public.daily_summary
ADD COLUMN IF NOT EXISTS actual_cash_in_hand NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_fonepay_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_orders_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_orders_esewa NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_orders_fonepay NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_charging_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_charging_esewa NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_charging_fonepay NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS system_cash_calculation NUMERIC DEFAULT 0;

-- Add generated columns for differences to simplify BI queries
DO $$
BEGIN
    ALTER TABLE public.daily_summary DROP COLUMN IF EXISTS cash_diff;
    ALTER TABLE public.daily_summary DROP COLUMN IF EXISTS fonepay_diff;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping diff columns: %', SQLERRM;
END $$;

ALTER TABLE public.daily_summary
ADD COLUMN cash_diff NUMERIC GENERATED ALWAYS AS (actual_cash_in_hand - COALESCE(system_cash_calculation, 0)) STORED,
ADD COLUMN fonepay_diff NUMERIC GENERATED ALWAYS AS (actual_fonepay_total - COALESCE(total_income_fonepay, 0)) STORED;

-- Update update_daily_summary to populate these new columns and follow the specific Cash in Hand logic
CREATE OR REPLACE FUNCTION public.update_daily_summary(p_summary_date DATE)
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
    v_system_cash_calc NUMERIC;
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
    FROM public.orders
    WHERE order_date = p_summary_date;

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
    FROM public.charging_sessions
    WHERE session_date = p_summary_date;

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
    FROM public.expenses
    WHERE expense_date = p_summary_date;

    -- Calculate deposits
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(deposited_to) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(deposited_to) = 'esewa' THEN amount ELSE 0 END), 0)
    INTO
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa
    FROM public.deposits
    WHERE deposit_date = p_summary_date;

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
    FROM public.cooperative_savings
    WHERE contribution_date = p_summary_date;

    -- Calculate withdrawals
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(withdrawal_from) = 'bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0)
    INTO
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank,
        v_total_withdrawals_cash
    FROM public.withdrawals
    WHERE withdrawal_date = p_summary_date;

    -- Calculate total income
    v_total_income := v_total_income_from_orders + v_total_income_from_charging;
    v_total_cash_income := v_total_income_cash_orders + v_total_income_cash_charging;
    v_total_fonepay_income := v_total_income_fonepay_orders + v_total_income_fonepay_charging;
    v_total_esewa_income := v_total_income_esewa_orders + v_total_income_esewa_charging;

    -- Calculate balances (Standard Ledger)
    v_cash_balance := v_total_cash_income - v_total_expenses_cash - v_total_savings_cash + v_total_withdrawals_cash - v_total_deposits_esewa;
    v_esewa_balance := v_total_esewa_income - v_total_expenses_esewa - v_total_savings_esewa + v_total_deposits_esewa;
    v_fonepay_balance := v_total_fonepay_income - v_total_expenses_fonepay - v_total_savings_fonepay;
    v_cooperative_balance := v_total_savings - v_total_withdrawals_cooperative;
    v_total_balance := v_cash_balance + v_fonepay_balance + v_cooperative_balance + v_esewa_balance;

    -- SPECIFIC REQUIREMENT: Cash in hand calculation for audit
    -- Requirement: (Cash Orders + Cash Charging) - (Cash Expenses + Cash Savings)
    v_system_cash_calc := (v_total_income_cash_orders + v_total_income_cash_charging) - (v_total_expenses_cash + v_total_savings_cash);

    -- Insert or update the summary table
    INSERT INTO public.daily_summary (
        summary_date,
        total_income_from_orders,
        total_income_from_orders_cash,
        total_income_from_orders_esewa,
        total_income_from_orders_fonepay,
        total_income_from_charging,
        total_income_from_charging_cash,
        total_income_from_charging_esewa,
        total_income_from_charging_fonepay,
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
        total_balance,
        system_cash_calculation
    ) VALUES (
        p_summary_date,
        v_total_income_from_orders,
        v_total_income_cash_orders,
        v_total_income_esewa_orders,
        v_total_income_fonepay_orders,
        v_total_income_from_charging,
        v_total_income_cash_charging,
        v_total_income_esewa_charging,
        v_total_income_fonepay_charging,
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
        v_total_balance,
        v_system_cash_calc
    )
    ON CONFLICT (summary_date) DO UPDATE SET
        total_income_from_orders = EXCLUDED.total_income_from_orders,
        total_income_from_orders_cash = EXCLUDED.total_income_from_orders_cash,
        total_income_from_orders_esewa = EXCLUDED.total_income_from_orders_esewa,
        total_income_from_orders_fonepay = EXCLUDED.total_income_from_orders_fonepay,
        total_income_from_charging = EXCLUDED.total_income_from_charging,
        total_income_from_charging_cash = EXCLUDED.total_income_from_charging_cash,
        total_income_from_charging_esewa = EXCLUDED.total_income_from_charging_esewa,
        total_income_from_charging_fonepay = EXCLUDED.total_income_from_charging_fonepay,
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
        system_cash_calculation = EXCLUDED.system_cash_calculation,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
