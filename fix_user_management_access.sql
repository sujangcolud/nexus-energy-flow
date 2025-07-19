-- Fix get_all_users_with_roles function to be accessible by all authenticated users
-- Since role restrictions have been removed, this function should be available to everyone

CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
    id UUID,
    email TEXT,
    role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Allow all authenticated users to view user list
    -- (role restrictions have been removed as per requirements)
    
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        COALESCE(ur.role, 'user'::app_role) as role
    FROM profiles p
    LEFT JOIN user_roles ur ON p.id = ur.user_id
    ORDER BY p.created_at DESC;
END;
$$;

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION get_all_users_with_roles TO authenticated;

-- Also create a fallback function that gets user info from auth.users if profiles is empty
CREATE OR REPLACE FUNCTION get_users_from_auth()
RETURNS TABLE(
    id UUID,
    email TEXT,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'role', 'user') as role
    FROM auth.users au
    WHERE au.email IS NOT NULL
    ORDER BY au.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_users_from_auth TO authenticated;
