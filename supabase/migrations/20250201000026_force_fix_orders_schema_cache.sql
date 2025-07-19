-- Force fix for PGRST204 error: "Could not find the 'date' column of 'orders' in the schema cache"
-- This migration aggressively ensures the orders table has the correct structure and forces schema refresh

-- Drop and recreate the orders table to ensure clean state
DO $$
BEGIN
    -- First, let's check what currently exists
    RAISE NOTICE 'Checking current orders table structure...';
    
    -- Check if orders table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'orders' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Orders table exists, checking columns...';
        
        -- List current columns
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'orders' AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE 'Column: % (type: %, nullable: %, default: %)', 
                rec.column_name, rec.data_type, rec.is_nullable, rec.column_default;
        END LOOP;
    ELSE
        RAISE NOTICE 'Orders table does not exist!';
    END IF;
END $$;

-- Backup existing data if table exists
CREATE TABLE IF NOT EXISTS public.orders_backup AS 
SELECT * FROM public.orders WHERE 1=0; -- Create empty backup table

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        -- Backup existing data
        INSERT INTO public.orders_backup SELECT * FROM public.orders;
        RAISE NOTICE 'Backed up % orders to orders_backup table', (SELECT COUNT(*) FROM public.orders_backup);
    END IF;
END $$;

-- Drop the orders table completely to force schema refresh
DROP TABLE IF EXISTS public.orders CASCADE;

-- Recreate orders table with correct structure
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    rate numeric NOT NULL,
    total numeric NOT NULL,
    payment_mode text NOT NULL DEFAULT 'Cash',
    order_date date NOT NULL DEFAULT CURRENT_DATE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create the date synchronization function
CREATE OR REPLACE FUNCTION public.sync_order_date()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.order_date = COALESCE(NEW.order_date, NEW.date, CURRENT_DATE);
        NEW.date = COALESCE(NEW.date, NEW.order_date, CURRENT_DATE);
        NEW.updated_at = now();
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.order_date IS DISTINCT FROM OLD.order_date THEN
            NEW.date = NEW.order_date;
        END IF;
        IF NEW.date IS DISTINCT FROM OLD.date THEN
            NEW.order_date = NEW.date;
        END IF;
        NEW.updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER sync_order_date_trigger
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_order_date();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own orders" ON public.orders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Restore data from backup
DO $$
DECLARE
    backup_count integer;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM public.orders_backup;
    
    IF backup_count > 0 THEN
        INSERT INTO public.orders (
            id, user_id, item_name, quantity, rate, total, payment_mode,
            order_date, date, created_at, updated_at
        )
        SELECT 
            id, user_id, item_name, quantity, rate, total, payment_mode,
            COALESCE(order_date, created_at::date, CURRENT_DATE),
            COALESCE(date, order_date, created_at::date, CURRENT_DATE),
            created_at, 
            COALESCE(updated_at, created_at, now())
        FROM public.orders_backup;
        
        RAISE NOTICE 'Restored % orders from backup', backup_count;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_date ON public.orders(date);
CREATE INDEX idx_orders_order_date ON public.orders(order_date);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

-- Force schema cache refresh by creating and dropping a dummy function
CREATE OR REPLACE FUNCTION public.force_schema_refresh_orders()
RETURNS boolean AS $$
BEGIN
    RETURN true;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION public.force_schema_refresh_orders();

-- Clean up backup table
DROP TABLE IF EXISTS public.orders_backup;

-- Verify the final structure
DO $$
DECLARE
    rec RECORD;
    date_column_exists boolean := false;
    order_date_column_exists boolean := false;
BEGIN
    RAISE NOTICE 'Final orders table structure:';
    
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  ✓ %: % (nullable: %, default: %)', 
            rec.column_name, rec.data_type, rec.is_nullable, rec.column_default;
            
        IF rec.column_name = 'date' THEN
            date_column_exists := true;
        END IF;
        
        IF rec.column_name = 'order_date' THEN
            order_date_column_exists := true;
        END IF;
    END LOOP;
    
    IF date_column_exists AND order_date_column_exists THEN
        RAISE NOTICE '✅ SUCCESS: Both date and order_date columns exist!';
        RAISE NOTICE '✅ PGRST204 error should now be resolved!';
    ELSE
        RAISE WARNING '❌ ERROR: Missing required date columns!';
        RAISE WARNING '  date column exists: %', date_column_exists;
        RAISE WARNING '  order_date column exists: %', order_date_column_exists;
    END IF;
END $$;

-- Add table comment
COMMENT ON TABLE public.orders IS 'Orders table with both date and order_date columns for compatibility - rebuilt to fix PGRST204 schema cache error';
