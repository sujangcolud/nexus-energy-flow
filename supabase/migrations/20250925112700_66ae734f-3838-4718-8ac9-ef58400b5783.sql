-- CRITICAL SECURITY FIXES - Phase 1: Data Exposure Prevention
-- Remove public access to sensitive financial and business data

-- 1. CRITICAL: Remove public access to daily_summary financial data
DROP POLICY IF EXISTS "daily_summary_select_all" ON daily_summary;

-- Replace with authenticated-only access
CREATE POLICY "Authenticated users can view daily summaries" 
ON daily_summary FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- 2. CRITICAL: Restrict menu_items to authenticated users only
DROP POLICY IF EXISTS "Everyone can view available menu items" ON menu_items;

-- Replace with authenticated access
CREATE POLICY "Authenticated users can view available menu items" 
ON menu_items FOR SELECT 
TO authenticated 
USING (is_available = true AND auth.uid() IS NOT NULL);

-- 3. Restrict category tables to authenticated users
-- Categories
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Authenticated users can view categories" 
ON categories FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Charging categories
DROP POLICY IF EXISTS "Anyone can view charging categories" ON charging_categories;
CREATE POLICY "Authenticated users can view charging categories" 
ON charging_categories FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Deposit categories
DROP POLICY IF EXISTS "Anyone can view deposit categories" ON deposit_categories;
CREATE POLICY "Authenticated users can view deposit categories" 
ON deposit_categories FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Expense categories
DROP POLICY IF EXISTS "Anyone can view expense categories" ON expense_categories;
CREATE POLICY "Authenticated users can view expense categories" 
ON expense_categories FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Expense booking categories
DROP POLICY IF EXISTS "Anyone can view expense booking categories" ON expense_booking_categories;
CREATE POLICY "Authenticated users can view expense booking categories" 
ON expense_booking_categories FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Savings categories
DROP POLICY IF EXISTS "Anyone can view savings categories" ON savings_categories;
CREATE POLICY "Authenticated users can view savings categories" 
ON savings_categories FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Withdrawal categories
DROP POLICY IF EXISTS "Anyone can view withdrawal categories" ON withdrawal_categories;
CREATE POLICY "Authenticated users can view withdrawal categories" 
ON withdrawal_categories FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- 4. Create missing security functions with proper search_path
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'::app_role
    );
END;
$function$;

-- 5. Fix existing functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_profiles_with_roles()
RETURNS TABLE(id uuid, email text, first_name text, last_name text, role text, created_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role text;
  role_hierarchy integer;
  required_hierarchy integer;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();

  role_hierarchy := CASE user_role
    WHEN 'super_admin' THEN 4
    WHEN 'reports_viewer' THEN 3
    WHEN 'data_entry' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END;

  required_hierarchy := CASE required_role
    WHEN 'super_admin' THEN 4
    WHEN 'reports_viewer' THEN 3
    WHEN 'data_entry' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END;

  RETURN role_hierarchy >= required_hierarchy;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    user_role app_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'user'::app_role;
    END IF;
    
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF user_role IS NULL THEN
        RETURN 'user'::app_role;
    END IF;
    
    RETURN user_role;
END;
$function$;

-- Fix RLS policy violations in logs table by adding proper INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create logs" ON logs;
CREATE POLICY "Authenticated users can create logs" 
ON logs FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);