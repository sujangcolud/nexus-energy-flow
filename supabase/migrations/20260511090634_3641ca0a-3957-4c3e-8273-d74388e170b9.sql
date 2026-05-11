
ALTER VIEW public.current_inventory_levels SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.convert_unit_v2(
  p_qty NUMERIC,
  p_from_unit UUID,
  p_to_unit UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.convert_unit_v2(NUMERIC, UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.convert_unit_v2(NUMERIC, UUID, UUID) TO authenticated;
