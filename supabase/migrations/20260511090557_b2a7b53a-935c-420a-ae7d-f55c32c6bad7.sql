
-- =========================================================================
-- PHASE 1: INVENTORY FOUNDATION (additive, non-destructive)
-- =========================================================================

-- 1. UNITS catalog ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL UNIQUE,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('mass','volume','count','length')),
  is_base_unit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view units"
  ON public.units FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin manages units"
  ON public.units FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Seed common units
INSERT INTO public.units (name, symbol, unit_type, is_base_unit) VALUES
  ('gram',       'gm',   'mass',   true),
  ('kilogram',   'kg',   'mass',   false),
  ('milligram',  'mg',   'mass',   false),
  ('ounce',      'oz',   'mass',   false),
  ('pound',      'lb',   'mass',   false),
  ('milliliter', 'ml',   'volume', true),
  ('liter',      'l',    'volume', false),
  ('teaspoon',   'tsp',  'volume', false),
  ('tablespoon', 'tbsp', 'volume', false),
  ('cup',        'cup',  'volume', false),
  ('piece',      'pcs',  'count',  true)
ON CONFLICT (name) DO NOTHING;

-- 2. UNIT CONVERSIONS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unit_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  to_unit_id   UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  factor NUMERIC NOT NULL CHECK (factor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_unit_id, to_unit_id)
);

ALTER TABLE public.unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view unit_conversions"
  ON public.unit_conversions FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin manages unit_conversions"
  ON public.unit_conversions FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Seed conversions to base units (factor = how many BASE units in 1 of from_unit)
DO $seed$
DECLARE
  u_g UUID; u_kg UUID; u_mg UUID; u_oz UUID; u_lb UUID;
  u_ml UUID; u_l UUID; u_tsp UUID; u_tbsp UUID; u_cup UUID;
  u_pcs UUID;
BEGIN
  SELECT id INTO u_g    FROM public.units WHERE symbol='gm';
  SELECT id INTO u_kg   FROM public.units WHERE symbol='kg';
  SELECT id INTO u_mg   FROM public.units WHERE symbol='mg';
  SELECT id INTO u_oz   FROM public.units WHERE symbol='oz';
  SELECT id INTO u_lb   FROM public.units WHERE symbol='lb';
  SELECT id INTO u_ml   FROM public.units WHERE symbol='ml';
  SELECT id INTO u_l    FROM public.units WHERE symbol='l';
  SELECT id INTO u_tsp  FROM public.units WHERE symbol='tsp';
  SELECT id INTO u_tbsp FROM public.units WHERE symbol='tbsp';
  SELECT id INTO u_cup  FROM public.units WHERE symbol='cup';
  SELECT id INTO u_pcs  FROM public.units WHERE symbol='pcs';

  -- Mass to gram (base)
  INSERT INTO public.unit_conversions (from_unit_id, to_unit_id, factor) VALUES
    (u_kg,  u_g, 1000),
    (u_mg,  u_g, 0.001),
    (u_oz,  u_g, 28.3495),
    (u_lb,  u_g, 453.592),
    (u_g,   u_g, 1)
  ON CONFLICT DO NOTHING;

  -- Volume to milliliter (base)
  INSERT INTO public.unit_conversions (from_unit_id, to_unit_id, factor) VALUES
    (u_l,    u_ml, 1000),
    (u_tsp,  u_ml, 4.92892),
    (u_tbsp, u_ml, 14.7868),
    (u_cup,  u_ml, 236.588),
    (u_ml,   u_ml, 1)
  ON CONFLICT DO NOTHING;

  -- Count to piece (base)
  INSERT INTO public.unit_conversions (from_unit_id, to_unit_id, factor) VALUES
    (u_pcs, u_pcs, 1)
  ON CONFLICT DO NOTHING;
END
$seed$;

