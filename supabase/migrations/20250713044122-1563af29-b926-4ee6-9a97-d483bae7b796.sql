
-- Fix the infinite recursion issue in user_roles policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

-- Create a simpler policy that avoids recursion by using a security definer function
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND role = 'super_admin'
  );
$$;

-- Create new policies using the security definer function
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.is_super_admin());

-- Also update the get_all_users_with_roles function to use the new approach
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
  WHERE public.is_super_admin();
$$;

-- Update the update_user_role function to use the new approach
CREATE OR REPLACE FUNCTION public.update_user_role(user_id_to_update uuid, new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super_admin can update roles
  IF NOT public.is_super_admin() THEN
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
