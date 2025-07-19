-- Fix for ur.role column error - create proper user_roles table and functions

-- First ensure app_role enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('user', 'data_entry', 'reports_viewer', 'super_admin');
    END IF;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role app_role DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles" ON public.user_roles 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
);

CREATE POLICY "Super admins can manage all roles" ON public.user_roles 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
);

-- Create or replace the function that's causing the error
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE (
    id UUID,
    email TEXT,
    role app_role
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is a super admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin role required.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        COALESCE(ur.role, 'user'::app_role) as role
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.email IS NOT NULL
    ORDER BY u.created_at DESC;
END;
$$;

-- Create helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role app_role;
BEGIN
    SELECT COALESCE(ur.role, 'user'::app_role)
    INTO user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'user'::app_role);
END;
$$;

-- Create function to set user role (for super admins)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is a super admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin role required.';
    END IF;

    -- Upsert the role
    INSERT INTO public.user_roles (user_id, role, updated_at)
    VALUES (target_user_id, new_role, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        role = EXCLUDED.role,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Create user role distribution function for analytics
CREATE OR REPLACE FUNCTION public.get_user_role_distribution()
RETURNS TABLE (
    role TEXT,
    count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is a super admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin role required.';
    END IF;

    RETURN QUERY
    SELECT 
        COALESCE(ur.role::TEXT, 'user') as role,
        COUNT(*) as count
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.email IS NOT NULL
    GROUP BY ur.role
    ORDER BY count DESC;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT EXECUTE ON FUNCTION public.get_all_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO authenticated;

-- Insert default role for existing users who don't have one
INSERT INTO public.user_roles (user_id, role)
SELECT 
    u.id,
    CASE 
        WHEN u.email = 'sujan1nepal@gmail.com' THEN 'super_admin'::app_role
        ELSE 'user'::app_role
    END
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.user_roles WHERE user_id IS NOT NULL)
AND u.email IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the setup
SELECT 
    'user_roles table created' as status,
    COUNT(*) as user_count 
FROM public.user_roles;
