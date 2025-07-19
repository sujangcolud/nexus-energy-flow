-- Fix orders table date column issue
-- This migration ensures the date column exists and is properly synchronized

-- First, check if the orders table exists and add missing columns
DO $$
BEGIN
    -- Add date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'date' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN date DATE;
        RAISE NOTICE 'Added date column to orders table';
    END IF;

    -- Add order_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'order_date' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN order_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added order_date column to orders table';
    END IF;
END $$;

-- Ensure orders table has all required columns
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    rate numeric NOT NULL,
    total numeric NOT NULL,
    payment_mode text NOT NULL DEFAULT 'Cash',
    order_date date DEFAULT CURRENT_DATE,
    date date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Sync existing data where date columns are missing
UPDATE public.orders 
SET date = COALESCE(order_date, created_at::date, CURRENT_DATE)
WHERE date IS NULL;

UPDATE public.orders 
SET order_date = COALESCE(date, created_at::date, CURRENT_DATE)
WHERE order_date IS NULL;

-- Create or replace the date synchronization function
CREATE OR REPLACE FUNCTION public.sync_order_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure both date fields are populated and synchronized
    IF TG_OP = 'INSERT' THEN
        NEW.order_date = COALESCE(NEW.order_date, NEW.date, CURRENT_DATE);
        NEW.date = COALESCE(NEW.date, NEW.order_date, CURRENT_DATE);
        NEW.updated_at = now();
    ELSIF TG_OP = 'UPDATE' THEN
        -- Synchronize date fields when one is updated
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

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS sync_order_date_trigger ON public.orders;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

-- Create the sync trigger
CREATE TRIGGER sync_order_date_trigger
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_order_date();

-- Ensure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Super admins can manage all orders" ON public.orders;

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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Add comments for documentation
COMMENT ON TABLE public.orders IS 'Orders table with synchronized date fields for order tracking';
COMMENT ON COLUMN public.orders.date IS 'Date field synchronized with order_date for compatibility';
COMMENT ON COLUMN public.orders.order_date IS 'Primary order date field';

-- Final notification
DO $$
BEGIN
    RAISE NOTICE 'Orders table date column fix completed successfully!';
    RAISE NOTICE 'Both date and order_date columns are now available and synchronized.';
END $$;
