
-- First, let's update the app_role enum to match your requirements
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'data_entry';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reports_viewer';

-- Create a function to get all users with their roles (for super_admin use)
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  role app_role
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    au.id,
    au.email,
    COALESCE(ur.role, 'user'::app_role) as role
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON au.id = ur.user_id
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Create a function to update user roles (for super_admin use)
CREATE OR REPLACE FUNCTION public.update_user_role(user_id_to_update uuid, new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super_admin can update roles
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can update user roles';
  END IF;

  -- Update or insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id_to_update, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Remove old roles for this user (since we want one role per user)
  DELETE FROM public.user_roles 
  WHERE user_id = user_id_to_update AND role != new_role;
END;
$$;

-- Set up specific user roles based on your requirements
-- Note: These will only work if the users already exist in your system
DO $$
BEGIN
  -- Set sujan1nepal@gmail.com as super_admin
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'sujan1nepal@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'sujan1nepal@gmail.com'
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Set bishnu@energypalace.com.np as data_entry
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'bishnu@energypalace.com.np') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'data_entry'::app_role FROM auth.users WHERE email = 'bishnu@energypalace.com.np'
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Set sujit@energypalace.com.np as reports_viewer
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'sujit@energypalace.com.np') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'reports_viewer'::app_role FROM auth.users WHERE email = 'sujit@energypalace.com.np'
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Set admin@energypalace.com.np as super_admin
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@energypalace.com.np') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'admin@energypalace.com.np'
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Update RLS policies for user_roles table to allow super_admin to manage roles
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
