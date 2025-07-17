CREATE OR REPLACE FUNCTION execute_custom_report(report_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  report_data custom_reports%ROWTYPE;
  query TEXT;
  result NUMERIC;
BEGIN
  SELECT * INTO report_data FROM custom_reports WHERE id = report_id;

  query := 'SELECT ' || report_data.calculation_type || '(*) FROM ' || report_data.data_source || ' WHERE user_id = ''' || auth.uid() || '''';

  IF jsonb_array_length(report_data.filters) > 0 THEN
    FOR i IN 0..jsonb_array_length(report_data.filters) - 1 LOOP
      query := query || ' AND ' || (report_data.filters->i->>'column') || ' ' || (report_data.filters->i->>'operator') || ' ''' || (report_data.filters->i->>'value') || '''';
    END LOOP;
  END IF;

  EXECUTE query INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
