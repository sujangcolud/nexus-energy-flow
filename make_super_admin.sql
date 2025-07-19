-- Make sujan1nepal@gmail.com super admin
-- This script updates the user's role to super_admin in the auth.users table

-- First, let's check if the user exists
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'sujan1nepal@gmail.com';

-- Update the user's metadata to include super_admin role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'::jsonb
)
WHERE email = 'sujan1nepal@gmail.com';

-- If you have a separate roles table, also update it
-- UPDATE user_roles 
-- SET role = 'super_admin' 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sujan1nepal@gmail.com');

-- Verify the update
SELECT id, email, raw_user_meta_data->'role' as role
FROM auth.users 
WHERE email = 'sujan1nepal@gmail.com';
