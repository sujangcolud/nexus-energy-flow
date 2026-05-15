-- Enhanced migration to support updating expenses and expense bookings via the same RPC
-- Handles balance reversal and re-calculation correctly.

-- 1. Withdrawals: Add source_cooperative
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='source_cooperative') THEN
        ALTER TABLE public.withdrawals ADD COLUMN source_cooperative TEXT;
    END IF;
END $$;

-- 2. Expenses: Add is_credit
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='is_credit') THEN
        ALTER TABLE public.expenses ADD COLUMN is_credit BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Expense Bookings: Add inventory and detail fields
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='is_inventory_purchase') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN is_inventory_purchase BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='inventory_item_id') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN inventory_item_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='quantity') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN quantity NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='unit') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN unit TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='cost_per_unit') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN cost_per_unit NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='supplier') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN supplier TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='invoice_number') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN invoice_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='party_name') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN party_name TEXT;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='expense_name') THEN
            UPDATE public.expense_bookings SET party_name = expense_name;
        END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='remarks') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN remarks TEXT;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='notes') THEN
            UPDATE public.expense_bookings SET remarks = notes;
        END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='payment_mode') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN payment_mode TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='booking_date') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN booking_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='status') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;
-- 1. Correct the process_inventory_expense function to use proper balances columns
CREATE OR REPLACE FUNCTION public.process_inventory_expense(
  p_user_id uuid,
  p_description text,
  p_amount numeric,
  p_category text,
  p_payment_mode text,
  p_remarks text,
  p_expense_date date,
  p_is_inventory_purchase boolean DEFAULT false,
  p_inventory_item_id uuid DEFAULT NULL,
  p_quantity numeric DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_cost_per_unit numeric DEFAULT NULL,
  p_supplier text DEFAULT NULL,
  p_invoice_number text DEFAULT NULL,
  p_manual_conversion_factor numeric DEFAULT NULL,
  p_is_credit boolean DEFAULT false,
  p_id uuid DEFAULT NULL  -- New parameter for updates
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id uuid;
  v_base_qty numeric;
  v_unit_cost_base numeric;
  v_column_name text;
  v_old_amount numeric;
  v_old_payment_mode text;
  v_old_was_credit boolean;
  v_old_was_inventory boolean;
BEGIN
  -- 1. IF UPDATING: Handle Reversal
  IF p_id IS NOT NULL THEN
    -- Try to find in expenses first
    SELECT amount, payment_mode, is_credit, is_inventory_purchase
    INTO v_old_amount, v_old_payment_mode, v_old_was_credit, v_old_was_inventory
    FROM public.expenses WHERE id = p_id;

    IF NOT FOUND THEN
        -- Check expense_bookings
        SELECT amount, payment_mode, true, is_inventory_purchase
        INTO v_old_amount, v_old_payment_mode, v_old_was_credit, v_old_was_inventory
        FROM public.expense_bookings WHERE id = p_id;

        IF FOUND THEN
            DELETE FROM public.expense_bookings WHERE id = p_id;
        END IF;
    ELSE
        DELETE FROM public.expenses WHERE id = p_id;

        -- Reverse balance only if it wasn't credit
        IF NOT COALESCE(v_old_was_credit, false) THEN
            v_column_name := CASE LOWER(v_old_payment_mode)
                WHEN 'cash' THEN 'cash_balance'
                WHEN 'bank transfer' THEN 'bank_balance'
                WHEN 'bank' THEN 'bank_balance'
                WHEN 'esewa' THEN 'esewa_balance'
                WHEN 'fonepay' THEN 'fonepay_balance'
                WHEN 'cooperative' THEN 'cooperative_balance'
                ELSE 'cash_balance'
            END;
            EXECUTE format('UPDATE public.balances SET %I = COALESCE(%I, 0) + $1, last_updated = NOW() WHERE user_id = $2', v_column_name, v_column_name)
            USING v_old_amount, p_user_id;
        END IF;
    END IF;

    -- Clear related inventory movements (they are auto-deleted if referenced but good to be explicit or ensure trigger handles it)
    DELETE FROM public.inventory_movements WHERE (reference_type = 'expense' OR reference_type = 'expense_booking') AND reference_id = p_id;
  END IF;

  -- 2. Calculate Inventory Fields
  IF p_is_inventory_purchase AND p_inventory_item_id IS NOT NULL THEN
    IF p_manual_conversion_factor IS NOT NULL THEN
        v_base_qty := p_quantity * p_manual_conversion_factor;
    ELSE
        v_base_qty := public.calculate_base_quantity(p_inventory_item_id, p_unit, p_quantity);
    END IF;

    IF v_base_qty > 0 THEN v_unit_cost_base := p_amount / v_base_qty; ELSE v_unit_cost_base := 0; END IF;
  ELSE
    v_base_qty := NULL; v_unit_cost_base := NULL;
  END IF;

  -- 3. Insert New/Updated Record
  IF p_is_credit THEN
    INSERT INTO public.expense_bookings (
      id, user_id, party_name, amount, category, payment_mode, remarks, booking_date, payment_date,
      is_inventory_purchase, inventory_item_id, quantity, unit, cost_per_unit, supplier, invoice_number,
      status
    )
    VALUES (
      COALESCE(p_id, gen_random_uuid()), p_user_id, COALESCE(p_supplier, p_description), p_amount, p_category, p_payment_mode, p_remarks, p_expense_date, p_expense_date,
      p_is_inventory_purchase, p_inventory_item_id, p_quantity, p_unit, p_cost_per_unit, p_supplier, p_invoice_number,
      'pending'
    )
    RETURNING id INTO v_record_id;
  ELSE
    INSERT INTO public.expenses (
      id, user_id, description, amount, category, payment_mode, remarks, expense_date, date,
      is_inventory_purchase, inventory_item_id, quantity, unit, purchase_unit,
      converted_base_quantity, cost_per_unit, supplier, invoice_number, is_credit
    )
    VALUES (
      COALESCE(p_id, gen_random_uuid()), p_user_id, p_description, p_amount, p_category, p_payment_mode, p_remarks, p_expense_date, p_expense_date,
      p_is_inventory_purchase, p_inventory_item_id, p_quantity, p_unit, p_unit,
      v_base_qty, p_cost_per_unit, p_supplier, p_invoice_number, false
    )
    RETURNING id INTO v_record_id;

    v_column_name := CASE LOWER(p_payment_mode)
        WHEN 'cash' THEN 'cash_balance'
        WHEN 'bank transfer' THEN 'bank_balance'
        WHEN 'bank' THEN 'bank_balance'
        WHEN 'esewa' THEN 'esewa_balance'
        WHEN 'fonepay' THEN 'fonepay_balance'
        WHEN 'cooperative' THEN 'cooperative_balance'
        ELSE 'cash_balance'
    END;

    EXECUTE format('UPDATE public.balances SET %I = COALESCE(%I, 0) - $1, last_updated = NOW() WHERE user_id = $2', v_column_name, v_column_name)
    USING p_amount, p_user_id;
  END IF;

  -- 4. Update Inventory
  IF p_is_inventory_purchase AND p_inventory_item_id IS NOT NULL THEN
    INSERT INTO public.inventory_movements (
      user_id, inventory_item_id, movement_type, reference_type, reference_id,
      quantity_base, unit_cost_base, created_at
    )
    VALUES (
      p_user_id, p_inventory_item_id, 'purchase', CASE WHEN p_is_credit THEN 'expense_booking' ELSE 'expense' END, v_record_id,
      COALESCE(v_base_qty, 0), COALESCE(v_unit_cost_base, 0), p_expense_date
    );

    UPDATE public.inventory SET supplier = COALESCE(p_supplier, supplier), updated_at = now() WHERE id = p_inventory_item_id;
  END IF;

  RETURN v_record_id;
END;
$$;
-- 2. Correct update_daily_summary to use daily_summary table
-- Fix the "column reference 'summary_date' is ambiguous" error by renaming the parameter
CREATE OR REPLACE FUNCTION public.update_daily_summary(p_summary_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    orders_total numeric := 0;
    orders_cash numeric := 0;
    orders_fonepay numeric := 0;
    orders_esewa numeric := 0;
    charging_total numeric := 0;
    charging_cash numeric := 0;
    charging_fonepay numeric := 0;
    charging_esewa numeric := 0;
    expenses_total numeric := 0;
    expenses_cash numeric := 0;
    expenses_fonepay numeric := 0;
    expenses_esewa numeric := 0;
    deposits_total numeric := 0;
    deposits_cash numeric := 0;
    deposits_fonepay numeric := 0;
    deposits_esewa numeric := 0;
    withdrawals_total numeric := 0;
    withdrawals_cash numeric := 0;
    cooperative_total numeric := 0;
BEGIN
    SELECT
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total ELSE 0 END), 0)
    INTO orders_total, orders_cash, orders_fonepay, orders_esewa
    FROM orders WHERE order_date = p_summary_date;

    SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total_amount ELSE 0 END), 0)
    INTO charging_total, charging_cash, charging_fonepay, charging_esewa
    FROM charging_sessions WHERE session_date = p_summary_date;

    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN amount ELSE 0 END), 0)
    INTO expenses_total, expenses_cash, expenses_fonepay, expenses_esewa
    FROM expenses WHERE expense_date = p_summary_date;

    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'fonepay' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'esewa' THEN amount ELSE 0 END), 0)
    INTO deposits_total, deposits_cash, deposits_fonepay, deposits_esewa
    FROM deposits WHERE deposit_date = p_summary_date;

    SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0)
    INTO withdrawals_total, withdrawals_cash
    FROM withdrawals WHERE withdrawal_date = p_summary_date;

    SELECT COALESCE(SUM(contribution_amount), 0)
    INTO cooperative_total
    FROM cooperative_savings WHERE contribution_date = p_summary_date;

    INSERT INTO daily_summary (
        summary_date, cash_balance, fonepay_balance, esewa_balance, cooperative_balance,
        total_income, total_expenses, total_balance, total_income_from_orders, total_income_from_charging, expenses_total,
        total_deposits, total_withdrawals, total_savings, updated_at
    ) VALUES (
        p_summary_date,
        (orders_cash + charging_cash - expenses_cash + deposits_cash + withdrawals_cash),
        (orders_fonepay + charging_fonepay - expenses_fonepay + deposits_fonepay),
        (orders_esewa + charging_esewa - expenses_esewa + deposits_esewa),
        cooperative_total,
        (orders_total + charging_total + deposits_total),
        expenses_total,
        (orders_total + charging_total + deposits_total - expenses_total),
        orders_total, charging_total, expenses_total, deposits_total, withdrawals_total, cooperative_total,
        NOW()
    )
    ON CONFLICT (summary_date) DO UPDATE SET
        cash_balance = EXCLUDED.cash_balance, fonepay_balance = EXCLUDED.fonepay_balance,
        esewa_balance = EXCLUDED.esewa_balance,
        cooperative_balance = EXCLUDED.cooperative_balance, total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses, total_balance = EXCLUDED.total_balance,
        total_income_from_orders = EXCLUDED.total_income_from_orders, total_income_from_charging = EXCLUDED.total_income_from_charging,
        expenses_total = EXCLUDED.expenses_total, total_deposits = EXCLUDED.total_deposits,
        total_withdrawals = EXCLUDED.total_withdrawals, total_savings = EXCLUDED.total_savings,
        updated_at = NOW();
