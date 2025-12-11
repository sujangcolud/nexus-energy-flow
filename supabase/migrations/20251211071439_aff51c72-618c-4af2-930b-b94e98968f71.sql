-- Create share_expenses table for tracking expenses related to share investments
CREATE TABLE public.share_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  category TEXT DEFAULT 'general',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.share_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own share expenses"
ON public.share_expenses
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own share expenses"
ON public.share_expenses
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own share expenses"
ON public.share_expenses
FOR UPDATE
USING (auth.uid() = user_id);