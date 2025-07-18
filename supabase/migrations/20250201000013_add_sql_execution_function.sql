-- Add SQL execution function for calculation engine
-- This allows the calculation engine to execute custom SQL queries safely

-- Create a function that can execute custom SQL queries with security restrictions
CREATE OR REPLACE FUNCTION public.execute_custom_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_data jsonb;
    current_user_id uuid;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    -- Security check: ensure user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Security check: basic SQL injection prevention
    -- Only allow SELECT statements
    IF LOWER(TRIM(query_text)) NOT LIKE 'select%' THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
    END IF;
    
    -- Security check: ensure query contains user_id filter
    IF query_text NOT ILIKE '%user_id%' THEN
        RAISE EXCEPTION 'Query must include user_id filter for data security';
    END IF;
    
    -- Replace placeholder with actual user ID
    query_text := REPLACE(query_text, 'current_user_id()', quote_literal(current_user_id::text));
    query_text := REPLACE(query_text, '$USER_ID', quote_literal(current_user_id::text));
    
    -- Execute the query and return results as JSON
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result_data;
    
    -- Return the result
    RETURN COALESCE(result_data, '[]'::jsonb);
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_custom_query(text) TO authenticated;

-- Create some predefined calculation templates for common business metrics
INSERT INTO public.custom_calculations (
    name,
    description,
    calculation_config,
    is_active,
    user_id
) 
SELECT 
    'Daily Cash Sales',
    'Calculate total cash sales for today',
    jsonb_build_object(
        'formula', 'SELECT SUM(total) as total_cash_sales FROM orders WHERE payment_mode = ''Cash'' AND order_date = CURRENT_DATE AND user_id = current_user_id()',
        'tables', ARRAY['orders'],
        'columns', ARRAY['total'],
        'filters', jsonb_build_object('payment_mode', 'Cash', 'date', 'today'),
        'aggregations', ARRAY['SUM(total)']
    ),
    true,
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_calculations (
    name,
    description,
    calculation_config,
    is_active,
    user_id
) 
SELECT 
    'Monthly Revenue Breakdown',
    'Revenue breakdown by payment mode for current month',
    jsonb_build_object(
        'formula', 'SELECT payment_mode, SUM(total) as total_amount FROM orders WHERE DATE_TRUNC(''month'', order_date) = DATE_TRUNC(''month'', CURRENT_DATE) AND user_id = current_user_id() GROUP BY payment_mode',
        'tables', ARRAY['orders'],
        'columns', ARRAY['total', 'payment_mode'],
        'filters', jsonb_build_object('date_range', 'current_month'),
        'aggregations', ARRAY['SUM(total)']
    ),
    true,
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_calculations (
    name,
    description,
    calculation_config,
    is_active,
    user_id
) 
SELECT 
    'Charging vs Restaurant Income',
    'Compare income from charging sessions vs restaurant orders',
    jsonb_build_object(
        'formula', 'SELECT ''Restaurant'' as source, SUM(total) as amount FROM orders WHERE user_id = current_user_id() UNION ALL SELECT ''Charging'' as source, SUM(total_amount) as amount FROM charging_sessions WHERE user_id = current_user_id()',
        'tables', ARRAY['orders', 'charging_sessions'],
        'columns', ARRAY['total', 'total_amount'],
        'filters', jsonb_build_object(),
        'aggregations', ARRAY['SUM']
    ),
    true,
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_calculations (
    name,
    description,
    calculation_config,
    is_active,
    user_id
) 
SELECT 
    'Expense Category Analysis',
    'Breakdown of expenses by category',
    jsonb_build_object(
        'formula', 'SELECT category, SUM(amount) as total_expenses, COUNT(*) as transaction_count FROM expenses WHERE user_id = current_user_id() GROUP BY category ORDER BY total_expenses DESC',
        'tables', ARRAY['expenses'],
        'columns', ARRAY['amount', 'category'],
        'filters', jsonb_build_object(),
        'aggregations', ARRAY['SUM(amount)', 'COUNT(*)']
    ),
    true,
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON FUNCTION public.execute_custom_query(text) IS 'Secure SQL execution function for custom calculations with built-in security checks';
