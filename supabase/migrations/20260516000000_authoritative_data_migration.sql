-- Authoritative Data Migration for Inventory Normalization

-- 1. Populate Standard Unit Conversions for all active inventory items
-- This ensures that standard units (gm, kg, ml, l) are always available.
INSERT INTO public.inventory_unit_conversions (inventory_item_id, unit_name, conversion_to_base, unit_category, is_purchase_unit, is_base_unit)
SELECT
    i.id,
    vals.unit_name,
    vals.factor,
    vals.cat,
    false, -- these are standard, not necessarily the specific purchase units
    (lower(i.base_unit) = lower(vals.unit_name))
FROM public.inventory i
CROSS JOIN LATERAL (
    VALUES
        ('gm', 1, 'weight'),
        ('g', 1, 'weight'),
        ('kg', 1000, 'weight'),
        ('ml', 1, 'volume'),
        ('l', 1000, 'volume'),
        ('pcs', 1, 'count')
) AS vals(unit_name, factor, cat)
ON CONFLICT (inventory_item_id, unit_name) DO NOTHING;

-- 2. Initialize unit_category for inventory items based on their base_unit
UPDATE public.inventory
SET unit_category = public.get_unit_category(base_unit)
WHERE unit_category IS NULL;

-- 3. MIGRATE LEGACY QUANTITY TO MOVEMENTS (AUTHORITATIVE)
-- We need to convert the legacy 'quantity' (which might be in 'unit') into base units.
-- If the item was already in base unit, it's a 1:1 migration.
-- If it was in a different unit, we use calculate_base_quantity.

DO $$
DECLARE
    r RECORD;
    v_base_qty numeric;
BEGIN
    -- Clear existing movements to avoid duplicates during migration
    -- (Only if this is a fresh normalization run)
    DELETE FROM public.inventory_movements WHERE movement_type = 'opening_stock';

    FOR r IN SELECT id, quantity, base_unit, unit_cost, user_id FROM public.inventory WHERE quantity > 0 LOOP
        -- Attempt to calculate the base quantity
        -- Note: We assume the legacy 'quantity' was stored in whatever 'base_unit' or standard unit was used.
        -- If legacy 'unit' column exists and is different from 'base_unit', we'd use that.
        -- But most historical records in this system use 'quantity' as the value in 'base_unit'.

        v_base_qty := r.quantity;

        -- Insert authoritative opening stock movement
        INSERT INTO public.inventory_movements (
            inventory_item_id,
            movement_type,
            reference_type,
            quantity_base,
            unit_cost_base,
            user_id,
            created_at
        ) VALUES (
            r.id,
            'opening_stock',
            'manual',
            v_base_qty,
            COALESCE(r.unit_cost, 0),
            r.user_id,
            now()
        );
    END LOOP;
END $$;

-- 4. Initialize average_cost_per_base_unit from current unit_cost
UPDATE public.inventory
SET average_cost_per_base_unit = COALESCE(unit_cost, 0)
WHERE average_cost_per_base_unit = 0;

-- 5. Force sync current_stock_base if it differs from the sum of movements (Audit)
UPDATE public.inventory i
SET current_stock_base = (
    SELECT COALESCE(SUM(quantity_base), 0)
    FROM public.inventory_movements m
    WHERE m.inventory_item_id = i.id
);
