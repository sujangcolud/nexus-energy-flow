CREATE OR REPLACE FUNCTION public.convert_unit(p_qty numeric, p_from text, p_to text)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  from_u text := lower(coalesce(p_from,''));
  to_u   text := lower(coalesce(p_to,''));
BEGIN
  IF from_u = to_u OR from_u = '' OR to_u = '' THEN RETURN p_qty; END IF;
  IF from_u = 'kg' AND to_u = 'gm' THEN RETURN p_qty * 1000; END IF;
  IF from_u = 'gm' AND to_u = 'kg' THEN RETURN p_qty / 1000; END IF;
  IF from_u IN ('kg','gm') AND to_u IN ('kg','gm') THEN
    -- handled above
    RETURN p_qty;
  END IF;
  IF from_u IN ('l','liter','litre') AND to_u = 'ml' THEN RETURN p_qty * 1000; END IF;
  IF from_u = 'ml' AND to_u IN ('l','liter','litre') THEN RETURN p_qty / 1000; END IF;
  IF from_u IN ('l','liter','litre','ml') AND to_u IN ('l','liter','litre','ml') THEN
    RETURN p_qty;
  END IF;
  -- Incompatible units (e.g. pcs vs kg): pass quantity through as-is instead of failing
  RETURN p_qty;
END;
$$;