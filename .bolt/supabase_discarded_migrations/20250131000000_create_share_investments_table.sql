-- Create share_investments table for the new Share Investments tab
CREATE TABLE public.share_investments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  shareholder_name text NOT NULL,
  contribution_amount numeric NOT NULL,
  investment_date date DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create opening_balances table for cutoff date and opening balance management
CREATE TABLE public.opening_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  cutoff_date date NOT NULL,
  opening_balance_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id) -- Only one opening balance per user
);

-- Enable RLS on share_investments table
ALTER TABLE public.share_investments ENABLE ROW LEVEL SECURITY;

-- RLS policies for share_investments
CREATE POLICY "Super users can view all share investments" 
  ON public.share_investments 
  FOR SELECT 
  USING (has_role('super_user'::app_role) OR has_role('super_admin'::app_role));

CREATE POLICY "Users can manage own share investments" 
  ON public.share_investments 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Enable RLS on opening_balances table
ALTER TABLE public.opening_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for opening_balances
CREATE POLICY "Super users can view all opening balances" 
  ON public.opening_balances 
  FOR SELECT 
  USING (has_role('super_user'::app_role) OR has_role('super_admin'::app_role));

CREATE POLICY "Users can manage own opening balances" 
  ON public.opening_balances 
  FOR ALL 
  USING (auth.uid() = user_id);
