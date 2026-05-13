-- Robust fix for Loan Management Schema and View

-- Ensure all required columns exist in public.loans
DO $$
BEGIN
    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'created_at') THEN
        ALTER TABLE public.loans ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'updated_at') THEN
        ALTER TABLE public.loans ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- payment_mode
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'payment_mode') THEN
        ALTER TABLE public.loans ADD COLUMN payment_mode TEXT;
    END IF;

    -- description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'description') THEN
        ALTER TABLE public.loans ADD COLUMN description TEXT;
    END IF;
END $$;

-- Drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.loan_summaries CASCADE;

CREATE VIEW public.loan_summaries WITH (security_invoker = true) AS
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
GROUP BY
    l.id, l.user_id, l.loan_name, l.lender_name, l.loan_type,
    l.principal_amount, l.interest_rate, l.repayment_frequency,
    l.loan_date, l.maturity_date, l.payment_mode, l.status,
    l.description, l.created_at, l.updated_at;

-- Re-apply explicit permissions for authenticated users only
GRANT SELECT ON public.loan_summaries TO authenticated;
GRANT SELECT ON public.loan_summaries TO service_role;

-- Force a PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
