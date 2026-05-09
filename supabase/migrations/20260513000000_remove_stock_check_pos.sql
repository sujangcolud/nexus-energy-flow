-- Remove insufficient stock check from process_pos_order to allow orders even when stock is low
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

  -- PRE-FLIGHT CHECK REMOVED as per user request to allow orders regardless of stock levels.

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

    -- Deduct ingredients for this line if menu_id is provided
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
        -- Apply the formula: ((Batch Qty * Waste Buffer) / Yield) * Quantity Sold
        v_needed := public.convert_unit(
          ((v_recipe.quantity_used * (1 + v_recipe.waste_percentage/100.0)) / COALESCE(v_recipe.recipe_yield, 1.0)) * v_qty_sold,
          v_recipe.unit_type, v_recipe.base_unit);

        -- We still update inventory to keep track, even if it goes negative.
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
          format('Auto deduction for sale of %s (qty %s). Per serving: %s %s',
                 v_name, v_qty_sold, (v_recipe.quantity_used / COALESCE(v_recipe.recipe_yield, 1.0)), v_recipe.unit_type),
          p_order_date
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('order_ids', to_jsonb(v_order_ids));
END;
$$;
