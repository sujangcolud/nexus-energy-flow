-- Fix for Energy Palace Nexus: Column errors and Deletion issues
-- This migration addresses the 400 Bad Request error and missing column errors (amount, disbursement_method, etc.)
-- which were causing triggers to fail during standard operations and deletions.

-- 1. Ensure all transaction tables have required columns for accounting and compatibility
DO $$
BEGIN
    -- [Orders]
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'amount') THEN
        ALTER TABLE public.orders ADD COLUMN amount NUMERIC;
        UPDATE public.orders SET amount = total;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'date') THEN
        ALTER TABLE public.orders ADD COLUMN date DATE;
        UPDATE public.orders SET date = order_date;
    END IF;

    -- [Charging Sessions]
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'charging_sessions' AND column_name = 'amount') THEN
        ALTER TABLE public.charging_sessions ADD COLUMN amount NUMERIC;
        UPDATE public.charging_sessions SET amount = total_amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'charging_sessions' AND column_name = 'date') THEN
        ALTER TABLE public.charging_sessions ADD COLUMN date DATE;
        UPDATE public.charging_sessions SET date = session_date;
    END IF;

    -- [Staff Advances]
    -- Ensure table exists first if this runs early
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'staff_advances') THEN
        CREATE TABLE IF NOT EXISTS public.staff_advances (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
    END IF;
    -- Add columns one by one
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'amount') THEN
        ALTER TABLE public.staff_advances ADD COLUMN amount NUMERIC DEFAULT 0;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'amount_requested') THEN
            UPDATE public.staff_advances SET amount = COALESCE(amount_requested, 0);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'amount_disbursed') THEN
            UPDATE public.staff_advances SET amount = COALESCE(amount_disbursed, 0);
        END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'disbursement_method') THEN
        ALTER TABLE public.staff_advances ADD COLUMN disbursement_method TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'status') THEN
        ALTER TABLE public.staff_advances ADD COLUMN status TEXT DEFAULT 'Draft';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.staff_advances ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'withdrawal_date') THEN
        ALTER TABLE public.staff_advances ADD COLUMN withdrawal_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'transfer_date') THEN
        ALTER TABLE public.staff_advances ADD COLUMN transfer_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_advances' AND column_name = 'request_date') THEN
        ALTER TABLE public.staff_advances ADD COLUMN request_date DATE DEFAULT CURRENT_DATE;
    END IF;

    -- [Payroll Records]
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payroll_records') THEN
        CREATE TABLE IF NOT EXISTS public.payroll_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_records' AND column_name = 'net_salary') THEN
        ALTER TABLE public.payroll_records ADD COLUMN net_salary NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_records' AND column_name = 'payment_mode') THEN
        ALTER TABLE public.payroll_records ADD COLUMN payment_mode TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_records' AND column_name = 'payment_date') THEN
        ALTER TABLE public.payroll_records ADD COLUMN payment_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_records' AND column_name = 'status') THEN
        ALTER TABLE public.payroll_records ADD COLUMN status TEXT DEFAULT 'Draft';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_records' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.payroll_records ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Fix order_items foreign key to allow cascading deletes
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'order_items'
      AND kcu.column_name = 'order_id'
      AND tc.table_schema = 'public';

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Note: order_items_order_id_fkey fix encountered an issue: %', SQLERRM;
END $$;

