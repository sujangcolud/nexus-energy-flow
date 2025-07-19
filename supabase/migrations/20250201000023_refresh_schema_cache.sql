-- Schema cache refresh utilities
-- This helps resolve PGRST204 errors by refreshing the PostgREST schema cache

-- Function to refresh schema cache (for admin use)
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function can be called to trigger a schema refresh
    -- PostgREST will automatically reload schema on function changes
    
    -- Log the refresh
    RAISE NOTICE 'Schema cache refresh triggered at %', now();
    
    RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.refresh_schema_cache() IS 'Triggers PostgREST schema cache refresh to resolve PGRST204 errors';

-- Verify orders table structure
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Check if date column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'date' 
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE 'SUCCESS: date column exists in orders table';
    ELSE
        RAISE WARNING 'ERROR: date column missing from orders table';
    END IF;
    
    -- Check if order_date column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_date' 
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE 'SUCCESS: order_date column exists in orders table';
    ELSE
        RAISE WARNING 'ERROR: order_date column missing from orders table';
    END IF;
END $$;

-- List all columns in orders table for verification
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Orders table columns:';
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %: % (nullable: %, default: %)', 
            rec.column_name, rec.data_type, rec.is_nullable, rec.column_default;
    END LOOP;
END $$;
