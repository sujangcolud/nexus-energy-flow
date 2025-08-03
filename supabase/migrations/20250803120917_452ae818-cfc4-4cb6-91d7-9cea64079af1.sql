
-- Phase 1: Critical Database Security Fixes

-- 1. Fix User Roles Schema - Add missing role column with proper enum type
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role app_role DEFAULT 'user';

-- 2. Update existing user roles to have proper values
UPDATE public.user_roles 
SET role = 'super_admin'::app_role 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'sujan1nepal@gmail.com'
) AND role IS NULL;

UPDATE public.user_roles 
SET role = 'user'::app_role 
WHERE role IS NULL;

-- 3. Make role column NOT NULL after setting defaults
ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;

-- 4. Create Missing RLS Policies for tables that have RLS enabled but no policies

-- Analytics cache policies
CREATE POLICY "Users can view their own analytics cache" 
ON public.analytics_cache FOR SELECT 
USING (true); -- Public read for analytics

CREATE POLICY "System can manage analytics cache" 
ON public.analytics_cache FOR ALL 
USING (true); -- Allow system operations

-- Balance sheet policies  
CREATE POLICY "Users can view their own balance sheets" 
ON public.balance_sheet FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own balance sheets" 
ON public.balance_sheet FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Balances policies
CREATE POLICY "Users can view their own balances" 
ON public.balances FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own balances" 
ON public.balances FOR ALL 
USING (auth.uid() = user_id);

-- Categories policies (shared resources)
CREATE POLICY "Anyone can view categories" 
ON public.categories FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage categories" 
ON public.categories FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Charging categories policies
CREATE POLICY "Anyone can view charging categories" 
ON public.charging_categories FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage charging categories" 
ON public.charging_categories FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Deposit categories policies
CREATE POLICY "Anyone can view deposit categories" 
ON public.deposit_categories FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage deposit categories" 
ON public.deposit_categories FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Edit logs policies (audit trail)
CREATE POLICY "Users can view their own edit logs" 
ON public.edit_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create edit logs" 
ON public.edit_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all edit logs" 
ON public.edit_logs FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Expense booking categories policies
CREATE POLICY "Anyone can view expense booking categories" 
ON public.expense_booking_categories FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage expense booking categories" 
ON public.expense_booking_categories FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Expense categories policies
CREATE POLICY "Anyone can view expense categories" 
ON public.expense_categories FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage expense categories" 
ON public.expense_categories FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Logs policies (system logs)
CREATE POLICY "Users can view their own logs" 
ON public.logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create logs" 
ON public.logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all logs" 
ON public.logs FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Savings categories policies
CREATE POLICY "Anyone can view savings categories" 
ON public.savings_categories FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage savings categories" 
ON public.savings_categories FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- User tab permissions policies
CREATE POLICY "Users can view their own tab permissions" 
ON public.user_tab_permissions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all tab permissions" 
ON public.user_tab_permissions FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Withdrawal categories policies
CREATE POLICY "Anyone can view withdrawal categories" 
ON public.withdrawal_categories FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage withdrawal categories" 
ON public.withdrawal_categories FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- 5. Secure Database Functions - Add search_path parameter to prevent schema confusion attacks

-- Update get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update has_role text function
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  user_role text;
  role_hierarchy integer;
  required_hierarchy integer;
BEGIN
  SELECT ur.role::text INTO user_role 
  FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

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

-- Update get_all_users_with_roles function
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE(id uuid, email text, first_name text, last_name text, role text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF (SELECT public.get_current_user_role()) != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(ur.role::text, 'user') as role,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  ORDER BY p.created_at DESC;
END;
$function$;

-- Update other critical functions with search_path
CREATE OR REPLACE FUNCTION public.insert_order_safe(p_user_id uuid, p_item_name text, p_quantity integer, p_rate numeric, p_total numeric, p_payment_mode text, p_order_date date)
RETURNS TABLE(id uuid, user_id uuid, item_name text, quantity integer, rate numeric, total numeric, payment_mode text, order_date date, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    new_order_id UUID;
BEGIN
    INSERT INTO public.orders (
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
    FROM public.orders o
    WHERE o.id = new_order_id;
END;
$function$;

-- Add security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_action text,
  p_table_name text,
  p_record_id text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.logs (user_id, action, table_name, record_id, details)
  VALUES (p_user_id, p_action, p_table_name, p_record_id, p_details);
END;
$function$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, text, jsonb) TO authenticated;
