
-- Create menu_items table for admin to manage
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table to store generated reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL,
  report_data JSONB NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_cache table for performance
CREATE TABLE public.analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_items
CREATE POLICY "Everyone can view available menu items" ON public.menu_items
  FOR SELECT USING (is_available = true);
CREATE POLICY "Super admins can manage menu items" ON public.menu_items
  FOR ALL USING (public.has_role('super_admin'));

-- RLS Policies for reports
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super users can view all reports" ON public.reports
  FOR SELECT USING (public.has_role('super_user') OR public.has_role('super_admin'));
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for analytics_cache
CREATE POLICY "Super users can view analytics cache" ON public.analytics_cache
  FOR SELECT USING (public.has_role('super_user') OR public.has_role('super_admin'));
CREATE POLICY "Super users can manage analytics cache" ON public.analytics_cache
  FOR ALL USING (public.has_role('super_user') OR public.has_role('super_admin'));

-- Insert some sample menu items
INSERT INTO public.menu_items (name, description, price, category) VALUES
('Tea', 'Fresh hot tea', 25.00, 'Beverages'),
('Coffee', 'Premium coffee', 50.00, 'Beverages'),
('Sandwich', 'Grilled sandwich', 80.00, 'Snacks'),
('Biscuits', 'Assorted biscuits', 30.00, 'Snacks'),
('Water Bottle', 'Mineral water 500ml', 20.00, 'Beverages'),
('Instant Noodles', 'Quick noodles', 60.00, 'Meals'),
('Chips', 'Potato chips', 40.00, 'Snacks');

-- Create indexes for better performance
CREATE INDEX idx_orders_date ON public.orders(order_date);
CREATE INDEX idx_orders_user_date ON public.orders(user_id, order_date);
CREATE INDEX idx_charging_date ON public.charging_sessions(session_date);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_deposits_date ON public.deposits(deposit_date);
CREATE INDEX idx_withdrawals_date ON public.withdrawals(withdrawal_date);
CREATE INDEX idx_cooperative_date ON public.cooperative_savings(contribution_date);
CREATE INDEX idx_analytics_cache_key ON public.analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON public.analytics_cache(expires_at);
