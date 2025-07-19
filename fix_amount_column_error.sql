-- Fix for 42703 "column amount does not exist" error
-- This error occurs when triggers or functions reference 'amount' instead of 'total'

-- First, let's check what triggers exist on the orders table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'orders';

-- Drop any problematic triggers that might reference 'amount'
DROP TRIGGER IF EXISTS update_balances_on_order ON orders;
DROP TRIGGER IF EXISTS log_order_changes ON orders;
DROP TRIGGER IF EXISTS validate_order_data ON orders;
DROP TRIGGER IF EXISTS update_order_totals ON orders;

-- Check the current orders table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Ensure the orders table has the correct structure
-- Add 'amount' column as an alias to 'total' if needed for compatibility
DO $$
BEGIN
    -- Check if 'amount' column exists, if not, add it as a computed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'amount'
    ) THEN
        -- Add amount column as an alias to total for backward compatibility
        ALTER TABLE orders ADD COLUMN amount DECIMAL(10,2);
        
        -- Update existing records
        UPDATE orders SET amount = total WHERE amount IS NULL;
        
        -- Create a trigger to keep amount and total in sync
        CREATE OR REPLACE FUNCTION sync_order_amount_total()
        RETURNS TRIGGER AS $sync$
        BEGIN
            -- If total is updated, update amount
            IF NEW.total IS DISTINCT FROM OLD.total THEN
                NEW.amount := NEW.total;
            END IF;
            
            -- If amount is updated, update total
            IF NEW.amount IS DISTINCT FROM OLD.amount THEN
                NEW.total := NEW.amount;
            END IF;
            
            RETURN NEW;
        END;
        $sync$ LANGUAGE plpgsql;
        
        CREATE TRIGGER sync_order_amount_total_trigger
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION sync_order_amount_total();
            
        -- Also handle inserts
        CREATE OR REPLACE FUNCTION set_order_amount_on_insert()
        RETURNS TRIGGER AS $insert$
        BEGIN
            -- Ensure amount is set to total on insert
            IF NEW.amount IS NULL AND NEW.total IS NOT NULL THEN
                NEW.amount := NEW.total;
            ELSIF NEW.total IS NULL AND NEW.amount IS NOT NULL THEN
                NEW.total := NEW.amount;
            END IF;
            
            RETURN NEW;
        END;
        $insert$ LANGUAGE plpgsql;
        
        CREATE TRIGGER set_order_amount_on_insert_trigger
            BEFORE INSERT ON orders
            FOR EACH ROW
            EXECUTE FUNCTION set_order_amount_on_insert();
    END IF;
END $$;

-- Alternative approach: Create a view that includes 'amount' as an alias
CREATE OR REPLACE VIEW orders_with_amount AS
SELECT 
    id,
    user_id,
    item_name,
    quantity,
    rate,
    total,
    total AS amount, -- Alias total as amount
    payment_mode,
    order_date,
    date,
    created_at
FROM orders;

-- Grant permissions on the view
GRANT ALL ON orders_with_amount TO authenticated;

-- Enable RLS on the view
ALTER VIEW orders_with_amount SET (security_invoker = true);

-- Clean up any conflicting functions
DROP FUNCTION IF EXISTS insert_order_safe(UUID, TEXT, INTEGER, DECIMAL, DECIMAL, TEXT, DATE);

-- Recreate the insert_order_safe function with correct column names
CREATE OR REPLACE FUNCTION insert_order_safe(
    p_user_id UUID,
    p_item_name TEXT,
    p_quantity INTEGER,
    p_rate DECIMAL,
    p_total DECIMAL,
    p_payment_mode TEXT,
    p_order_date DATE
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    item_name TEXT,
    quantity INTEGER,
    rate DECIMAL,
    total DECIMAL,
    payment_mode TEXT,
    order_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_order_id UUID;
BEGIN
    -- Insert the order with correct column names
    INSERT INTO orders (
        user_id,
        item_name,
        quantity,
        rate,
        total,
        payment_mode,
        order_date,
        date
    ) VALUES (
        p_user_id,
        p_item_name,
        p_quantity,
        p_rate,
        p_total,
        p_payment_mode,
        p_order_date,
        p_order_date
    ) RETURNING orders.id INTO new_order_id;
    
    -- Return the created order
    RETURN QUERY
    SELECT 
        o.id,
        o.user_id,
        o.item_name,
        o.quantity,
        o.rate,
        o.total,
        o.payment_mode,
        o.order_date,
        o.created_at
    FROM orders o
    WHERE o.id = new_order_id;
END;
$$;

-- Test the function
DO $$
DECLARE
    test_user_id UUID;
    test_result RECORD;
BEGIN
    -- Get a test user ID (use the first available user)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        SELECT * INTO test_result 
        FROM insert_order_safe(
            test_user_id,
            'Test Item',
            1,
            10.00,
            10.00,
            'Cash',
            CURRENT_DATE
        );
        
        RAISE NOTICE 'Test order created successfully with ID: %', test_result.id;
        
        -- Clean up test data
        DELETE FROM orders WHERE id = test_result.id;
    ELSE
        RAISE NOTICE 'No users found for testing';
    END IF;
END $$;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Final verification
SELECT 'Orders table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
