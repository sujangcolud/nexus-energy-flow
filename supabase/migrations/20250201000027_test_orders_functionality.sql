-- Test function to verify orders table functionality and diagnose PGRST204 issues

-- Create a test function to verify orders table
CREATE OR REPLACE FUNCTION public.test_orders_table()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    test_result jsonb := '{}';
    table_exists boolean;
    date_col_exists boolean;
    order_date_col_exists boolean;
    test_insert_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Test 1: Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'orders' AND table_schema = 'public'
    ) INTO table_exists;
    
    test_result := jsonb_set(test_result, '{table_exists}', to_jsonb(table_exists));
    
    IF NOT table_exists THEN
        test_result := jsonb_set(test_result, '{error}', '"Orders table does not exist"');
        RETURN test_result;
    END IF;
    
    -- Test 2: Check if date column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'date' AND table_schema = 'public'
    ) INTO date_col_exists;
    
    test_result := jsonb_set(test_result, '{date_column_exists}', to_jsonb(date_col_exists));
    
    -- Test 3: Check if order_date column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'order_date' AND table_schema = 'public'
    ) INTO order_date_col_exists;
    
    test_result := jsonb_set(test_result, '{order_date_column_exists}', to_jsonb(order_date_col_exists));
    
    -- Test 4: Try to insert a test order
    IF current_user_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.orders (
                user_id, item_name, quantity, rate, total, payment_mode, order_date, date
            ) VALUES (
                current_user_id, 'Test Item', 1, 10.00, 10.00, 'Cash', CURRENT_DATE, CURRENT_DATE
            ) RETURNING id INTO test_insert_id;
            
            test_result := jsonb_set(test_result, '{test_insert_success}', 'true');
            test_result := jsonb_set(test_result, '{test_insert_id}', to_jsonb(test_insert_id::text));
            
            -- Clean up test record
            DELETE FROM public.orders WHERE id = test_insert_id;
            
        EXCEPTION WHEN OTHERS THEN
            test_result := jsonb_set(test_result, '{test_insert_success}', 'false');
            test_result := jsonb_set(test_result, '{test_insert_error}', to_jsonb(SQLERRM));
        END;
    ELSE
        test_result := jsonb_set(test_result, '{test_insert_success}', 'false');
        test_result := jsonb_set(test_result, '{test_insert_error}', '"No authenticated user"');
    END IF;
    
    -- Test 5: Get column list
    test_result := jsonb_set(test_result, '{columns}', (
        SELECT jsonb_agg(column_name)
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND table_schema = 'public'
        ORDER BY ordinal_position
    ));
    
    -- Overall status
    IF table_exists AND date_col_exists AND order_date_col_exists THEN
        test_result := jsonb_set(test_result, '{status}', '"SUCCESS"');
        test_result := jsonb_set(test_result, '{message}', '"Orders table is properly configured"');
    ELSE
        test_result := jsonb_set(test_result, '{status}', '"ERROR"');
        test_result := jsonb_set(test_result, '{message}', '"Orders table has missing columns"');
    END IF;
    
    RETURN test_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.test_orders_table() TO authenticated;

-- Create a simple function to refresh PostgREST schema cache
CREATE OR REPLACE FUNCTION public.refresh_postgrest_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- PostgREST automatically reloads schema when functions change
    -- This dummy function creation/drop forces a schema reload
    
    EXECUTE 'CREATE OR REPLACE FUNCTION public.temp_schema_refresh() RETURNS boolean AS $temp$ BEGIN RETURN true; END; $temp$ LANGUAGE plpgsql';
    EXECUTE 'DROP FUNCTION public.temp_schema_refresh()';
    
    RETURN 'Schema cache refresh triggered at ' || now()::text;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.refresh_postgrest_schema() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.test_orders_table() IS 'Test function to verify orders table structure and functionality';
COMMENT ON FUNCTION public.refresh_postgrest_schema() IS 'Force PostgREST schema cache refresh to resolve PGRST204 errors';

-- Run the test function and display results
DO $$
DECLARE
    test_results jsonb;
BEGIN
    -- Only run if there's an authenticated user context
    IF auth.uid() IS NOT NULL THEN
        SELECT public.test_orders_table() INTO test_results;
        RAISE NOTICE 'Orders table test results: %', test_results::text;
    ELSE
        RAISE NOTICE 'Skipping orders table test - no authenticated user context';
    END IF;
END $$;