-- 3. Robust update_daily_summary function
-- Correctly handles table-specific column names and accounting logic.
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
    -- Staff Advance & Payroll
    v_total_staff_advances NUMERIC;
    v_total_staff_advances_cash NUMERIC;
    v_total_staff_advances_bank NUMERIC;
    v_total_payroll NUMERIC;
    v_total_payroll_cash NUMERIC;
    v_total_payroll_bank NUMERIC;
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
    -- [1] Orders: use 'total' column
    SELECT
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN total ELSE 0 END), 0)
    INTO v_total_income_from_orders, v_total_income_fonepay_orders, v_total_income_esewa_orders, v_total_income_cash_orders
    FROM public.orders WHERE order_date = p_summary_date;

    -- [2] Charging: use 'total_amount' column
    SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN total_amount ELSE 0 END), 0)
    INTO v_total_income_from_charging, v_total_income_fonepay_charging, v_total_income_esewa_charging, v_total_income_cash_charging
    FROM public.charging_sessions WHERE session_date = p_summary_date;

    -- [3] Expenses: use 'amount' column
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN amount ELSE 0 END), 0)
    INTO v_total_expenses, v_total_expenses_cash, v_total_expenses_esewa, v_total_expenses_fonepay
    FROM public.expenses WHERE expense_date = p_summary_date;

    -- [4] Deposits: use 'amount' column
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode, 'bank')) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, mode, 'bank')) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0)
    INTO v_total_deposits, v_total_deposits_cash, v_total_deposits_esewa, v_total_deposits_from_cash
    FROM public.deposits WHERE deposit_date = p_summary_date;

    -- [5] Savings: use 'contribution_amount' column
    SELECT
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN contribution_amount ELSE 0 END), 0)
    INTO v_total_savings, v_total_savings_cash, v_total_savings_fonepay, v_total_savings_esewa
    FROM public.cooperative_savings WHERE contribution_date = p_summary_date;

    -- [6] Withdrawals: use 'amount' column
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(withdrawal_from, 'cooperative')) = 'cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(withdrawal_from, 'cooperative')) = 'bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0)
    INTO v_total_withdrawals, v_total_withdrawals_cooperative, v_total_withdrawals_bank, v_total_withdrawals_cash
    FROM public.withdrawals WHERE withdrawal_date = p_summary_date;

    -- [7] Staff Advances
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(disbursement_method) = 'cash withdrawal' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(disbursement_method) = 'bank transfer' THEN amount ELSE 0 END), 0)
    INTO v_total_staff_advances, v_total_staff_advances_cash, v_total_staff_advances_bank
    FROM public.staff_advances
    WHERE (withdrawal_date = p_summary_date OR transfer_date = p_summary_date OR request_date = p_summary_date)
      AND status = 'Disbursed'
      AND deleted_at IS NULL;

    -- [8] Payroll
    SELECT
        COALESCE(SUM(net_salary), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN net_salary ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'bank' THEN net_salary ELSE 0 END), 0)
    INTO v_total_payroll, v_total_payroll_cash, v_total_payroll_bank
    FROM public.payroll_records
    WHERE payment_date = p_summary_date
      AND status = 'Paid'
      AND deleted_at IS NULL;

    -- Aggregates
    v_total_income := v_total_income_from_orders + v_total_income_from_charging;
    v_total_cash_income := v_total_income_cash_orders + v_total_income_cash_charging;
    v_total_fonepay_income := v_total_income_fonepay_orders + v_total_income_fonepay_charging;
    v_total_esewa_income := v_total_income_esewa_orders + v_total_income_esewa_charging;

    -- Ledger Balances
    v_cash_balance := (v_total_cash_income + v_total_deposits_cash)
                    - (v_total_expenses_cash + v_total_savings_cash + v_total_withdrawals_cash + v_total_deposits_from_cash + v_total_staff_advances_cash + v_total_payroll_cash);

    v_esewa_balance := (v_total_esewa_income + v_total_deposits_esewa)
                     - (v_total_expenses_esewa + v_total_savings_esewa);

    v_fonepay_balance := (v_total_fonepay_income)
                       - (v_total_expenses_fonepay + v_total_savings_fonepay);

    v_cooperative_balance := v_total_savings - v_total_withdrawals_cooperative;
    v_total_balance := v_cash_balance + v_fonepay_balance + v_cooperative_balance + v_esewa_balance;

    v_system_cash_calc := (v_total_income_cash_orders + v_total_income_cash_charging + v_total_deposits_cash)
                        - (v_total_expenses_cash + v_total_savings_cash + v_total_withdrawals_cash + v_total_deposits_from_cash + v_total_staff_advances_cash + v_total_payroll_cash);

    -- Insert/Update
    INSERT INTO public.daily_summary (
        summary_date, total_income_from_orders, total_income_from_orders_cash, total_income_from_orders_esewa, total_income_from_orders_fonepay,
        total_income_from_charging, total_income_from_charging_cash, total_income_from_charging_esewa, total_income_from_charging_fonepay,
        total_income_fonepay, total_income_esewa, total_income_cash, total_expenses, total_expenses_cash, total_expenses_esewa, total_expenses_fonepay,
        total_deposits, total_deposits_cash, total_deposits_esewa, total_deposits_from_cash, total_savings, total_savings_cash, total_savings_fonepay, total_savings_esewa,
        total_withdrawals, total_withdrawals_cooperative, total_withdrawals_bank, total_withdrawals_cash,
        total_staff_advances_disbursed, total_staff_advances_cash, total_staff_advances_bank, total_payroll_paid, total_payroll_cash, total_payroll_bank,
        total_income, total_cash_income, total_fonepay_income, total_esewa_income, cash_balance, esewa_balance, fonepay_balance, cooperative_balance, total_balance, system_cash_calculation
    ) VALUES (
        p_summary_date, v_total_income_from_orders, v_total_income_cash_orders, v_total_income_esewa_orders, v_total_income_fonepay_orders,
        v_total_income_from_charging, v_total_income_cash_charging, v_total_income_esewa_charging, v_total_income_fonepay_charging,
        v_total_fonepay_income, v_total_esewa_income, v_total_cash_income, v_total_expenses, v_total_expenses_cash, v_total_expenses_esewa, v_total_expenses_fonepay,
        v_total_deposits, v_total_deposits_cash, v_total_deposits_esewa, v_total_deposits_from_cash, v_total_savings, v_total_savings_cash, v_total_savings_fonepay, v_total_savings_esewa,
        v_total_withdrawals, v_total_withdrawals_cooperative, v_total_withdrawals_bank, v_total_withdrawals_cash,
        v_total_staff_advances, v_total_staff_advances_cash, v_total_staff_advances_bank, v_total_payroll, v_total_payroll_cash, v_total_payroll_bank,
        v_total_income, v_total_cash_income, v_total_fonepay_income, v_total_esewa_income, v_cash_balance, v_esewa_balance, v_fonepay_balance, v_cooperative_balance, v_total_balance, v_system_cash_calc
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
        total_staff_advances_disbursed = EXCLUDED.total_staff_advances_disbursed,
        total_staff_advances_cash = EXCLUDED.total_staff_advances_cash,
        total_staff_advances_bank = EXCLUDED.total_staff_advances_bank,
        total_payroll_paid = EXCLUDED.total_payroll_paid,
        total_payroll_cash = EXCLUDED.total_payroll_cash,
        total_payroll_bank = EXCLUDED.total_payroll_bank,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix trigger_update_daily_summary to handle deletions correctly
CREATE OR REPLACE FUNCTION public.trigger_update_daily_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date DATE;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF (TG_TABLE_NAME = 'orders') THEN v_date := NEW.order_date;
        ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_date := NEW.session_date;
        ELSIF (TG_TABLE_NAME = 'expenses') THEN v_date := NEW.expense_date;
        ELSIF (TG_TABLE_NAME = 'deposits') THEN v_date := NEW.deposit_date;
        ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_date := NEW.withdrawal_date;
        ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_date := NEW.contribution_date;
        ELSE
            -- Fallback
            v_date := CURRENT_DATE;
        END IF;

        IF v_date IS NOT NULL THEN PERFORM public.update_daily_summary(v_date); END IF;

        IF TG_OP = 'UPDATE' THEN
            DECLARE v_old_date DATE;
            BEGIN
                IF (TG_TABLE_NAME = 'orders') THEN v_old_date := OLD.order_date;
                ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_old_date := OLD.session_date;
                ELSIF (TG_TABLE_NAME = 'expenses') THEN v_old_date := OLD.expense_date;
                ELSIF (TG_TABLE_NAME = 'deposits') THEN v_old_date := OLD.deposit_date;
                ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_old_date := OLD.withdrawal_date;
                ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_old_date := OLD.contribution_date;
                END IF;

                IF v_old_date IS NOT NULL AND v_old_date IS DISTINCT FROM v_date THEN
                    PERFORM public.update_daily_summary(v_old_date);
                END IF;
            END;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF (TG_TABLE_NAME = 'orders') THEN v_date := OLD.order_date;
        ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_date := OLD.session_date;
        ELSIF (TG_TABLE_NAME = 'expenses') THEN v_date := OLD.expense_date;
        ELSIF (TG_TABLE_NAME = 'deposits') THEN v_date := OLD.deposit_date;
        ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_date := OLD.withdrawal_date;
        ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_date := OLD.contribution_date;
        END IF;

        IF v_date IS NOT NULL THEN PERFORM public.update_daily_summary(v_date); END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 5. Cleanup function for dependencies
CREATE OR REPLACE FUNCTION public.cleanup_transaction_dependencies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Inventory movements
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory_movements' AND schemaname = 'public') THEN
        DELETE FROM public.inventory_movements WHERE reference_id = OLD.id;
    END IF;
    -- Record attachments
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'record_attachments' AND schemaname = 'public') THEN
        DELETE FROM public.record_attachments WHERE record_id = OLD.id;
    END IF;
    RETURN OLD;
