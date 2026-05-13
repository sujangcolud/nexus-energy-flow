-- Final Authoritative Inventory Normalization Migration
-- Consolidated and Idempotent

-- 1. SCHEMA UPDATES (Ensure all columns exist first)

-- inventory table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='current_stock_base') THEN
        ALTER TABLE public.inventory ADD COLUMN current_stock_base numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='average_cost_per_base_unit') THEN
        ALTER TABLE public.inventory ADD COLUMN average_cost_per_base_unit numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='unit_category') THEN
        ALTER TABLE public.inventory ADD COLUMN unit_category text CHECK (unit_category IN ('weight', 'volume', 'count'));
    END IF;
END $$;

-- inventory_unit_conversions table
CREATE TABLE IF NOT EXISTS public.inventory_unit_conversions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
    unit_name text NOT NULL,
    conversion_to_base numeric NOT NULL CHECK (conversion_to_base > 0),
    created_at timestamptz DEFAULT now(),
    UNIQUE(inventory_item_id, unit_name)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_unit_conversions' AND column_name='unit_category') THEN
        ALTER TABLE public.inventory_unit_conversions ADD COLUMN unit_category text CHECK (unit_category IN ('weight', 'volume', 'count'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_unit_conversions' AND column_name='is_purchase_unit') THEN
        ALTER TABLE public.inventory_unit_conversions ADD COLUMN is_purchase_unit boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_unit_conversions' AND column_name='is_base_unit') THEN
        ALTER TABLE public.inventory_unit_conversions ADD COLUMN is_base_unit boolean DEFAULT false;
    END IF;
END $$;

-- inventory_movements table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
    movement_type text NOT NULL, -- 'purchase', 'recipe_consumption', 'wastage', 'adjustment', 'opening_stock', 'transfer'
    reference_type text, -- 'expense', 'order', 'manual'
    reference_id uuid,
    quantity_base numeric NOT NULL DEFAULT 0,
    unit_cost_base numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='quantity_base') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN quantity_base numeric NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='unit_cost_base') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN unit_cost_base numeric DEFAULT 0;
    END IF;
END $$;

-- expenses table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='purchase_unit') THEN
        ALTER TABLE public.expenses ADD COLUMN purchase_unit text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='converted_base_quantity') THEN
        ALTER TABLE public.expenses ADD COLUMN converted_base_quantity numeric;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inv_movements_item_id ON public.inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created_at ON public.inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inv_movements_ref ON public.inventory_movements(reference_type, reference_id);

-- 2. HELPER FUNCTIONS

