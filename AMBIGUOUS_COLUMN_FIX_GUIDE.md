# Fix for 42702 "Ambiguous Column Reference" Error

## Problem

Your order submission is failing with error 42702: "column reference 'summary_date' is ambiguous". This happens when a PostgreSQL function has a parameter with the same name as a table column, causing confusion about which one to use.

## Root Cause

The `update_daily_summary(summary_date DATE)` function:

- Has a parameter named `summary_date`
- References table columns also named `summary_date`
- PostgreSQL can't determine which one you mean in queries

## Quick Fix

### Step 1: Run the SQL Fix

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the content from `fix_ambiguous_column.sql`
4. Click "Run"

### Step 2: Verify the Fix

1. Try placing an order in your app
2. Check that it goes through without the 42702 error

## What the Fix Does

### 1. **Renames Function Parameter**

```sql
-- OLD (problematic):
CREATE FUNCTION update_daily_summary(summary_date DATE)

-- NEW (fixed):
CREATE FUNCTION update_daily_summary(p_summary_date DATE)
```

### 2. **Uses Table Aliases**

```sql
-- OLD (ambiguous):
FROM orders WHERE order_date = summary_date

-- NEW (clear):
FROM orders o WHERE o.order_date = p_summary_date
```

### 3. **Fully Qualifies All References**

- All table columns use aliases (e.g., `o.total`, `cs.payment_mode`)
- All parameters use prefix (e.g., `p_summary_date`)
- No ambiguity between parameters and columns

## Manual Fix (Alternative)

If the SQL file doesn't work, run this manually:

```sql
-- Drop existing problematic function
DROP FUNCTION IF EXISTS update_daily_summary(DATE) CASCADE;

-- Recreate with proper parameter naming
CREATE OR REPLACE FUNCTION update_daily_summary(p_summary_date DATE)
RETURNS VOID AS $$
BEGIN
    -- Use p_summary_date instead of summary_date
    -- Use table aliases for all column references
    -- ... (see full implementation in fix file)
END;
$$ LANGUAGE plpgsql;
```

## Prevention

To avoid this in the future:

1. **Use parameter prefixes** (p*, param*, etc.)
2. **Use table aliases** in all queries
3. **Avoid naming conflicts** between parameters and columns
4. **Test functions** after creation

## Technical Details

### Error Type: 42702

- **Category**: SQL syntax error
- **Meaning**: Ambiguous column reference
- **Common Cause**: Parameter/column name conflicts in PL/pgSQL

### Fixed Function Changes:

- ✅ Parameter renamed: `summary_date` → `p_summary_date`
- ✅ All queries use table aliases: `orders o`, `expenses e`, etc.
- ✅ All column references qualified: `o.order_date`, `e.expense_date`
- ✅ Parameter references prefixed: `p_summary_date`

## Verification Commands

After running the fix, verify it works:

```sql
-- Test the function directly
SELECT update_daily_summary(CURRENT_DATE);

-- Check if daily summary was created/updated
SELECT * FROM daily_summary WHERE summary_date = CURRENT_DATE;

-- Test with a sample order insertion
INSERT INTO orders (user_id, item_name, quantity, rate, total, payment_mode)
SELECT id, 'Test Item', 1, 10.00, 10.00, 'cash'
FROM auth.users LIMIT 1;

-- Check that summary updated automatically
SELECT * FROM daily_summary WHERE summary_date = CURRENT_DATE;

-- Clean up test data
DELETE FROM orders WHERE item_name = 'Test Item';
```

Your order submission should work immediately after applying this fix! 🚀
