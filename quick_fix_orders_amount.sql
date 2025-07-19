-- Quick fix for "column amount does not exist" error
-- This adds the missing 'amount' column to maintain compatibility

-- Add amount column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'amount'
    ) THEN
        -- Add amount column
        ALTER TABLE orders ADD COLUMN amount DECIMAL(10,2);
        
        -- Set amount equal to total for existing records
        UPDATE orders SET amount = total;
        
        -- Set default for future records
        ALTER TABLE orders ALTER COLUMN amount SET DEFAULT 0;
    END IF;
END $$;

-- Update the insert trigger to handle both total and amount
CREATE OR REPLACE FUNCTION handle_order_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure both total and amount are set
    IF NEW.total IS NOT NULL AND NEW.amount IS NULL THEN
        NEW.amount := NEW.total;
    ELSIF NEW.amount IS NOT NULL AND NEW.total IS NULL THEN
        NEW.total := NEW.amount;
    END IF;
    
    -- Ensure date fields are set
    IF NEW.order_date IS NULL THEN
        NEW.order_date := CURRENT_DATE;
    END IF;
    
    IF NEW.date IS NULL THEN
        NEW.date := NEW.order_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS handle_order_insert_trigger ON orders;
CREATE TRIGGER handle_order_insert_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_insert();

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Test the fix
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('total', 'amount')
ORDER BY column_name;
