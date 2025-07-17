CREATE OR REPLACE FUNCTION get_table_columns(table_names TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  cols TEXT[];
BEGIN
  SELECT array_agg(column_name::TEXT)
  INTO cols
  FROM information_schema.columns
  WHERE table_name = ANY(table_names);

  RETURN cols;
END;
$$ LANGUAGE plpgsql;

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
