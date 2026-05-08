-- Add recipe_yield to menu_items and update deduction logic
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='recipe_yield') THEN
        ALTER TABLE public.menu_items ADD COLUMN recipe_yield numeric DEFAULT 1.0 CHECK (recipe_yield > 0);
    END IF;
END $$;

-- Update POS order processor to account for yield
CREATE OR REPLACE FUNCTION public.process_pos_order(
  p_items jsonb,
  p_payment_mode text,
  p_order_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_item jsonb;
  v_menu_id uuid;
  v_qty_sold numeric;
  v_rate numeric;
  v_name text;
  v_order_id uuid;
  v_order_ids uuid[] := '{}';
  v_recipe record;
  v_needed numeric;
  v_inv record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;

  -- Pre-flight: aggregate total ingredient need per inventory_item across whole cart and ensure stock
  WITH cart AS (
    SELECT (i->>'menu_item_id')::uuid AS menu_item_id,
           (i->>'quantity')::numeric AS qty
    FROM jsonb_array_elements(p_items) AS i
    WHERE (i->>'menu_item_id') IS NOT NULL
  ),
  needs AS (
    SELECT r.inventory_item_id,
           SUM(public.convert_unit(
             (r.quantity_used * (1 + r.waste_percentage/100.0) / COALESCE(m.recipe_yield, 1.0)) * c.qty,
             r.unit_type, inv.base_unit)) AS need_qty
    FROM cart c
    JOIN public.recipe_items r ON r.menu_item_id = c.menu_item_id
    JOIN public.menu_items m ON m.id = c.menu_item_id
    JOIN public.inventory inv ON inv.id = r.inventory_item_id
    GROUP BY r.inventory_item_id
  )
  SELECT n.inventory_item_id, n.need_qty, inv.quantity AS in_stock, inv.item_name
  INTO v_inv
  FROM needs n
  JOIN public.inventory inv ON inv.id = n.inventory_item_id
  WHERE n.need_qty > inv.quantity
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for %: need %, have %', v_inv.item_name, v_inv.need_qty, v_inv.in_stock;
  END IF;

  -- Insert each order line
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_id  := NULLIF(v_item->>'menu_item_id','')::uuid;
    v_qty_sold := (v_item->>'quantity')::numeric;
    v_rate     := (v_item->>'rate')::numeric;
    v_name     := v_item->>'item_name';

    INSERT INTO public.orders (user_id, item_name, quantity, rate, total, payment_mode, order_date, date)
    VALUES (v_user, v_name, v_qty_sold, v_rate, v_qty_sold * v_rate, p_payment_mode, p_order_date, p_order_date)
    RETURNING id INTO v_order_id;
    v_order_ids := array_append(v_order_ids, v_order_id);

    -- Deduct ingredients for this line
    IF v_menu_id IS NOT NULL THEN
      FOR v_recipe IN
        SELECT r.inventory_item_id, r.quantity_used, r.unit_type, r.waste_percentage,
               inv.base_unit, inv.item_name AS inv_name, inv.quantity AS inv_qty, inv.unit_cost,
               m.recipe_yield
        FROM public.recipe_items r
        JOIN public.inventory inv ON inv.id = r.inventory_item_id
        JOIN public.menu_items m ON m.id = r.menu_item_id
        WHERE r.menu_item_id = v_menu_id
      LOOP
        v_needed := public.convert_unit(
          (v_recipe.quantity_used * (1 + v_recipe.waste_percentage/100.0) / COALESCE(v_recipe.recipe_yield, 1.0)) * v_qty_sold,
          v_recipe.unit_type, v_recipe.base_unit);

        UPDATE public.inventory
          SET quantity = quantity - v_needed,
              updated_at = now()
          WHERE id = v_recipe.inventory_item_id;

        INSERT INTO public.inventory_transactions (
          user_id, inventory_id, transaction_type, quantity, unit_cost, total_cost,
          reference_type, reference_id, notes, transaction_date
        ) VALUES (
          v_user, v_recipe.inventory_item_id, 'sale_usage', -v_needed,
          v_recipe.unit_cost, COALESCE(v_recipe.unit_cost,0) * v_needed,
          'order', v_order_id::text,
          format('Auto deduction for sale of %s (qty %s)', v_name, v_qty_sold),
          p_order_date
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('order_ids', to_jsonb(v_order_ids));
END;
$$;
