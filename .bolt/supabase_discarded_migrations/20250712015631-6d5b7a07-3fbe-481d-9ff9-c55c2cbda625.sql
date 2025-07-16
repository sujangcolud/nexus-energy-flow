
-- Create static_expenses table for storing static and recurring expenses
CREATE TABLE public.static_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.static_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for static_expenses
CREATE POLICY "Users can manage own static expenses" 
  ON public.static_expenses 
  FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Super users can view all static expenses" 
  ON public.static_expenses 
  FOR SELECT 
  USING (has_role('super_user'::app_role) OR has_role('super_admin'::app_role));
