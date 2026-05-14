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

-- 4. process_new_loan
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
        WHEN 'cash' THEN 'cash_in_hand'
        WHEN 'bank transfer' THEN 'bank_balance'
        WHEN 'bank' THEN 'bank_balance'
        WHEN 'esewa' THEN 'esewa_balance'
        WHEN 'fonepay' THEN 'fonepay_balance'
        WHEN 'cooperative' THEN 'cooperative_balance'
        ELSE 'cash_in_hand'
    END;

    v_deposit_mode := CASE LOWER(p_payment_mode)
        WHEN 'cash' THEN 'cash'
        WHEN 'bank transfer' THEN 'bank'
        WHEN 'bank' THEN 'bank'
        WHEN 'esewa' THEN 'esewa'
        WHEN 'fonepay' THEN 'fonepay'
        ELSE 'cash'
    END;

    EXECUTE format('UPDATE public.balances SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE user_id = $2', v_column_name, v_column_name)
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

-- 5. Enhanced process_inventory_expense with Update support
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
                WHEN 'cash' THEN 'cash_in_hand'
                WHEN 'bank transfer' THEN 'bank_balance'
                WHEN 'bank' THEN 'bank_balance'
                WHEN 'esewa' THEN 'esewa_balance'
                WHEN 'fonepay' THEN 'fonepay_balance'
                WHEN 'cooperative' THEN 'cooperative_balance'
                ELSE 'cash_in_hand'
            END;
            EXECUTE format('UPDATE public.balances SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE user_id = $2', v_column_name, v_column_name)
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
        WHEN 'cash' THEN 'cash_in_hand'
        WHEN 'bank transfer' THEN 'bank_balance'
        WHEN 'bank' THEN 'bank_balance'
        WHEN 'esewa' THEN 'esewa_balance'
        WHEN 'fonepay' THEN 'fonepay_balance'
        WHEN 'cooperative' THEN 'cooperative_balance'
        ELSE 'cash_in_hand'
    END;

    EXECUTE format('UPDATE public.balances SET %I = COALESCE(%I, 0) - $1, updated_at = NOW() WHERE user_id = $2', v_column_name, v_column_name)
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

-- 6. update_daily_summary
DROP FUNCTION IF EXISTS public.update_daily_summary(date) CASCADE;

CREATE OR REPLACE FUNCTION public.update_daily_summary(summary_date date)
RETURNS void
LANGUAGE plpgsql
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
    FROM orders WHERE order_date = summary_date;

    SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total_amount ELSE 0 END), 0)
    INTO charging_total, charging_cash, charging_fonepay, charging_esewa
    FROM charging_sessions WHERE session_date = summary_date;

    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN amount ELSE 0 END), 0)
    INTO expenses_total, expenses_cash, expenses_fonepay, expenses_esewa
    FROM expenses WHERE expense_date = summary_date;

    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'fonepay' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'esewa' THEN amount ELSE 0 END), 0)
    INTO deposits_total, deposits_cash, deposits_fonepay, deposits_esewa
    FROM deposits WHERE deposit_date = summary_date;

    SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0)
    INTO withdrawals_total, withdrawals_cash
    FROM withdrawals WHERE withdrawal_date = summary_date;

    SELECT COALESCE(SUM(contribution_amount), 0)
    INTO cooperative_total
    FROM cooperative_savings WHERE contribution_date = summary_date;

    INSERT INTO balances (
        date, cash_balance, fonepay_balance, esewa_balance, bank_balance, cooperative_balance,
        total_income, total_expenses, net_balance, orders_total, charging_total, expenses_total,
        deposits_total, withdrawals_total, cooperative_total, created_at, updated_at
    ) VALUES (
        summary_date,
        (orders_cash + charging_cash - expenses_cash + deposits_cash + withdrawals_cash),
        (orders_fonepay + charging_fonepay - expenses_fonepay + deposits_fonepay),
        (orders_esewa + charging_esewa - expenses_esewa + deposits_esewa),
        (deposits_total - withdrawals_total),
        cooperative_total,
        (orders_total + charging_total + deposits_total),
        expenses_total,
        (orders_total + charging_total + deposits_total - expenses_total),
        orders_total, charging_total, expenses_total, deposits_total, withdrawals_total, cooperative_total,
        NOW(), NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
        cash_balance = EXCLUDED.cash_balance, fonepay_balance = EXCLUDED.fonepay_balance,
        esewa_balance = EXCLUDED.esewa_balance, bank_balance = EXCLUDED.bank_balance,
        cooperative_balance = EXCLUDED.cooperative_balance, total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses, net_balance = EXCLUDED.net_balance,
        orders_total = EXCLUDED.orders_total, charging_total = EXCLUDED.charging_total,
        expenses_total = EXCLUDED.expenses_total, deposits_total = EXCLUDED.deposits_total,
        withdrawals_total = EXCLUDED.withdrawals_total, cooperative_total = EXCLUDED.cooperative_total,
        updated_at = NOW();
END;
$$;
