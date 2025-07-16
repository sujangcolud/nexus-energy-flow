-- Add role column to profiles table to match what UserManagementTab expects
-- This is a computed/derived column that will be populated from user_roles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;

-- Update existing profiles to have role information
UPDATE public.profiles 
SET role = (
  SELECT ur.role::text 
  FROM public.user_roles ur 
  WHERE ur.user_id = profiles.id 
  LIMIT 1
);

-- Update the handle_new_user function to properly create profiles with role information
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  
  -- Assign default user role (first user gets super_admin, others get user)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'super_admin'::app_role
      ELSE 'user'::app_role
    END
  );
  
  -- Update the profile with the role
  UPDATE public.profiles 
  SET role = (
    SELECT ur.role::text 
    FROM public.user_roles ur 
    WHERE ur.user_id = NEW.id 
    LIMIT 1
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create a function to get user profiles with roles for the UserManagementTab
-- This replaces the need for the role column to be manually maintained
CREATE OR REPLACE FUNCTION public.get_user_profiles_with_roles()
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(ur.role::text, 'user') as role,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE public.is_super_admin();
$$;

-- Create a trigger function to keep the profiles.role column in sync with user_roles
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles 
    SET role = NEW.role::text
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET role = 'user'
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger to sync profile role when user_roles changes
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON public.user_roles;
CREATE TRIGGER sync_profile_role_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role();
