-- Fix the function return type error
-- Drop the existing function first as suggested by the error message

DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Recreate the function with correct return type
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_current_user_role() IS 'Get current authenticated user role - fixed return type';
