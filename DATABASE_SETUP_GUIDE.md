# Complete Database Setup Guide for Energy Palace Nexus

## Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `energy-palace-nexus` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait for project to be created (2-3 minutes)

## Step 2: Apply Database Schema

1. Once your project is ready, go to the **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy the entire content from `database_schema_complete.sql` file
4. Paste it into the SQL editor
5. Click "Run" to execute the schema
6. You should see "Success. No rows returned" message

## Step 3: Get Your Connection Details

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon public key** (long string starting with `eyJ...`)

## Step 4: Update Your Web App Configuration

1. Open your project in the code editor
2. Navigate to `src/integrations/supabase/client.ts`
3. Replace the existing values with your new ones:

```typescript
const SUPABASE_URL = "YOUR_NEW_PROJECT_URL_HERE";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_NEW_ANON_KEY_HERE";
```

## Step 5: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add your application URL:
   - For local development: `http://localhost:5173`
   - For production: your actual domain
3. Under **Redirect URLs**, add:
   - `http://localhost:5173/dashboard` (for local)
   - `https://yourdomain.com/dashboard` (for production)

## Step 6: Enable Email Authentication (Optional but Recommended)

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider if not already enabled
3. Configure email templates in **Authentication** → **Templates** if desired

## Step 7: Test the Connection

1. Save your changes to `client.ts`
2. Restart your development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```
3. Try to sign up for a new account
4. Check if the user appears in **Authentication** → **Users** in Supabase dashboard

## Step 8: Create Your First Admin User

1. Sign up through your app with your email
2. In Supabase dashboard, go to **Authentication** → **Users**
3. Find your user and copy the User UID
4. Go to **SQL Editor** and run this query to make yourself super admin:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_UID_HERE', 'super_admin');
```

## Step 9: Verify Everything Works

1. Log out and log back in to your app
2. Navigate to different sections (Orders, Expenses, etc.)
3. Try creating some test data
4. Check that data appears in **Table Editor** in Supabase dashboard

## Step 10: Set Up Row Level Security (Already Done)

The schema includes all necessary RLS policies, but you can verify:

1. Go to **Authentication** → **Policies** in Supabase dashboard
2. You should see policies for all tables
3. All policies should show as "Enabled"

## Common Issues and Solutions

### Issue: "Invalid login credentials" error

**Solution**: Make sure you're using the correct Project URL and Anon key from your NEW project.

### Issue: "Failed to fetch" errors

**Solution**:

1. Check that your Supabase project is running (not paused)
2. Verify the Project URL is correct
3. Check your internet connection

### Issue: Can't see user data after login

**Solution**:

1. Make sure the user was created in Authentication → Users
2. Check that the `handle_new_user()` trigger created profile and role records
3. Run this SQL to check: `SELECT * FROM profiles; SELECT * FROM user_roles;`

### Issue: RLS policies blocking access

**Solution**:

1. Verify user is properly authenticated
2. Check that user_id matches in database records
3. Test policies in SQL Editor

## Environment Variables (Alternative Setup)

Instead of hardcoding in client.ts, you can use environment variables:

1. Create `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Update `client.ts` to use environment variables:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

## Security Notes

1. **Never commit secrets**: Don't commit your Supabase keys to version control
2. **Use environment variables**: For production deployments
3. **RLS is enabled**: All tables have Row Level Security enabled
4. **Admin functions**: Only super_admin users can access admin functions

## Next Steps

After completing this setup:

1. **Test all features**: Go through each tab/module in your app
2. **Create test data**: Add some sample orders, expenses, etc.
3. **Backup your data**: Export important data regularly
4. **Monitor usage**: Check Supabase dashboard for usage metrics
5. **Set up backups**: Configure automated backups in Supabase

## Support

If you encounter issues:

1. Check Supabase dashboard logs (**Logs & Analytics**)
2. Check browser console for JavaScript errors
3. Verify database schema was applied correctly
4. Test SQL queries directly in SQL Editor

Your database is now fully set up and ready to use! 🎉
