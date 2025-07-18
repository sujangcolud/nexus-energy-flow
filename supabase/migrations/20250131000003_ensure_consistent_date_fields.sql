-- Ensure all tables have consistent date field naming for any triggers that might expect 'date' fields

-- Add 'date' columns to other tables if they don't exist (as aliases to their specific date fields)

-- For charging_sessions table (session_date -> date)
ALTER TABLE public.charging_sessions ADD COLUMN IF NOT EXISTS date DATE;

CREATE OR REPLACE FUNCTION public.sync_charging_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date = NEW.session_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_charging_date_trigger ON public.charging_sessions;
CREATE TRIGGER sync_charging_date_trigger
  BEFORE INSERT OR UPDATE ON public.charging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_charging_date();

UPDATE public.charging_sessions SET date = session_date WHERE date IS NULL;

-- For expenses table (expense_date -> date)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS date DATE;

CREATE OR REPLACE FUNCTION public.sync_expense_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date = NEW.expense_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_expense_date_trigger ON public.expenses;
CREATE TRIGGER sync_expense_date_trigger
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_expense_date();

UPDATE public.expenses SET date = expense_date WHERE date IS NULL;

-- For deposits table (deposit_date -> date)
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS date DATE;

CREATE OR REPLACE FUNCTION public.sync_deposit_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date = NEW.deposit_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_deposit_date_trigger ON public.deposits;
CREATE TRIGGER sync_deposit_date_trigger
  BEFORE INSERT OR UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_deposit_date();

UPDATE public.deposits SET date = deposit_date WHERE date IS NULL;

-- For withdrawals table (withdrawal_date -> date)
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS date DATE;

CREATE OR REPLACE FUNCTION public.sync_withdrawal_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date = NEW.withdrawal_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_withdrawal_date_trigger ON public.withdrawals;
CREATE TRIGGER sync_withdrawal_date_trigger
  BEFORE INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_withdrawal_date();

UPDATE public.withdrawals SET date = withdrawal_date WHERE date IS NULL;

-- For cooperative_savings table (contribution_date -> date)
ALTER TABLE public.cooperative_savings ADD COLUMN IF NOT EXISTS date DATE;

CREATE OR REPLACE FUNCTION public.sync_cooperative_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date = NEW.contribution_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_cooperative_date_trigger ON public.cooperative_savings;
CREATE TRIGGER sync_cooperative_date_trigger
  BEFORE INSERT OR UPDATE ON public.cooperative_savings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cooperative_date();

UPDATE public.cooperative_savings SET date = contribution_date WHERE date IS NULL;