END;
$$;

-- 6. Apply cleanup and summary triggers to primary tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT UNNEST(ARRAY['orders', 'expenses', 'expense_bookings', 'deposits', 'withdrawals', 'cooperative_savings', 'charging_sessions']) LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl AND schemaname = 'public') THEN
            -- Cleanup
            EXECUTE format('DROP TRIGGER IF EXISTS tr_cleanup_dependencies ON public.%I', tbl);
            EXECUTE format('CREATE TRIGGER tr_cleanup_dependencies AFTER DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.cleanup_transaction_dependencies()', tbl);

            -- Summary
            IF tbl != 'expense_bookings' THEN
                EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_daily_summary ON public.%I', tbl);
                EXECUTE format('CREATE TRIGGER trigger_update_daily_summary AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trigger_update_daily_summary()', tbl);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 7. Cleanup Staff Management dependencies
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT UNNEST(ARRAY['staff_advances', 'payroll_records', 'advance_settlements', 'employee_overtime']) LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl AND schemaname = 'public') THEN
            EXECUTE format('DROP TRIGGER IF EXISTS tr_cleanup_dependencies ON public.%I', tbl);
            EXECUTE format('CREATE TRIGGER tr_cleanup_dependencies AFTER DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.cleanup_transaction_dependencies()', tbl);
        END IF;
    END LOOP;
