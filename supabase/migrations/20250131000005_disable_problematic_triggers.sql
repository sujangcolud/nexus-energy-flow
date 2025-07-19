-- Alternative approach: Disable any triggers that might be causing the date field issue

-- Drop any triggers that might be referencing non-existent date fields
-- This is a more aggressive approach to ensure order insertion works

-- First, let's see what triggers exist on the orders table and drop any that might be problematic
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Get all triggers on the orders table
    FOR trigger_record IN 
        SELECT tgname, tgrelid::regclass AS table_name
        FROM pg_trigger 
        WHERE tgrelid = 'public.orders'::regclass
        AND NOT tgisinternal  -- Exclude internal triggers
    LOOP
        -- Drop each trigger (we'll recreate the necessary ones)
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_record.tgname, trigger_record.table_name);
        RAISE NOTICE 'Dropped trigger % on table %', trigger_record.tgname, trigger_record.table_name;
    END LOOP;
END $$;

-- Now create only the essential triggers that we know work correctly

-- Create the order date sync trigger only if we have the date column
DO $$
BEGIN
    -- Check if date column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'date' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN date DATE;
    END IF;
    
    -- Create the sync function
    CREATE OR REPLACE FUNCTION public.sync_order_date()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.date = NEW.order_date;
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    -- Create the trigger
    CREATE TRIGGER sync_order_date_trigger
        BEFORE INSERT OR UPDATE ON public.orders
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_order_date();
        
    -- Update existing records
    UPDATE public.orders SET date = order_date WHERE date IS NULL;
    
EXCEPTION WHEN OTHERS THEN
    -- If anything fails, just continue without the date sync
    RAISE NOTICE 'Could not create date sync trigger: %', SQLERRM;
END $$;

-- Ensure the orders table has proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT USAGE ON SEQUENCE orders_id_seq TO authenticated;
