
-- Fix trigger_update_daily_summary to handle date changes during updates
-- This ensures that if a transaction's date is changed, both the old and new dates' summaries are refreshed.

CREATE OR REPLACE FUNCTION public.trigger_update_daily_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_date DATE;
    v_old_date DATE;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF (TG_TABLE_NAME = 'orders') THEN v_new_date := NEW.order_date;
        ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_new_date := NEW.session_date;
        ELSIF (TG_TABLE_NAME = 'expenses') THEN v_new_date := NEW.expense_date;
        ELSIF (TG_TABLE_NAME = 'deposits') THEN v_new_date := NEW.deposit_date;
        ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_new_date := NEW.withdrawal_date;
        ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_new_date := NEW.contribution_date;
        ELSE v_new_date := NEW.date;
        END IF;

        PERFORM update_daily_summary(v_new_date);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Get new date
        IF (TG_TABLE_NAME = 'orders') THEN v_new_date := NEW.order_date;
        ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_new_date := NEW.session_date;
        ELSIF (TG_TABLE_NAME = 'expenses') THEN v_new_date := NEW.expense_date;
        ELSIF (TG_TABLE_NAME = 'deposits') THEN v_new_date := NEW.deposit_date;
        ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_new_date := NEW.withdrawal_date;
        ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_new_date := NEW.contribution_date;
        ELSE v_new_date := NEW.date;
        END IF;

        -- Get old date
        IF (TG_TABLE_NAME = 'orders') THEN v_old_date := OLD.order_date;
        ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_old_date := OLD.session_date;
        ELSIF (TG_TABLE_NAME = 'expenses') THEN v_old_date := OLD.expense_date;
        ELSIF (TG_TABLE_NAME = 'deposits') THEN v_old_date := OLD.deposit_date;
        ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_old_date := OLD.withdrawal_date;
        ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_old_date := OLD.contribution_date;
        ELSE v_old_date := OLD.date;
        END IF;

        PERFORM update_daily_summary(v_new_date);

        -- If date has changed, also update the old date's summary
        IF v_old_date IS DISTINCT FROM v_new_date THEN
            PERFORM update_daily_summary(v_old_date);
        END IF;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF (TG_TABLE_NAME = 'orders') THEN v_old_date := OLD.order_date;
        ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_old_date := OLD.session_date;
        ELSIF (TG_TABLE_NAME = 'expenses') THEN v_old_date := OLD.expense_date;
        ELSIF (TG_TABLE_NAME = 'deposits') THEN v_old_date := OLD.deposit_date;
        ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_old_date := OLD.withdrawal_date;
        ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_old_date := OLD.contribution_date;
        ELSE v_old_date := OLD.date;
        END IF;

        PERFORM update_daily_summary(v_old_date);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;
