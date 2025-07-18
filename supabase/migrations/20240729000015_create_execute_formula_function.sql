CREATE OR REPLACE FUNCTION execute_formula(heading_param TEXT)
RETURNS NUMERIC AS $$
DECLARE
  formula_data formulas%ROWTYPE;
  query TEXT;
  result NUMERIC;
  i INT;
  column_part TEXT;
BEGIN
  SELECT * INTO formula_data FROM formulas WHERE heading = heading_param AND user_id = auth.uid();

  query := 'SELECT ';

  FOR i IN 0..jsonb_array_length(formula_data.formula) - 1 LOOP
    column_part := (formula_data.formula->i->>'column');
    IF i > 0 THEN
      query := query || ' ' || (formula_data.formula->(i-1)->>'operator') || ' ';
    END IF;
    query := query || 'COALESCE(SUM(' || split_part(column_part, '.', 2) || '), 0) FROM ' || split_part(column_part, '.', 1);
  END LOOP;

  EXECUTE query INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
