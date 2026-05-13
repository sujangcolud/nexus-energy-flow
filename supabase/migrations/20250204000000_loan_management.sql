-- Migration for Loan Management Module

-- Create Loan Type Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_type') THEN
        CREATE TYPE loan_type AS ENUM ('banking', 'cooperative', 'local');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repayment_frequency') THEN
        CREATE TYPE repayment_frequency AS ENUM ('daily', 'weekly', 'monthly');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
        CREATE TYPE loan_status AS ENUM ('active', 'closed', 'defaulted');
    END IF;
END $$;

-- Create Loans Table
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_name TEXT NOT NULL,
    lender_name TEXT NOT NULL,
    loan_type loan_type NOT NULL,
    principal_amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL, -- Annual interest rate in percentage
    repayment_frequency repayment_frequency NOT NULL,
    loan_date DATE DEFAULT CURRENT_DATE,
    maturity_date DATE,
    status loan_status DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loans" ON public.loans
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own loans" ON public.loans
FOR ALL USING (auth.uid() = user_id);

-- Create Loan Repayments Table
CREATE TABLE IF NOT EXISTS public.loan_repayments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_paid DECIMAL(12,2) NOT NULL,
    principal_paid DECIMAL(12,2) NOT NULL,
    interest_paid DECIMAL(12,2) NOT NULL,
    repayment_date DATE DEFAULT CURRENT_DATE,
    payment_mode TEXT NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for loan_repayments
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loan repayments" ON public.loan_repayments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own loan repayments" ON public.loan_repayments
FOR ALL USING (auth.uid() = user_id);

-- Function to process loan repayment and update balances
CREATE OR REPLACE FUNCTION process_loan_repayment(
    p_loan_id UUID,
    p_user_id UUID,
    p_amount_paid DECIMAL,
    p_principal_paid DECIMAL,
    p_interest_paid DECIMAL,
    p_repayment_date DATE,
    p_payment_mode TEXT,
    p_remarks TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_repayment_id UUID;
    v_column_name TEXT;
BEGIN
    -- Insert the repayment record
    INSERT INTO public.loan_repayments (
        loan_id,
        user_id,
        amount_paid,
        principal_paid,
        interest_paid,
        repayment_date,
        payment_mode,
        remarks
    ) VALUES (
        p_loan_id,
        p_user_id,
        p_amount_paid,
        p_principal_paid,
        p_interest_paid,
        p_repayment_date,
        p_payment_mode,
        p_remarks
    ) RETURNING id INTO v_repayment_id;

    -- Map payment mode to balance column
    v_column_name := CASE LOWER(p_payment_mode)
        WHEN 'cash' THEN 'cash_in_hand'
        WHEN 'bank transfer' THEN 'bank_balance'
        WHEN 'esewa' THEN 'esewa_balance'
        WHEN 'fonepay' THEN 'fonepay_balance'
        WHEN 'cooperative' THEN 'cooperative_balance'
        ELSE 'cash_in_hand'
    END;

    -- Update user balances (decrease balance because it's a repayment/outflow)
    EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = $2', v_column_name, v_column_name)
    USING p_amount_paid, p_user_id;

    -- Log the action
    INSERT INTO public.logs (user_id, action, table_name, record_id, details)
    VALUES (p_user_id, 'loan_repayment', 'loan_repayments', v_repayment_id, jsonb_build_object(
        'loan_id', p_loan_id,
        'amount', p_amount_paid,
        'principal', p_principal_paid,
        'interest', p_interest_paid
    ));

    RETURN v_repayment_id;
END;
$$;

-- Function to process new loan and update balances
CREATE OR REPLACE FUNCTION process_new_loan(
    p_user_id UUID,
    p_loan_name TEXT,
    p_lender_name TEXT,
    p_loan_type loan_type,
    p_principal_amount DECIMAL,
    p_interest_rate DECIMAL,
    p_repayment_frequency repayment_frequency,
    p_loan_date DATE,
    p_maturity_date DATE,
    p_payment_mode TEXT,
    p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_loan_id UUID;
    v_column_name TEXT;
BEGIN
    -- Insert the loan record
    INSERT INTO public.loans (
        user_id,
        loan_name,
        lender_name,
        loan_type,
        principal_amount,
        interest_rate,
        repayment_frequency,
        loan_date,
        maturity_date,
        description
    ) VALUES (
        p_user_id,
        p_loan_name,
        p_lender_name,
        p_loan_type,
        p_principal_amount,
        p_interest_rate,
        p_repayment_frequency,
        p_loan_date,
        p_maturity_date,
        p_description
    ) RETURNING id INTO v_loan_id;

    -- Map payment mode to balance column
    v_column_name := CASE LOWER(p_payment_mode)
        WHEN 'cash' THEN 'cash_in_hand'
        WHEN 'bank transfer' THEN 'bank_balance'
        WHEN 'esewa' THEN 'esewa_balance'
        WHEN 'fonepay' THEN 'fonepay_balance'
        WHEN 'cooperative' THEN 'cooperative_balance'
        ELSE 'cash_in_hand'
    END;

    -- Update user balances (increase balance because it's a loan inflow)
    EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = $2', v_column_name, v_column_name)
    USING p_principal_amount, p_user_id;

    -- Log the action
    INSERT INTO public.logs (user_id, action, table_name, record_id, details)
    VALUES (p_user_id, 'new_loan', 'loans', v_loan_id, jsonb_build_object(
        'loan_name', p_loan_name,
        'amount', p_principal_amount,
        'payment_mode', p_payment_mode
    ));

    RETURN v_loan_id;
END;
$$;

-- Create View for Loan Summaries
CREATE OR REPLACE VIEW loan_summaries AS
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
    l.status,
    COALESCE(SUM(lr.amount_paid), 0) as total_paid,
    COALESCE(SUM(lr.principal_paid), 0) as principal_paid,
    COALESCE(SUM(lr.interest_paid), 0) as interest_paid,
    l.principal_amount - COALESCE(SUM(lr.principal_paid), 0) as outstanding_principal,
    MAX(lr.repayment_date) as last_repayment_date
FROM public.loans l
LEFT JOIN public.loan_repayments lr ON l.id = lr.loan_id
GROUP BY l.id;

-- Apply permissions to the new view
GRANT SELECT ON loan_summaries TO authenticated;