END;
CREATE OR REPLACE FUNCTION public.trigger_update_daily_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date DATE;
BEGIN
    -- Determine the date to update
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Try different date column names
        IF (TG_TABLE_NAME = 'orders') THEN v_date := NEW.order_date;
        ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_date := NEW.session_date;
        ELSIF (TG_TABLE_NAME = 'expenses') THEN v_date := NEW.expense_date;
        ELSIF (TG_TABLE_NAME = 'deposits') THEN v_date := NEW.deposit_date;
        ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_date := NEW.withdrawal_date;
        ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_date := NEW.contribution_date;
        ELSE v_date := NEW.date;
        END IF;

        PERFORM update_daily_summary(v_date);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF (TG_TABLE_NAME = 'orders') THEN v_date := OLD.order_date;
        ELSIF (TG_TABLE_NAME = 'charging_sessions') THEN v_date := OLD.session_date;
        ELSIF (TG_TABLE_NAME = 'expenses') THEN v_date := OLD.expense_date;
        ELSIF (TG_TABLE_NAME = 'deposits') THEN v_date := OLD.deposit_date;
        ELSIF (TG_TABLE_NAME = 'withdrawals') THEN v_date := OLD.withdrawal_date;
        ELSIF (TG_TABLE_NAME = 'cooperative_savings') THEN v_date := OLD.contribution_date;
        ELSE v_date := OLD.date;
        END IF;

        PERFORM update_daily_summary(v_date);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 4. Fix process_new_loan to use correct balance columns
