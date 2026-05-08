-- Extend expenses table to support inventory purchases
-- Adding remarks column as it was missing from some migration paths
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS remarks text,
ADD COLUMN IF NOT EXISTS is_inventory_purchase boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quantity numeric(10,2),
ADD COLUMN IF NOT EXISTS unit text,
ADD COLUMN IF NOT EXISTS cost_per_unit numeric(10,2),
ADD COLUMN IF NOT EXISTS supplier text,
ADD COLUMN IF NOT EXISTS invoice_number text;

-- Ensure inventory_transactions table has the correct schema for references
-- This table was already created in 20250201000020, but we ensure it's compatible
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory_transactions') THEN
    CREATE TABLE public.inventory_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
      transaction_type text NOT NULL, -- 'stock_in', 'stock_out'
      quantity numeric NOT NULL,
      unit_cost numeric,
      total_cost numeric,
      reference_type text, -- 'expense', 'manual', 'adjustment'
      reference_id uuid, -- Reference to related record
      notes text,
      transaction_date date DEFAULT CURRENT_DATE,
      created_at timestamptz DEFAULT now(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
    );
  END IF;
END $$;

-- Create an RPC to handle inventory-linked expenses atomically
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
  p_invoice_number text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id uuid;
BEGIN
  -- 1. Insert the expense record
  INSERT INTO public.expenses (
    user_id,
    item_name, -- matches existing schema field
    description, -- matches existing schema field
    amount,
    category,
    payment_mode,
    remarks,
    expense_date,
    date, -- Synchronized with expense_date for summary triggers
    is_inventory_purchase,
    inventory_item_id,
    quantity,
    unit,
    cost_per_unit,
    supplier,
    invoice_number
  )
  VALUES (
    p_user_id,
    p_description,
    p_description,
    p_amount,
    p_category,
    p_payment_mode,
    p_remarks,
    p_expense_date,
    p_expense_date,
    p_is_inventory_purchase,
    p_inventory_item_id,
    p_quantity,
    p_unit,
    p_cost_per_unit,
    p_supplier,
    p_invoice_number
  )
  RETURNING id INTO v_expense_id;

  -- 2. If it's an inventory purchase, update stock and create transaction log
  IF p_is_inventory_purchase AND p_inventory_item_id IS NOT NULL THEN
    -- Update inventory quantity
    UPDATE public.inventory
    SET
      quantity = quantity + COALESCE(p_quantity, 0),
      updated_at = now()
    WHERE id = p_inventory_item_id;

    -- Create inventory transaction
    INSERT INTO public.inventory_transactions (
      user_id,
      inventory_id,
      transaction_type,
      quantity,
      unit_cost,
      total_cost,
      reference_type,
      reference_id,
      notes,
      transaction_date
    )
    VALUES (
      p_user_id,
      p_inventory_item_id,
      'stock_in', -- aligning with existing transaction types
      COALESCE(p_quantity, 0),
      p_cost_per_unit,
      p_amount,
      'expense',
      v_expense_id,
      'Purchase recorded via expense: ' || p_description,
      p_expense_date
    );
  END IF;

  RETURN v_expense_id;
END;
$$;
