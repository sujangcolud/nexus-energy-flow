-- Fix missing columns and view for Loan Management

-- Ensure columns exist in loans table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loans' AND column_name='created_at') THEN
        ALTER TABLE public.loans ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loans' AND column_name='updated_at') THEN
        ALTER TABLE public.loans ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loans' AND column_name='payment_mode') THEN
        ALTER TABLE public.loans ADD COLUMN payment_mode TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loans' AND column_name='description') THEN
        ALTER TABLE public.loans ADD COLUMN description TEXT;
    END IF;
END $$;

-- Recreate the view with all necessary columns
DROP VIEW IF EXISTS loan_summaries;
CREATE VIEW loan_summaries AS
SELECT
    l.id,
    l.user_id,
    l.loan_name,
    l.lender_name,
    l.loan_type,
    l.principal_amount,
    l.interest_rate,
    l.repayment_frequency,
    l.loan_date,
    l.maturity_date,
    l.payment_mode,
    l.status,
    l.description,
    l.created_at,
    l.updated_at,
    COALESCE(SUM(lr.amount_paid), 0) as total_paid,
    COALESCE(SUM(lr.principal_paid), 0) as principal_paid,
    COALESCE(SUM(lr.interest_paid), 0) as interest_paid,
    l.principal_amount - COALESCE(SUM(lr.principal_paid), 0) as outstanding_principal,
    MAX(lr.repayment_date) as last_repayment_date
FROM public.loans l
LEFT JOIN public.loan_repayments lr ON l.id = lr.loan_id
GROUP BY l.id, l.user_id, l.loan_name, l.lender_name, l.loan_type, l.principal_amount, l.interest_rate, l.repayment_frequency, l.loan_date, l.maturity_date, l.payment_mode, l.status, l.description, l.created_at, l.updated_at;

-- Re-apply permissions
GRANT SELECT ON loan_summaries TO authenticated;
