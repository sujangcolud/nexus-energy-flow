
-- Consolidate and correct the daily summary calculation logic
-- This migration updates both update_daily_summary and sync_daily_summary_for_date
-- to use consistent formulas and correctly handle NULL payment modes.

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
    v_total_deposits_from_cash NUMERIC;

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
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN total ELSE 0 END), 0)
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
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN total_amount ELSE 0 END), 0)
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
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN amount ELSE 0 END), 0)
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
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode, 'cash')) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0)
    INTO
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa,
        v_total_deposits_from_cash
    FROM public.deposits
    WHERE deposit_date = p_summary_date;

    -- Calculate savings
    SELECT
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN contribution_amount ELSE 0 END), 0)
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
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(withdrawal_from, 'cooperative')) = 'cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(withdrawal_from, 'cooperative')) = 'bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0)
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

    -- SPECIFIC REQUIREMENT for Verification System (Analytical Cash In Hand):
    -- Formula: (Total Cash In) - (Total Cash Out)
    -- Cash In: Cash Orders + Cash Charging
    -- Cash Out: Cash Expenses + Cash Savings + Cash Deposits + Cash Withdrawals
    v_system_cash_calc := (v_total_income_cash_orders + v_total_income_cash_charging) - (v_total_expenses_cash + v_total_savings_cash + v_total_deposits_from_cash + v_total_withdrawals_cash);

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
        total_deposits_from_cash,
        total_savings,
        total_savings_cash,
        total_savings_fonepay,
        total_savings_esewa,
        total_withdrawals,
        total_withdrawals_cooperative,
        total_withdrawals_bank,
        total_withdrawals_cash,
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
        v_total_deposits_from_cash,
        v_total_savings,
        v_total_savings_cash,
        v_total_savings_fonepay,
        v_total_savings_esewa,
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank,
        v_total_withdrawals_cash,
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
        total_deposits_from_cash = EXCLUDED.total_deposits_from_cash,
        total_savings = EXCLUDED.total_savings,
        total_savings_cash = EXCLUDED.total_savings_cash,
        total_savings_fonepay = EXCLUDED.total_savings_fonepay,
        total_savings_esewa = EXCLUDED.total_savings_esewa,
        total_withdrawals = EXCLUDED.total_withdrawals,
        total_withdrawals_cooperative = EXCLUDED.total_withdrawals_cooperative,
        total_withdrawals_bank = EXCLUDED.total_withdrawals_bank,
        total_withdrawals_cash = EXCLUDED.total_withdrawals_cash,
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

-- Sync sync_daily_summary_for_date to call the corrected update_daily_summary
CREATE OR REPLACE FUNCTION public.sync_daily_summary_for_date(target_date DATE)
RETURNS VOID AS $$
BEGIN
    PERFORM public.update_daily_summary(target_date);
END;
$$ LANGUAGE plpgsql;
