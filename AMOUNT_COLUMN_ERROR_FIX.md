# Fix for 42703 "column amount does not exist" Error

## Problem

Your application is trying to reference a column named "amount" in the orders table, but the table only has a "total" column. This error (42703) indicates a column reference error in PostgreSQL.

## Root Cause

This typically happens when:

1. Database triggers or functions expect an "amount" column
2. Some code was written expecting "amount" instead of "total"
3. Schema inconsistencies between different parts of the application

## Quick Fix (Recommended)

### Step 1: Run the Quick Fix

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the content from `quick_fix_orders_amount.sql`
4. Click "Run"

This will:

- Add an "amount" column to the orders table
- Set amount = total for existing records
- Create a trigger to keep both columns in sync

### Step 2: Verify the Fix

1. Refresh your web application
2. Try placing an order
3. Check that the order goes through successfully

## Alternative: Complete Fix

If you want a more comprehensive solution, use `fix_amount_column_error.sql` instead, which:

- Adds the amount column with proper triggers
- Creates a view for backward compatibility
- Recreates the insert_order_safe function
- Includes extensive error checking

## Manual Fix (If SQL files don't work)

Run these commands in Supabase SQL Editor:

```sql
-- Add the missing amount column
ALTER TABLE orders ADD COLUMN amount DECIMAL(10,2);

-- Update existing records
UPDATE orders SET amount = total;

-- Create trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_order_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.amount := NEW.total;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_order_amount_trigger
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_amount();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
```

## Verification

After running the fix, verify it worked:

```sql
-- Check table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('total', 'amount');

-- Test insert
INSERT INTO orders (user_id, item_name, quantity, rate, total, payment_mode)
SELECT id, 'Test Item', 1, 10.00, 10.00, 'Cash'
FROM auth.users LIMIT 1;

-- Check the result
SELECT item_name, total, amount FROM orders WHERE item_name = 'Test Item';

-- Clean up test
DELETE FROM orders WHERE item_name = 'Test Item';
```

## Prevention

To prevent this in the future:

1. Use consistent column naming across your schema
2. Test database changes before deploying
3. Use TypeScript types that match your actual database schema
4. Document any column aliases or computed fields

## If the Error Persists

If you still get errors after running the fix:

1. **Check for other tables** that might have the same issue
2. **Review your database functions** for hardcoded column references
3. **Clear your browser cache** and refresh the application
4. **Check Supabase logs** for additional error details

The error should be resolved immediately after running the quick fix! 🚀