CREATE OR REPLACE FUNCTION public.process_new_loan(
    p_user_id UUID,
    p_loan_name TEXT,
    p_lender_name TEXT,
    p_loan_type loan_type,
    p_principal_amount DECIMAL,
    p_interest_rate DECIMAL,
    p_repayment_frequency repayment_frequency,
    p_loan_date DATE,
    p_maturity_date DATE,
    p_payment_mode TEXT,
    p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_loan_id UUID;
    v_column_name TEXT;
    v_deposit_mode TEXT;
BEGIN
    INSERT INTO public.loans (
        user_id, loan_name, lender_name, loan_type, principal_amount,
        interest_rate, repayment_frequency, loan_date, maturity_date,
        payment_mode, description
    ) VALUES (
        p_user_id, p_loan_name, p_lender_name, p_loan_type, p_principal_amount,
        p_interest_rate, p_repayment_frequency, p_loan_date, p_maturity_date,
        p_payment_mode, p_description
    ) RETURNING id INTO v_loan_id;

    v_column_name := CASE LOWER(p_payment_mode)
        WHEN 'cash' THEN 'cash_balance'
        WHEN 'bank transfer' THEN 'bank_balance'
        WHEN 'bank' THEN 'bank_balance'
        WHEN 'esewa' THEN 'esewa_balance'
        WHEN 'fonepay' THEN 'fonepay_balance'
        WHEN 'cooperative' THEN 'cooperative_balance'
        ELSE 'cash_balance'
    END;

    v_deposit_mode := CASE LOWER(p_payment_mode)
        WHEN 'cash' THEN 'cash'
        WHEN 'bank transfer' THEN 'bank'
        WHEN 'bank' THEN 'bank'
        WHEN 'esewa' THEN 'esewa'
        WHEN 'fonepay' THEN 'fonepay'
        ELSE 'cash'
    END;

    EXECUTE format('UPDATE public.balances SET %I = COALESCE(%I, 0) + $1, last_updated = NOW() WHERE user_id = $2', v_column_name, v_column_name)
    USING p_principal_amount, p_user_id;

    INSERT INTO public.deposits (
        user_id, amount, mode, description, deposit_date, date
    ) VALUES (
        p_user_id, p_principal_amount, v_deposit_mode,
        'Income from loan: ' || p_loan_name || COALESCE('. ' || p_description, ''),
        p_loan_date, p_loan_date
    );

    INSERT INTO public.logs (user_id, action, table_name, record_id, details)
    VALUES (p_user_id, 'new_loan', 'loans', v_loan_id, jsonb_build_object(
        'loan_name', p_loan_name, 'amount', p_principal_amount, 'payment_mode', p_payment_mode
    ));

    RETURN v_loan_id;
END;
$$;

-- 5. Fix process_loan_repayment to use correct balance columns
CREATE OR REPLACE FUNCTION public.process_loan_repayment(
    p_loan_id UUID,
    p_user_id UUID,
    p_amount_paid DECIMAL,
    p_principal_paid DECIMAL,
    p_interest_paid DECIMAL,
    p_repayment_date DATE,
    p_payment_mode TEXT,
    p_remarks TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_repayment_id UUID;
    v_column_name TEXT;
BEGIN
    -- Insert the repayment record
    INSERT INTO public.loan_repayments (
        loan_id,
        user_id,
        amount_paid,
        principal_paid,
        interest_paid,
        repayment_date,
        payment_mode,
        remarks
    ) VALUES (
        p_loan_id,
        p_user_id,
        p_amount_paid,
        p_principal_paid,
        p_interest_paid,
        p_repayment_date,
        p_payment_mode,
        p_remarks
    ) RETURNING id INTO v_repayment_id;

    -- Map payment mode to balance column
    v_column_name := CASE LOWER(p_payment_mode)
        WHEN 'cash' THEN 'cash_balance'
        WHEN 'bank transfer' THEN 'bank_balance'
        WHEN 'esewa' THEN 'esewa_balance'
        WHEN 'fonepay' THEN 'fonepay_balance'
        WHEN 'cooperative' THEN 'cooperative_balance'
        ELSE 'cash_balance'
    END;

    -- Update user balances (decrease balance because it's a repayment/outflow)
    EXECUTE format('UPDATE public.balances SET %I = COALESCE(%I, 0) - $1, last_updated = NOW() WHERE user_id = $2', v_column_name, v_column_name)
    USING p_amount_paid, p_user_id;

    -- Log the action
    INSERT INTO public.logs (user_id, action, table_name, record_id, details)
    VALUES (p_user_id, 'loan_repayment', 'loan_repayments', v_repayment_id, jsonb_build_object(
        'loan_id', p_loan_id,
        'amount', p_amount_paid,
        'principal', p_principal_paid,
        'interest', p_interest_paid
    ));

    RETURN v_repayment_id;
END;
$$;

-- 6. Ensure balances table has correct columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='balances' AND column_name='cash_balance') THEN
        ALTER TABLE public.balances ADD COLUMN cash_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='balances' AND column_name='bank_balance') THEN
        ALTER TABLE public.balances ADD COLUMN bank_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='balances' AND column_name='esewa_balance') THEN
        ALTER TABLE public.balances ADD COLUMN esewa_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='balances' AND column_name='fonepay_balance') THEN
        ALTER TABLE public.balances ADD COLUMN fonepay_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='balances' AND column_name='cooperative_balance') THEN
        ALTER TABLE public.balances ADD COLUMN cooperative_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='balances' AND column_name='last_updated') THEN
        ALTER TABLE public.balances ADD COLUMN last_updated TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 7. Ensure daily_summary table has correct columns
