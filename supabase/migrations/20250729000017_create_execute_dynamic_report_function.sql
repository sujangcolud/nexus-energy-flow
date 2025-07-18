CREATE OR REPLACE FUNCTION execute_dynamic_report(custom_calculations JSONB, filters JSONB)
RETURNS JSONB AS $$
DECLARE
  query TEXT;
  select_clause TEXT := '';
  from_clause TEXT := '';
  where_clause TEXT := ' WHERE 1=1';
  tables TEXT[];
  table_item TEXT;
  calc JSONB;
  i INT;
  result JSONB;
BEGIN
  -- Extract all unique tables from calculations
  FOR calc IN SELECT * FROM jsonb_array_elements(custom_calculations)
  LOOP
    FOR table_item IN SELECT jsonb_array_elements_text(calc->'formula'->'tables')
    LOOP
      tables := array_append(tables, table_item);
    END LOOP;
  END LOOP;

  -- Build FROM clause
  IF array_length(tables, 1) > 0 THEN
    from_clause := 'FROM ' || array_to_string(ARRAY(SELECT DISTINCT unnest(tables)), ', ');
  END IF;

  -- Build SELECT clause
  i := 0;
  FOR calc IN SELECT * FROM jsonb_array_elements(custom_calculations)
  LOOP
    IF i > 0 THEN
      select_clause := select_clause || ', ';
    END IF;
    select_clause := select_clause || (calc->>'formula') || ' AS ' || quote_ident(calc->>'heading');
    i := i + 1;
  END LOOP;

  -- Build WHERE clause from filters
  IF jsonb_array_length(filters) > 0 THEN
    FOR i IN 0..jsonb_array_length(filters) - 1 LOOP
      where_clause := where_clause || ' AND ' || (filters->i->>'column') || ' ' || (filters->i->>'operator') || ' ''' || (filters->i->>'value') || '''';
    END LOOP;
  END IF;

  query := 'SELECT ' || select_clause || ' ' || from_clause || ' ' || where_clause;

  EXECUTE query INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
