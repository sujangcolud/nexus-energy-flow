-- Migration to fix historical business dates and ensure daily summary is synchronized.

-- 1. Ensure all business date columns are populated from created_at if they are NULL.
UPDATE public.orders SET order_date = created_at::DATE WHERE order_date IS NULL;
UPDATE public.charging_sessions SET session_date = created_at::DATE WHERE session_date IS NULL;
UPDATE public.expenses SET expense_date = created_at::DATE WHERE expense_date IS NULL;
UPDATE public.deposits SET deposit_date = created_at::DATE WHERE deposit_date IS NULL;
UPDATE public.withdrawals SET withdrawal_date = created_at::DATE WHERE withdrawal_date IS NULL;
UPDATE public.cooperative_savings SET contribution_date = created_at::DATE WHERE contribution_date IS NULL;

-- 2. Recalculate daily summary for all unique dates across all transaction tables.
DO $$
DECLARE
    d DATE;
BEGIN
    FOR d IN
        SELECT DISTINCT business_date FROM (
            SELECT order_date AS business_date FROM public.orders
            UNION
            SELECT session_date FROM public.charging_sessions
            UNION
            SELECT expense_date FROM public.expenses
            UNION
            SELECT deposit_date FROM public.deposits
            UNION
            SELECT withdrawal_date FROM public.withdrawals
            UNION
            SELECT contribution_date FROM public.cooperative_savings
        ) t WHERE business_date IS NOT NULL
    LOOP
        PERFORM public.update_daily_summary(d);
    END LOOP;
END $$;
