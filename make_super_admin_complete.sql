-- Make sujan1nepal@gmail.com super admin
-- This script updates the user's role in all relevant tables

-- Step 1: Check current user status
SELECT 
  u.id, 
  u.email, 
  u.raw_user_meta_data->'role' as auth_role,
  p.role as profile_role,
  ur.role as user_roles_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sujan1nepal@gmail.com';

-- Step 2: Update auth.users metadata
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'::jsonb
)
WHERE email = 'sujan1nepal@gmail.com';

-- Step 3: Update or insert into profiles table
INSERT INTO profiles (id, email, role, first_name, last_name)
SELECT 
  id, 
  email, 
  'super_admin' as role,
  'Sujan' as first_name,
  'Nepal' as last_name
FROM auth.users 
WHERE email = 'sujan1nepal@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'super_admin',
  updated_at = now();

-- Step 4: Update or insert into user_roles table
INSERT INTO user_roles (user_id, role)
SELECT 
  id, 
  'super_admin'::app_role
FROM auth.users 
WHERE email = 'sujan1nepal@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'super_admin'::app_role;

-- Step 5: Verify all updates
SELECT 
  u.id, 
  u.email, 
  u.raw_user_meta_data->'role' as auth_role,
  p.role as profile_role,
  ur.role as user_roles_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sujan1nepal@gmail.com';

-- Optional: Grant any additional super admin permissions if needed
-- This ensures the user has all necessary permissions
