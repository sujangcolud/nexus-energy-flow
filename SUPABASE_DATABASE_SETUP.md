# Supabase Database Setup Guide

## Your Supabase Project Details

- **Project URL**: https://coacymsqarronnlytceu.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvYWN5bXNxYXJyb25ubHl0Y2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzAxNzIsImV4cCI6MjA2NzcwNjE3Mn0.0Cw2EZ6jkBEMMLZ4qsdErYJesp6VjoQ1tQvbY27qIe8
- **Service Role**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvYWN5bXNxYXJyb25ubHl0Y2V1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjEzMDE3MiwiZXhwIjoyMDY3NzA2MTcyfQ.PEKZXP1S04y9NEp9roW5nNWabZSNpc6Jn-FO4NQbqPE

## Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Navigate to your project: **coacymsqarronnlytceu**

## Step 2: Apply Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire content from `supabase/migrations/20250201000010_comprehensive_app_fixes.sql`
4. Paste it into the SQL editor
5. Click **"Run"** to execute the migration

## Step 3: Verify Tables Were Created

Go to **Database** > **Tables** and verify these tables exist:

- ✅ orders (should have both `order_date` and `date` columns)
- ✅ charging_sessions
- ✅ expenses
- ✅ deposits
- ✅ withdrawals
- ✅ cooperative_savings
- ✅ categories
- ✅ payment_modes
- ✅ vat_entries
- ✅ inventory
- ✅ inventory_transactions
- ✅ expense_bookings
- ✅ custom_calculations
- ✅ balances
- ✅ menu_items

## Step 4: Check Functions

Go to **Database** > **Functions** and verify these functions exist:

- ✅ insert_order_safe
- ✅ calculate_vat
- ✅ daily_closing
- ✅ sync_order_date
- ✅ sync_charging_date
- ✅ sync_expense_date

## Step 5: Update Environment Variables

Update your local `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://coacymsqarronnlytceu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvYWN5bXNxYXJyb25ubHl0Y2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzAxNzIsImV4cCI6MjA2NzcwNjE3Mn0.0Cw2EZ6jkBEMMLZ4qsdErYJesp6VjoQ1tQvbY27qIe8
```

## Step 6: Test the Application

1. Restart your development server: `npm run dev`
2. Try these key features:
   - ✅ Order submission (should no longer show "record 'new' has no field 'date'" error)
   - ✅ VAT entry creation
   - ✅ Inventory management
   - ✅ Daily closing function
   - ✅ Navigation to all tabs (admin-panel, custom-reports/create, file-upload)

## Step 7: Authentication Setup

If you haven't set up authentication yet:

1. Go to **Authentication** > **Settings**
2. Enable **Email** provider
3. Set up **Redirect URLs** if needed
4. Add users in **Authentication** > **Users**

## Common Issues and Solutions

### Issue 1: "Table doesn't exist" errors

**Solution**: Make sure you ran the complete migration SQL script.

### Issue 2: "Permission denied" errors

**Solution**: Check that RLS policies are properly set up (they're included in the migration).

### Issue 3: Date field errors

**Solution**: The migration creates sync triggers that automatically handle date field synchronization.

### Issue 4: Function not found errors

**Solution**: Verify all functions were created and have proper permissions granted.

## Verification Checklist

After applying the migration, verify:

- [ ] No more "record 'new' has no field 'date'" errors
- [ ] Order submission works correctly
- [ ] VAT entries can be created
- [ ] Inventory management functions
- [ ] All navigation routes work (no 404 errors)
- [ ] Daily closing function works
- [ ] User authentication works

## Support

If you encounter any issues:

1. Check the browser console for detailed error messages
2. Check the Supabase dashboard logs
3. Verify all tables and functions exist
4. Ensure RLS policies are enabled and correct

The migration script is comprehensive and should resolve all the issues we've identified during our debugging session.
