-- Create the custom_reports table
CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  data_sources TEXT[] NOT NULL,
  joins JSONB,
  calculation_type TEXT NOT NULL,
  calculation_column TEXT NOT NULL,
  filters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the get_all_table_columns function
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
    WHERE table_schema = 'public' AND table_name IN ('orders', 'charging_sessions', 'expenses', 'deposits', 'withdrawals', 'cooperative_savings')
    GROUP BY table_name
  ) AS tables;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the execute_custom_report function
CREATE OR REPLACE FUNCTION execute_custom_report(report_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  report_data custom_reports%ROWTYPE;
  query TEXT;
  result NUMERIC;
  join_clause TEXT := '';
  where_clause TEXT := ' WHERE 1=1';
  i INT;
BEGIN
  SELECT * INTO report_data FROM custom_reports WHERE id = report_id;

  query := 'SELECT ' || report_data.calculation_type || '(' || report_data.calculation_column || ') FROM ' || report_data.data_sources[1];

  IF array_length(report_data.data_sources, 1) > 1 THEN
    FOR i IN 1..jsonb_array_length(report_data.joins) LOOP
      join_clause := join_clause || ' JOIN ' || (report_data.joins->(i-1)->>'to') || ' ON ' || (report_data.joins->(i-1)->>'on');
    END LOOP;
  END IF;

  query := query || join_clause;

  IF jsonb_array_length(report_data.filters) > 0 THEN
    FOR i IN 0..jsonb_array_length(report_data.filters) - 1 LOOP
      where_clause := where_clause || ' AND ' || (report_data.filters->i->>'column') || ' ' || (report_data.filters->i->>'operator') || ' ''' || (report_data.filters->i->>'value') || '''';
    END LOOP;
  END IF;

  query := query || where_clause;

  EXECUTE query INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
