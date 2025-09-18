-- Fix RLS Security Issues: Enable RLS on tables that are missing it

-- Enable RLS on balances table
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own balances" ON public.balances
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balances" ON public.balances
FOR ALL USING (auth.uid() = user_id);

-- Enable RLS on user_tab_permissions table
ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own permissions" ON public.user_tab_permissions
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all permissions" ON public.user_tab_permissions
FOR ALL USING (has_role('super_admin'::text));

-- Enable RLS on logs table (audit logs)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all logs" ON public.logs
FOR SELECT USING (has_role('super_admin'::text));
CREATE POLICY "Users can view own logs" ON public.logs
FOR SELECT USING (auth.uid() = user_id);

-- Enable RLS on daily_summary table
ALTER TABLE public.daily_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view daily summaries" ON public.daily_summary
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Enable RLS on analytics_cache table
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage analytics cache" ON public.analytics_cache
FOR ALL USING (auth.uid() IS NOT NULL);

-- Enable RLS on edit_logs table
ALTER TABLE public.edit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all edit logs" ON public.edit_logs
FOR SELECT USING (has_role('super_admin'::text));
CREATE POLICY "Users can view own edit logs" ON public.edit_logs
FOR SELECT USING (auth.uid() = user_id);

-- Enable RLS on categories tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.categories
FOR SELECT USING (true);
CREATE POLICY "Super admins can manage categories" ON public.categories
FOR ALL USING (has_role('super_admin'::text));

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view expense categories" ON public.expense_categories
FOR SELECT USING (true);
CREATE POLICY "Super admins can manage expense categories" ON public.expense_categories
FOR ALL USING (has_role('super_admin'::text));

ALTER TABLE public.charging_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view charging categories" ON public.charging_categories
FOR SELECT USING (true);
CREATE POLICY "Super admins can manage charging categories" ON public.charging_categories
FOR ALL USING (has_role('super_admin'::text));

ALTER TABLE public.deposit_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view deposit categories" ON public.deposit_categories
FOR SELECT USING (true);
CREATE POLICY "Super admins can manage deposit categories" ON public.deposit_categories
FOR ALL USING (has_role('super_admin'::text));

ALTER TABLE public.withdrawal_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view withdrawal categories" ON public.withdrawal_categories
FOR SELECT USING (true);
CREATE POLICY "Super admins can manage withdrawal categories" ON public.withdrawal_categories
FOR ALL USING (has_role('super_admin'::text));

ALTER TABLE public.savings_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view savings categories" ON public.savings_categories
FOR SELECT USING (true);
CREATE POLICY "Super admins can manage savings categories" ON public.savings_categories
FOR ALL USING (has_role('super_admin'::text));

ALTER TABLE public.expense_booking_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view expense booking categories" ON public.expense_booking_categories
FOR SELECT USING (true);
CREATE POLICY "Super admins can manage expense booking categories" ON public.expense_booking_categories
FOR ALL USING (has_role('super_admin'::text));

-- Enable RLS on balance_sheet table
ALTER TABLE public.balance_sheet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own balance sheets" ON public.balance_sheet
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own balance sheets" ON public.balance_sheet
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.balances TO authenticated;
GRANT ALL ON public.user_tab_permissions TO authenticated;
GRANT ALL ON public.logs TO authenticated;
GRANT ALL ON public.daily_summary TO authenticated;
GRANT ALL ON public.analytics_cache TO authenticated;
GRANT ALL ON public.edit_logs TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.expense_categories TO authenticated;
GRANT ALL ON public.charging_categories TO authenticated;
GRANT ALL ON public.deposit_categories TO authenticated;
GRANT ALL ON public.withdrawal_categories TO authenticated;
GRANT ALL ON public.savings_categories TO authenticated;
GRANT ALL ON public.expense_booking_categories TO authenticated;
GRANT ALL ON public.balance_sheet TO authenticated;