END $$;

-- 8. Recreate insert_order_safe
DROP FUNCTION IF EXISTS public.insert_order_safe(uuid, text, integer, numeric, numeric, text, date);
CREATE OR REPLACE FUNCTION public.insert_order_safe(
  p_user_id uuid, p_item_name text, p_quantity integer, p_rate numeric, p_total numeric, p_payment_mode text, p_order_date date
)
RETURNS TABLE(
  id uuid, user_id uuid, item_name text, quantity integer, rate numeric, total numeric, payment_mode text, order_date date, date date, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_order_id uuid;
BEGIN
  INSERT INTO public.orders (user_id, item_name, quantity, rate, total, payment_mode, order_date, date)
  VALUES (p_user_id, p_item_name, p_quantity, p_rate, p_total, p_payment_mode, p_order_date, p_order_date)
  RETURNING orders.id INTO new_order_id;

  RETURN QUERY SELECT o.id, o.user_id, o.item_name, o.quantity, o.rate, o.total, o.payment_mode, o.order_date, o.date, o.created_at
  FROM public.orders o WHERE o.id = new_order_id;
END;
$$;

-- 9. Cleanup legacy triggers
DROP TRIGGER IF EXISTS update_balances_on_order ON public.orders;
DROP TRIGGER IF EXISTS log_order_changes ON public.orders;
DROP TRIGGER IF EXISTS validate_order_data ON public.orders;
DROP TRIGGER IF EXISTS update_order_totals ON public.orders;

-- 10. Force reload
NOTIFY pgrst, 'reload schema';