DO $$
BEGIN
    -- Add missing columns to daily_summary if any
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='total_income') THEN
        ALTER TABLE public.daily_summary ADD COLUMN total_income NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='total_expenses') THEN
        ALTER TABLE public.daily_summary ADD COLUMN total_expenses NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='total_balance') THEN
        ALTER TABLE public.daily_summary ADD COLUMN total_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='cash_balance') THEN
        ALTER TABLE public.daily_summary ADD COLUMN cash_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='fonepay_balance') THEN
        ALTER TABLE public.daily_summary ADD COLUMN fonepay_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='esewa_balance') THEN
        ALTER TABLE public.daily_summary ADD COLUMN esewa_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='cooperative_balance') THEN
        ALTER TABLE public.daily_summary ADD COLUMN cooperative_balance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='total_income_from_orders') THEN
        ALTER TABLE public.daily_summary ADD COLUMN total_income_from_orders NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='total_income_from_charging') THEN
        ALTER TABLE public.daily_summary ADD COLUMN total_income_from_charging NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='expenses_total') THEN
        ALTER TABLE public.daily_summary ADD COLUMN expenses_total NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='total_deposits') THEN
        ALTER TABLE public.daily_summary ADD COLUMN total_deposits NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='total_withdrawals') THEN
        ALTER TABLE public.daily_summary ADD COLUMN total_withdrawals NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_summary' AND column_name='total_savings') THEN
        ALTER TABLE public.daily_summary ADD COLUMN total_savings NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 8. Clean up any misplaced trigger on balances table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_daily_summary_balances') THEN
        DROP TRIGGER IF EXISTS trigger_update_daily_summary_balances ON public.balances;
    END IF;
END $$;
