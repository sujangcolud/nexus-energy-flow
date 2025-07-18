
-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('user', 'super_user', 'super_admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  rate DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_mode TEXT NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create charging_sessions table
CREATE TABLE public.charging_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_percentage DECIMAL(5,2),
  end_percentage DECIMAL(5,2),
  per_percent_rate DECIMAL(10,2),
  kcal DECIMAL(10,2),
  per_unit_rate DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL,
  payment_mode TEXT NOT NULL,
  session_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  remarks TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deposits table
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  mode TEXT NOT NULL,
  deposited_by TEXT NOT NULL,
  deposit_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  purpose TEXT NOT NULL,
  recipient TEXT,
  withdrawal_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cooperative_savings table
CREATE TABLE public.cooperative_savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id TEXT NOT NULL,
  contribution_amount DECIMAL(10,2) NOT NULL,
  cycle_period TEXT,
  contribution_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charging_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_savings ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = _role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Super admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role('super_admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for orders (users can manage their own, super_user+ can view all)
CREATE POLICY "Users can manage own orders" ON public.orders
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super users can view all orders" ON public.orders
  FOR SELECT USING (public.has_role('super_user') OR public.has_role('super_admin'));

-- RLS Policies for charging_sessions
CREATE POLICY "Users can manage own charging sessions" ON public.charging_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super users can view all charging sessions" ON public.charging_sessions
  FOR SELECT USING (public.has_role('super_user') OR public.has_role('super_admin'));

-- RLS Policies for expenses
CREATE POLICY "Users can manage own expenses" ON public.expenses
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super users can view all expenses" ON public.expenses
  FOR SELECT USING (public.has_role('super_user') OR public.has_role('super_admin'));

-- RLS Policies for deposits
CREATE POLICY "Users can manage own deposits" ON public.deposits
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super users can view all deposits" ON public.deposits
  FOR SELECT USING (public.has_role('super_user') OR public.has_role('super_admin'));

-- RLS Policies for withdrawals
CREATE POLICY "Users can manage own withdrawals" ON public.withdrawals
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super users can view all withdrawals" ON public.withdrawals
  FOR SELECT USING (public.has_role('super_user') OR public.has_role('super_admin'));

-- RLS Policies for cooperative_savings
CREATE POLICY "Users can manage own cooperative savings" ON public.cooperative_savings
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super users can view all cooperative savings" ON public.cooperative_savings
  FOR SELECT USING (public.has_role('super_user') OR public.has_role('super_admin'));

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
