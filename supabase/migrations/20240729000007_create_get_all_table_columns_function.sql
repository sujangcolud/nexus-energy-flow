CREATE OR REPLACE FUNCTION get_all_table_columns()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(table_name, columns)
  INTO result
  FROM (
    SELECT table_name, array_agg(column_name::TEXT) as columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
  ) AS tables;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
