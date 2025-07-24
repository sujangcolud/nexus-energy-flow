# 🚨 IMMEDIATE FIX: Order Submission Failing

## Problem
Orders are failing because database triggers are trying to access columns that don't exist in your daily_summary table.

## ⚡ FASTEST FIX (30 seconds)

**Copy and paste this into your Supabase SQL Editor:**

```sql
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_income_esewa NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_income_fonepay NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_income_cash NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_cash_income NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_esewa_income NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_fonepay_income NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS fonepay_balance NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS cooperative_balance NUMERIC DEFAULT 0;
```

**Click RUN → Try submitting an order**

## 🔧 Alternative: Use Pre-Made Scripts

### Option 1: Minimal Fix
- Run `emergency_order_fix.sql` (adds just essential columns)

### Option 2: Complete Fix  
- Run `fix_missing_columns_immediate.sql` (adds all enhanced columns)

## 🔍 What's Happening

When you submit an order:
1. Database triggers automatically fire
2. Triggers try to update daily_summary table
3. Triggers reference columns that don't exist
4. Error 42703 occurs
5. Order submission fails

## ✅ After the Fix

- ✅ Orders will submit successfully
- ✅ Daily summaries will be updated automatically
- ✅ Enhanced payment mode tracking will work
- ✅ No more column errors

## 🚀 Test the Fix

1. Run the SQL commands above
2. Go to your application
3. Try submitting a test order
4. Should work without errors!

**The fastest solution is the SQL commands at the top of this guide.**
