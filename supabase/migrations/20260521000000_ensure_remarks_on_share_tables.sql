-- Ensure remarks column exists on both share_investments and share_expenses
ALTER TABLE public.share_investments ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.share_expenses ADD COLUMN IF NOT EXISTS remarks TEXT;
