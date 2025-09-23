-- Fix missing role column in user_roles table
-- This will resolve the authentication issues preventing form submissions

-- Add the missing role column with proper type
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS role app_role DEFAULT 'user'::app_role;

-- Update existing records to have proper roles based on profiles table
UPDATE user_roles 
SET role = profiles.role::app_role
FROM profiles 
WHERE user_roles.user_id = profiles.id 
AND profiles.role IS NOT NULL;

-- Insert missing user_roles records for users who have roles in profiles but no user_roles record
INSERT INTO user_roles (user_id, role)
SELECT p.id, p.role::app_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.user_id IS NULL 
AND p.role IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update RLS policies to work with the role column
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles 
FOR SELECT USING (auth.uid() = user_id);

-- Create policy for super admins to manage roles
CREATE POLICY "Super admins can manage user roles" ON user_roles 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'super_admin'
  )
);

-- Ensure the current user (Energy Palace) has proper role in user_roles
INSERT INTO user_roles (user_id, role) 
VALUES ('93986604-fe7e-44a3-9e23-fcfab7e8bedd', 'super_admin'::app_role)
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin'::app_role;