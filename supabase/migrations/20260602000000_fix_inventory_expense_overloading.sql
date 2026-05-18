-- FIX 2: Resolve function overloading issue
-- Drop the ambiguous function and recreate with unique signature

DROP FUNCTION IF EXISTS public.process_inventory_expense(
  uuid, text, numeric, text, text, text, date, boolean, uuid, numeric, text, numeric, text, text, numeric, boolean, uuid
);

-- Recreate with explicit parameter names to avoid ambiguity
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
  p_id uuid DEFAULT NULL
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
BEGIN
  -- 1. Handle Update/Reversal
  IF p_id IS NOT NULL THEN
    -- Check expenses
    SELECT amount, payment_mode, is_credit INTO v_old_amount, v_old_payment_mode, v_old_was_credit
    FROM public.expenses WHERE id = p_id;

    IF NOT FOUND THEN
        -- Check expense_bookings
        SELECT amount, payment_mode, true INTO v_old_amount, v_old_payment_mode, v_old_was_credit
        FROM public.expense_bookings WHERE id = p_id;

        IF FOUND THEN
            DELETE FROM public.expense_bookings WHERE id = p_id;
        END IF;
    ELSE
        DELETE FROM public.expenses WHERE id = p_id;
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
    DELETE FROM public.inventory_movements WHERE reference_id = p_id;
  END IF;

  -- 2. Inventory Calculations
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

  -- 3. Insert Record
  IF p_is_credit THEN
    INSERT INTO public.expense_bookings (
      id, user_id, description, amount, category, payment_mode, remarks, booking_date, payment_date,
      is_inventory_purchase, inventory_item_id, quantity, unit, cost_per_unit, supplier, invoice_number,
      status
    )
    VALUES (
      COALESCE(p_id, gen_random_uuid()), p_user_id, p_description, p_amount, p_category, p_payment_mode, p_remarks, p_expense_date, p_expense_date,
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