-- Determine unit category
CREATE OR REPLACE FUNCTION public.get_unit_category(p_unit text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
    p_unit := lower(p_unit);
    IF p_unit IN ('g', 'gm', 'gram', 'kg', 'kilogram', 'kg.', 'sack') THEN RETURN 'weight'; END IF;
    IF p_unit IN ('ml', 'l', 'ltr', 'liter', 'litre', 'bottle', 'box', 'carton') THEN RETURN 'volume'; END IF;
    IF p_unit IN ('pcs', 'packet', 'piece', 'unit') THEN RETURN 'count'; END IF;
    RETURN 'count'; -- Default
END;
$$;

-- Calculate base quantity
CREATE OR REPLACE FUNCTION public.calculate_base_quantity(
    p_inventory_item_id uuid,
    p_unit text,
    p_quantity numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    v_base_unit text;
    v_item_category text;
    v_provided_category text;
    v_conversion numeric;
BEGIN
    SELECT base_unit, unit_category INTO v_base_unit, v_item_category FROM public.inventory WHERE id = p_inventory_item_id;
    v_provided_category := public.get_unit_category(p_unit);

    IF v_item_category IS NOT NULL AND v_item_category <> v_provided_category THEN
        SELECT conversion_to_base INTO v_conversion FROM public.inventory_unit_conversions
        WHERE inventory_item_id = p_inventory_item_id AND lower(unit_name) = lower(p_unit);
        IF v_conversion IS NULL THEN
            -- Pass through for now but log/warn in future. Strict mode can be enabled later.
            -- RAISE EXCEPTION 'Unit category mismatch: % vs %', v_provided_category, v_item_category;
        END IF;
    END IF;

    IF lower(p_unit) = lower(v_base_unit) THEN RETURN p_quantity; END IF;

    SELECT conversion_to_base INTO v_conversion FROM public.inventory_unit_conversions
    WHERE inventory_item_id = p_inventory_item_id AND lower(unit_name) = lower(p_unit);

    IF v_conversion IS NOT NULL THEN RETURN p_quantity * v_conversion; END IF;

    RETURN public.convert_unit(p_quantity, p_unit, v_base_unit);
END;
$$;

-- 3. TRIGGER FOR AUTHORITATIVE STOCK UPDATES

CREATE OR REPLACE FUNCTION public.tr_inventory_movement_authoritative_handler()
RETURNS TRIGGER AS $$
DECLARE
    v_old_stock numeric;
    v_old_avg_cost numeric;
    v_new_stock numeric;
    v_new_cost_total numeric;
BEGIN
    SELECT current_stock_base, average_cost_per_base_unit
    INTO v_old_stock, v_old_avg_cost
    FROM public.inventory
    WHERE id = NEW.inventory_item_id;

    v_old_stock := COALESCE(v_old_stock, 0);
    v_old_avg_cost := COALESCE(v_old_avg_cost, 0);

    IF (TG_OP = 'INSERT') THEN
        v_new_stock := v_old_stock + NEW.quantity_base;
        IF NEW.movement_type = 'purchase' AND NEW.quantity_base > 0 THEN
            IF (v_old_stock + NEW.quantity_base) > 0 THEN
                v_new_cost_total := (GREATEST(0, v_old_stock) * v_old_avg_cost) + (NEW.quantity_base * COALESCE(NEW.unit_cost_base, 0));
                v_old_avg_cost := v_new_cost_total / (GREATEST(0, v_old_stock) + NEW.quantity_base);
            ELSE
                v_old_avg_cost := COALESCE(NEW.unit_cost_base, v_old_avg_cost);
            END IF;
        END IF;

        UPDATE public.inventory
        SET current_stock_base = v_new_stock,
            average_cost_per_base_unit = v_old_avg_cost,
            updated_at = now()
        WHERE id = NEW.inventory_item_id;

    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.inventory
        SET current_stock_base = current_stock_base - OLD.quantity_base,
            updated_at = now()
        WHERE id = OLD.inventory_item_id;

    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.inventory
        SET current_stock_base = current_stock_base - OLD.quantity_base + NEW.quantity_base,
            updated_at = now()
        WHERE id = NEW.inventory_item_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_inventory_movement_authoritative ON public.inventory_movements;
CREATE TRIGGER tr_inventory_movement_authoritative
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.tr_inventory_movement_authoritative_handler();

-- 4. AUTHORITATIVE RPCs

-- process_inventory_expense
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
  p_manual_conversion_factor numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id uuid;
  v_base_qty numeric;
  v_unit_cost_base numeric;
BEGIN
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

  INSERT INTO public.expenses (
    user_id, description, amount, category, payment_mode, remarks, expense_date, date,
    is_inventory_purchase, inventory_item_id, quantity, unit, purchase_unit,
    converted_base_quantity, cost_per_unit, supplier, invoice_number
  )
  VALUES (
    p_user_id, p_description, p_amount, p_category, p_payment_mode, p_remarks, p_expense_date, p_expense_date,
    p_is_inventory_purchase, p_inventory_item_id, p_quantity, p_unit, p_unit,
    v_base_qty, p_cost_per_unit, p_supplier, p_invoice_number
  )
  RETURNING id INTO v_expense_id;

  IF p_is_inventory_purchase AND p_inventory_item_id IS NOT NULL THEN
    INSERT INTO public.inventory_movements (
      user_id, inventory_item_id, movement_type, reference_type, reference_id,
      quantity_base, unit_cost_base, created_at
    )
    VALUES (
      p_user_id, p_inventory_item_id, 'purchase', 'expense', v_expense_id,
      COALESCE(v_base_qty, 0), COALESCE(v_unit_cost_base, 0), p_expense_date
    );

    UPDATE public.inventory SET supplier = COALESCE(p_supplier, supplier), updated_at = now() WHERE id = p_inventory_item_id;
  END IF;

  RETURN v_expense_id;
END;
$$;

-- process_pos_order
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
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

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

    IF v_menu_id IS NOT NULL THEN
      FOR v_recipe IN
        SELECT r.inventory_item_id, r.quantity_used, r.unit_type, r.waste_percentage,
               inv.base_unit, inv.current_stock_base, inv.average_cost_per_base_unit,
               m.recipe_yield
        FROM public.recipe_items r
        JOIN public.inventory inv ON inv.id = r.inventory_item_id
        JOIN public.menu_items m ON m.id = r.menu_item_id
        WHERE r.menu_item_id = v_menu_id
      LOOP
        v_needed := public.calculate_base_quantity(
          v_recipe.inventory_item_id,
          v_recipe.unit_type,
          ((v_recipe.quantity_used * (1 + v_recipe.waste_percentage/100.0)) / COALESCE(v_recipe.recipe_yield, 1.0)) * v_qty_sold
        );

        INSERT INTO public.inventory_movements (
          user_id, inventory_item_id, movement_type, reference_type, reference_id,
          quantity_base, unit_cost_base, created_at
        )
        VALUES (
          v_user, v_recipe.inventory_item_id, 'recipe_consumption', 'order', v_order_id,
          -v_needed, v_recipe.average_cost_per_base_unit, p_order_date
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('order_ids', to_jsonb(v_order_ids));
END;
$$;

-- 5. INITIAL DATA MIGRATION

-- Populate Unit Conversions
INSERT INTO public.inventory_unit_conversions (inventory_item_id, unit_name, conversion_to_base, unit_category, is_purchase_unit, is_base_unit)
SELECT i.id, vals.unit_name, vals.factor, vals.cat, false, (lower(i.base_unit) = lower(vals.unit_name))
FROM public.inventory i
CROSS JOIN LATERAL (
    VALUES ('gm', 1, 'weight'), ('g', 1, 'weight'), ('kg', 1000, 'weight'),
           ('ml', 1, 'volume'), ('l', 1000, 'volume'), ('pcs', 1, 'count')
) AS vals(unit_name, factor, cat)
ON CONFLICT (inventory_item_id, unit_name) DO NOTHING;

-- Initialize unit_category
UPDATE public.inventory SET unit_category = public.get_unit_category(base_unit) WHERE unit_category IS NULL;

-- Initial opening stock to movements
INSERT INTO public.inventory_movements (inventory_item_id, movement_type, reference_type, quantity_base, unit_cost_base, user_id, created_at)
SELECT id, 'opening_stock', 'manual', quantity, COALESCE(unit_cost, 0), user_id, now()
FROM public.inventory i
WHERE quantity > 0 AND NOT EXISTS (SELECT 1 FROM public.inventory_movements m WHERE m.inventory_item_id = i.id AND m.movement_type = 'opening_stock');

-- Final sync
UPDATE public.inventory SET average_cost_per_base_unit = COALESCE(unit_cost, 0) WHERE average_cost_per_base_unit = 0;
UPDATE public.inventory i SET current_stock_base = (SELECT COALESCE(SUM(quantity_base), 0) FROM public.inventory_movements m WHERE m.inventory_item_id = i.id);
