-- Fix for "cannot change return type of existing function" error
-- Run this first before running the complete schema

-- Drop the existing function that has the wrong return type
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;

-- Drop any other functions that might conflict
DROP FUNCTION IF EXISTS has_role(app_role) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_user_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS insert_order_safe(UUID, TEXT, INTEGER, DECIMAL, DECIMAL, TEXT, DATE) CASCADE;

-- Drop and recreate the enum if needed
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM (
  'user',
  'super_user', 
  'super_admin',
  'data_entry',
  'reports_viewer'
);

-- Now recreate the function with the correct return type
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role app_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'user'::app_role;
    END IF;
    
    SELECT role INTO user_role
    FROM user_roles
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF user_role IS NULL THEN
        RETURN 'user'::app_role;
    END IF;
    
    RETURN user_role;
END;
$$;

-- Recreate other essential functions
CREATE OR REPLACE FUNCTION has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role app_role;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    user_role := get_current_user_role();
    
    role_hierarchy := CASE user_role
        WHEN 'user' THEN 1
        WHEN 'data_entry' THEN 2
        WHEN 'reports_viewer' THEN 3
        WHEN 'super_user' THEN 4
        WHEN 'super_admin' THEN 5
        ELSE 0
    END;
    
    required_hierarchy := CASE _role
        WHEN 'user' THEN 1
        WHEN 'data_entry' THEN 2
        WHEN 'reports_viewer' THEN 3
        WHEN 'super_user' THEN 4
        WHEN 'super_admin' THEN 5
        ELSE 0
    END;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    check_user_id UUID;
    user_role app_role;
BEGIN
    check_user_id := COALESCE(user_id, auth.uid());
    
    SELECT role INTO user_role
    FROM user_roles
    WHERE user_roles.user_id = check_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN user_role = 'super_admin';
END;
$$;

-- Safe order insertion function
CREATE OR REPLACE FUNCTION insert_order_safe(
    p_user_id UUID,
    p_item_name TEXT,
    p_quantity INTEGER,
    p_rate DECIMAL,
    p_total DECIMAL,
    p_payment_mode TEXT,
    p_order_date DATE
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    item_name TEXT,
    quantity INTEGER,
    rate DECIMAL,
    total DECIMAL,
    payment_mode TEXT,
    order_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_order_id UUID;
BEGIN
    INSERT INTO orders (
        user_id,
        item_name,
        quantity,
        rate,
        total,
        payment_mode,
        order_date
    ) VALUES (
        p_user_id,
        p_item_name,
        p_quantity,
        p_rate,
        p_total,
        p_payment_mode,
        p_order_date
    ) RETURNING orders.id INTO new_order_id;
    
    RETURN QUERY
    SELECT 
        o.id,
        o.user_id,
        o.item_name,
        o.quantity,
        o.rate,
        o.total,
        o.payment_mode,
        o.order_date,
        o.created_at
    FROM orders o
    WHERE o.id = new_order_id;
END;
$$;

-- Success message
SELECT 'Function return type conflicts resolved. You can now run the complete schema.' as status;