-- 3. CONVERT_UNIT_V2 -------------------------------------------------------
-- Routes any from_unit -> base unit -> to_unit using unit_conversions.
-- Raises if unit types are incompatible (e.g. mass -> volume).
CREATE OR REPLACE FUNCTION public.convert_unit_v2(
  p_qty NUMERIC,
  p_from_unit UUID,
  p_to_unit UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_type TEXT;
  v_to_type TEXT;
  v_from_to_base NUMERIC;
  v_to_to_base NUMERIC;
BEGIN
  IF p_from_unit = p_to_unit THEN
    RETURN p_qty;
  END IF;

  SELECT unit_type INTO v_from_type FROM public.units WHERE id = p_from_unit;
  SELECT unit_type INTO v_to_type   FROM public.units WHERE id = p_to_unit;

  IF v_from_type IS NULL OR v_to_type IS NULL THEN
    RAISE EXCEPTION 'Unknown unit id (from=%, to=%)', p_from_unit, p_to_unit;
  END IF;

  IF v_from_type <> v_to_type THEN
    RAISE EXCEPTION 'Incompatible unit types: % vs %', v_from_type, v_to_type;
  END IF;

  -- find conversion to base for from_unit
  SELECT uc.factor INTO v_from_to_base
    FROM public.unit_conversions uc
    JOIN public.units bu ON bu.id = uc.to_unit_id
   WHERE uc.from_unit_id = p_from_unit
     AND bu.is_base_unit = true
     AND bu.unit_type = v_from_type
   LIMIT 1;

  SELECT uc.factor INTO v_to_to_base
    FROM public.unit_conversions uc
    JOIN public.units bu ON bu.id = uc.to_unit_id
   WHERE uc.from_unit_id = p_to_unit
     AND bu.is_base_unit = true
     AND bu.unit_type = v_to_type
   LIMIT 1;

  IF v_from_to_base IS NULL OR v_to_to_base IS NULL THEN
    RAISE EXCEPTION 'Missing unit conversion to base for unit (from=%, to=%)', p_from_unit, p_to_unit;
  END IF;

  RETURN (p_qty * v_from_to_base) / v_to_to_base;
END;
$$;

-- 4. EXTEND inventory ------------------------------------------------------
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS base_unit_id UUID REFERENCES public.units(id);

-- Backfill base_unit_id from existing text base_unit
UPDATE public.inventory inv
   SET base_unit_id = u.id
  FROM public.units u
 WHERE inv.base_unit_id IS NULL
   AND lower(trim(inv.base_unit)) = lower(u.symbol);

-- Default any remaining (unknown text) to 'pcs'
UPDATE public.inventory
   SET base_unit_id = (SELECT id FROM public.units WHERE symbol='pcs')
 WHERE base_unit_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_base_unit_id ON public.inventory(base_unit_id);

-- 5. INVENTORY_STOCK_LEDGER (immutable event log) -------------------------
CREATE TABLE IF NOT EXISTS public.inventory_stock_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stock_in','stock_out','adjustment','wastage','opening_balance')),
  -- All stored in the inventory item's base unit:
  quantity_change NUMERIC NOT NULL,        -- +ve for in, -ve for out
  unit_cost_base NUMERIC,                  -- cost per base unit at txn time
  total_cost NUMERIC,                      -- quantity_change * unit_cost_base (signed)
  -- Source of truth for what the user actually entered:
  source_qty NUMERIC,
  source_unit_id UUID REFERENCES public.units(id),
  reference_type TEXT,                     -- 'purchase' | 'sale' | 'recipe_deduction' | 'manual_adjustment' | 'legacy_transaction'
  reference_id TEXT,
  notes TEXT,
  user_id UUID NOT NULL,
  transaction_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_isl_item        ON public.inventory_stock_ledger(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_isl_timestamp   ON public.inventory_stock_ledger(transaction_timestamp);
CREATE INDEX IF NOT EXISTS idx_isl_reference   ON public.inventory_stock_ledger(reference_type, reference_id);

ALTER TABLE public.inventory_stock_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stock ledger"
  ON public.inventory_stock_ledger FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can append to stock ledger"
  ON public.inventory_stock_ledger FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() AND user_id = auth.uid());

-- Intentionally no UPDATE / DELETE policies => append-only / immutable

-- 6. BACKFILL ledger from existing inventory_transactions ------------------
INSERT INTO public.inventory_stock_ledger (
  inventory_item_id, transaction_type, quantity_change,
  unit_cost_base, total_cost,
  source_qty, source_unit_id,
  reference_type, reference_id, notes,
  user_id, transaction_timestamp
)
SELECT
  it.inventory_id,
  CASE
    WHEN it.transaction_type ILIKE '%out%' OR it.transaction_type ILIKE '%sale%' OR it.transaction_type ILIKE '%usage%' THEN 'stock_out'
    WHEN it.transaction_type ILIKE '%adj%'    THEN 'adjustment'
    WHEN it.transaction_type ILIKE '%waste%'  THEN 'wastage'
    WHEN it.transaction_type ILIKE '%open%'   THEN 'opening_balance'
    ELSE 'stock_in'
  END,
  CASE
    WHEN it.transaction_type ILIKE '%out%' OR it.transaction_type ILIKE '%sale%' OR it.transaction_type ILIKE '%usage%' THEN -ABS(it.quantity)
    ELSE ABS(it.quantity)
  END,
  it.unit_cost,
  CASE
    WHEN it.total_cost IS NOT NULL THEN it.total_cost
    WHEN it.unit_cost IS NOT NULL  THEN it.unit_cost * it.quantity
    ELSE NULL
  END,
  it.quantity,
  inv.base_unit_id,
  COALESCE(it.reference_type, 'legacy_transaction'),
  it.reference_id,
  COALESCE(it.notes, 'Backfilled from inventory_transactions'),
  it.user_id,
  COALESCE(it.created_at, now())
FROM public.inventory_transactions it
JOIN public.inventory inv ON inv.id = it.inventory_id
WHERE inv.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_stock_ledger l
    WHERE l.reference_type = 'legacy_transaction'
      AND l.reference_id = it.id::text
  );

-- 7. CURRENT_INVENTORY_LEVELS view (live, weighted-avg cost) ---------------
CREATE OR REPLACE VIEW public.current_inventory_levels AS
WITH ledger AS (
  SELECT
    inventory_item_id,
    SUM(quantity_change) AS qty_base,
    SUM(CASE WHEN quantity_change > 0 AND unit_cost_base IS NOT NULL
             THEN quantity_change * unit_cost_base END) AS in_value,
    SUM(CASE WHEN quantity_change > 0 THEN quantity_change END) AS in_qty
  FROM public.inventory_stock_ledger
  GROUP BY inventory_item_id
)
SELECT
  inv.id AS inventory_item_id,
  inv.item_name,
  inv.base_unit_id,
  u.symbol AS base_unit_symbol,
  COALESCE(l.qty_base, 0) AS quantity_on_hand,
  CASE WHEN l.in_qty > 0 THEN l.in_value / l.in_qty ELSE inv.unit_cost END
    AS weighted_avg_cost_per_base_unit,
  COALESCE(l.qty_base, 0)
    * CASE WHEN l.in_qty > 0 THEN l.in_value / l.in_qty ELSE COALESCE(inv.unit_cost,0) END
    AS stock_value
FROM public.inventory inv
LEFT JOIN ledger l ON l.inventory_item_id = inv.id
LEFT JOIN public.units u ON u.id = inv.base_unit_id;

GRANT SELECT ON public.current_inventory_levels TO authenticated;
