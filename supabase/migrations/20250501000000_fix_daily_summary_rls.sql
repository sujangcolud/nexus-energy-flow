-- Fix for RLS preventing triggers from inserting into daily_summary
-- Create a SECURITY DEFINER wrapper that calls the existing update_daily_summary function
-- and update the trigger function to call the wrapper so inserts run with definer privileges.

BEGIN;

-- 1) Create secure wrapper
CREATE OR REPLACE FUNCTION public.update_daily_summary_secure(p_summary_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the existing function which executes the insert/update logic
  PERFORM public.update_daily_summary(p_summary_date);
END;
$$;

-- Grant execute on the secure wrapper to authenticated so triggers (which run as the caller)
-- can execute it and it will run with the privileges of the function owner (typically the DB admin)
GRANT EXECUTE ON FUNCTION public.update_daily_summary_secure(DATE) TO authenticated;

-- 2) Replace the trigger function to call the secure wrapper
CREATE OR REPLACE FUNCTION public.trigger_update_daily_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.update_daily_summary_secure(OLD.date);
    ELSE
        PERFORM public.update_daily_summary_secure(NEW.date);
    END IF;
    RETURN NULL;
END;
$$;

-- 3) Ensure triggers remain attached (recreate if needed) - creating them again is idempotent
-- Orders trigger
DROP TRIGGER IF EXISTS orders_summary_trigger ON public.orders;
CREATE TRIGGER orders_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_daily_summary();

-- Charging sessions trigger
DROP TRIGGER IF EXISTS charging_sessions_summary_trigger ON public.charging_sessions;
CREATE TRIGGER charging_sessions_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.charging_sessions
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_daily_summary();

-- Expenses trigger
DROP TRIGGER IF EXISTS expenses_summary_trigger ON public.expenses;
CREATE TRIGGER expenses_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_daily_summary();

-- Deposits trigger
DROP TRIGGER IF EXISTS deposits_summary_trigger ON public.deposits;
CREATE TRIGGER deposits_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_daily_summary();

-- Cooperative savings trigger
DROP TRIGGER IF EXISTS cooperative_savings_summary_trigger ON public.cooperative_savings;
CREATE TRIGGER cooperative_savings_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.cooperative_savings
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_daily_summary();

-- Withdrawals trigger
DROP TRIGGER IF EXISTS withdrawals_summary_trigger ON public.withdrawals;
CREATE TRIGGER withdrawals_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_daily_summary();

COMMIT;
