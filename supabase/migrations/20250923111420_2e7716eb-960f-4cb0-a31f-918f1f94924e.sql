-- Fix user_roles table structure to resolve authentication issues
-- This will enable proper form submissions

-- First, add the missing role column to user_roles table
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS role app_role DEFAULT 'user'::app_role;

-- Add unique constraint on user_id for proper ON CONFLICT handling
-- Drop existing constraint if it exists and recreate
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- Now we can safely update existing user_roles records
UPDATE user_roles 
SET role = COALESCE(profiles.role::app_role, 'user'::app_role)
FROM profiles 
WHERE user_roles.user_id = profiles.id;

-- Insert missing user_roles records for users who exist in profiles but not in user_roles
INSERT INTO user_roles (user_id, role)
SELECT p.id, COALESCE(p.role::app_role, 'user'::app_role)
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id) DO UPDATE SET 
role = EXCLUDED.role;

-- Ensure the current super admin user exists in user_roles
INSERT INTO user_roles (user_id, role) 
VALUES ('93986604-fe7e-44a3-9e23-fcfab7e8bedd', 'super_admin'::app_role)
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin'::app_role;

-- Update RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles 
FOR SELECT USING (auth.uid() = user_id);

-- Allow super admins to manage user roles
DROP POLICY IF EXISTS "Super admins can manage user roles" ON user_roles;
CREATE POLICY "Super admins can manage user roles" ON user_roles 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'super_admin'
  )
);