-- Consolidated Migration for Expenses & Inventory Integration

-- 1. Extend expenses table
DO $$
BEGIN
    -- remarks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='remarks') THEN
        ALTER TABLE public.expenses ADD COLUMN remarks text;
    END IF;
    -- is_inventory_purchase
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='is_inventory_purchase') THEN
        ALTER TABLE public.expenses ADD COLUMN is_inventory_purchase boolean DEFAULT false;
    END IF;
    -- inventory_item_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='inventory_item_id') THEN
        ALTER TABLE public.expenses ADD COLUMN inventory_item_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL;
    END IF;
    -- quantity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='quantity') THEN
        ALTER TABLE public.expenses ADD COLUMN quantity numeric(10,2);
    END IF;
    -- unit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='unit') THEN
        ALTER TABLE public.expenses ADD COLUMN unit text;
    END IF;
    -- cost_per_unit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='cost_per_unit') THEN
        ALTER TABLE public.expenses ADD COLUMN cost_per_unit numeric(10,2);
    END IF;
    -- supplier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='supplier') THEN
        ALTER TABLE public.expenses ADD COLUMN supplier text;
    END IF;
    -- invoice_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='invoice_number') THEN
        ALTER TABLE public.expenses ADD COLUMN invoice_number text;
    END IF;
END $$;

-- 2. Ensure inventory_transactions table exists
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

-- 3. Create RPC function
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
  INSERT INTO public.expenses (
    user_id,
    item_name,
    description,
    amount,
    category,
    payment_mode,
    remarks,
    expense_date,
    date,
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

  IF p_is_inventory_purchase AND p_inventory_item_id IS NOT NULL THEN
    UPDATE public.inventory
    SET
      quantity = quantity + COALESCE(p_quantity, 0),
      updated_at = now()
    WHERE id = p_inventory_item_id;

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
      'stock_in',
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

-- 4. Create reporting views
DROP VIEW IF EXISTS public.inventory_purchase_history;
CREATE OR REPLACE VIEW public.inventory_purchase_history AS
SELECT
    e.expense_date,
    e.item_name as expense_description,
    i.item_name as inventory_item_name,
    e.quantity,
    e.unit,
    e.cost_per_unit,
    e.amount as total_cost,
    e.supplier,
    e.invoice_number,
    e.payment_mode,
    e.id as expense_id,
    e.user_id
FROM
    public.expenses e
JOIN
    public.inventory i ON e.inventory_item_id = i.id
WHERE
    e.is_inventory_purchase = true;

GRANT SELECT ON public.inventory_purchase_history TO authenticated;
ALTER VIEW public.inventory_purchase_history SET (security_invoker = true);

DROP VIEW IF EXISTS public.supplier_purchase_analytics;
CREATE OR REPLACE VIEW public.supplier_purchase_analytics AS
SELECT
    supplier,
    COUNT(*) as total_purchases,
    SUM(amount) as total_spent,
    MIN(expense_date) as first_purchase,
    MAX(expense_date) as last_purchase,
    jsonb_agg(DISTINCT item_name) as items_purchased
FROM
    public.expenses
WHERE
    supplier IS NOT NULL
GROUP BY
    supplier;

GRANT SELECT ON public.supplier_purchase_analytics TO authenticated;
ALTER VIEW public.supplier_purchase_analytics SET (security_invoker = true);
