
-- Update withdrawals table to include missing columns
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Update the RLS policies to ensure the new columns are accessible
DROP POLICY IF EXISTS "Users can manage own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can manage own withdrawals" 
  ON public.withdrawals 
  FOR ALL 
  USING (auth.uid() = user_id);
