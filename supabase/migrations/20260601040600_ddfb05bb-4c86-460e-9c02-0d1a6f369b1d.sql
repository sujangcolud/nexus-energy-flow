
-- =========================================================================
-- STAFF ADVANCE + PAYROLL MODULE
-- =========================================================================

-- 1. EMPLOYEES MASTER -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable: not every employee logs in
  full_name TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  joining_date DATE,
  pan_number TEXT,
  ssf_number TEXT,
  bank_name TEXT,
  bank_account TEXT,
  marital_status TEXT NOT NULL DEFAULT 'single' CHECK (marital_status IN ('single','married')),
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view employees"
  ON public.employees FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages employees"
  ON public.employees FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_active  ON public.employees(is_active);

-- 2. STAFF ADVANCES (REQUESTS) -------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_requested NUMERIC NOT NULL CHECK (amount_requested > 0),
  amount_approved NUMERIC,
  amount_disbursed NUMERIC NOT NULL DEFAULT 0,
  amount_settled NUMERIC NOT NULL DEFAULT 0,
  outstanding_amount NUMERIC GENERATED ALWAYS AS (COALESCE(amount_disbursed,0) - COALESCE(amount_settled,0)) STORED,
  reason TEXT,
  settlement_method TEXT NOT NULL DEFAULT 'salary_deduction'
    CHECK (settlement_method IN ('salary_deduction','expense_settlement','mixed')),
  expected_settlement_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','rejected','disbursed','partially_settled','fully_settled')),
  requested_by UUID NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_advances TO authenticated;
GRANT ALL ON public.staff_advances TO service_role;
ALTER TABLE public.staff_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view staff_advances"
  ON public.staff_advances FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages staff_advances"
  ON public.staff_advances FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX IF NOT EXISTS idx_advances_employee ON public.staff_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_status   ON public.staff_advances(status);

-- 3. ADVANCE APPROVAL LOG ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advance_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advance_id UUID NOT NULL REFERENCES public.staff_advances(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted','approved','rejected','revised','reopened')),
  acted_by UUID NOT NULL,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  remarks TEXT
);

GRANT SELECT, INSERT ON public.advance_approvals TO authenticated;
GRANT ALL ON public.advance_approvals TO service_role;
ALTER TABLE public.advance_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view advance_approvals"
  ON public.advance_approvals FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin can append advance_approvals"
  ON public.advance_approvals FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() AND acted_by = auth.uid());

-- 4. ADVANCE DISBURSEMENTS -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.advance_disbursements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advance_id UUID NOT NULL REFERENCES public.staff_advances(id) ON DELETE RESTRICT,
  disbursement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('bank_transfer','cash')),
  payment_mode TEXT NOT NULL, -- 'cash' | 'esewa' | 'fonepay' | 'bank'
  bank_name TEXT,
  bank_account TEXT,
  transaction_id TEXT,
  cashier TEXT,
  remarks TEXT,
  disbursed_by UUID NOT NULL,
  journal_entry_id UUID, -- populated after journal posted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advance_disbursements TO authenticated;
GRANT ALL ON public.advance_disbursements TO service_role;
ALTER TABLE public.advance_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view advance_disbursements"
  ON public.advance_disbursements FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages advance_disbursements"
  ON public.advance_disbursements FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 5. ADVANCE SETTLEMENTS (BILL-BASED) ------------------------------------
CREATE TABLE IF NOT EXISTS public.advance_settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advance_id UUID NOT NULL REFERENCES public.staff_advances(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  settlement_type TEXT NOT NULL DEFAULT 'expense_bill'
    CHECK (settlement_type IN ('expense_bill','salary_deduction','manual_adjustment','return_cash')),
  expense_type TEXT,
  expense_date DATE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','approved','rejected')),
  verifier_remarks TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  submitted_by UUID NOT NULL,
  journal_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advance_settlements TO authenticated;
GRANT ALL ON public.advance_settlements TO service_role;
ALTER TABLE public.advance_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view advance_settlements"
  ON public.advance_settlements FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages advance_settlements"
  ON public.advance_settlements FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX IF NOT EXISTS idx_settlements_advance ON public.advance_settlements(advance_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status  ON public.advance_settlements(verification_status);

-- 6. PAYROLL CONFIG (singleton) ------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year TEXT NOT NULL UNIQUE,        -- e.g. '2081/82'
  employee_ssf_pct NUMERIC NOT NULL DEFAULT 11,
  employer_ssf_pct NUMERIC NOT NULL DEFAULT 20,
  default_currency TEXT NOT NULL DEFAULT 'NPR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_config TO authenticated;
GRANT ALL ON public.payroll_config TO service_role;
ALTER TABLE public.payroll_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view payroll_config"
  ON public.payroll_config FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages payroll_config"
  ON public.payroll_config FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

INSERT INTO public.payroll_config (fiscal_year, employee_ssf_pct, employer_ssf_pct)
VALUES ('2081/82', 11, 20)
ON CONFLICT (fiscal_year) DO NOTHING;

-- 7. TAX SLABS (editable) ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tax_slabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  filing_status TEXT NOT NULL CHECK (filing_status IN ('single','married')),
  slab_order INTEGER NOT NULL,
  from_amount NUMERIC NOT NULL,            -- inclusive lower bound (annual)
  to_amount   NUMERIC,                     -- NULL = infinity
  rate_pct    NUMERIC NOT NULL,            -- e.g. 1, 10, 20, 30, 36, 39
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year, filing_status, slab_order)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_slabs TO authenticated;
GRANT ALL ON public.tax_slabs TO service_role;
ALTER TABLE public.tax_slabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view tax_slabs"
  ON public.tax_slabs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages tax_slabs"
  ON public.tax_slabs FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Seed Nepal FY 2081/82 standard slabs (editable later)
INSERT INTO public.tax_slabs (fiscal_year, filing_status, slab_order, from_amount, to_amount, rate_pct, notes) VALUES
  ('2081/82','single', 1,        0,   500000,  1, 'Social Security Tax'),
  ('2081/82','single', 2,   500000,   700000, 10, NULL),
  ('2081/82','single', 3,   700000,  1000000, 20, NULL),
  ('2081/82','single', 4,  1000000,  2000000, 30, NULL),
  ('2081/82','single', 5,  2000000,  5000000, 36, NULL),
  ('2081/82','single', 6,  5000000,     NULL, 39, NULL),
  ('2081/82','married',1,        0,   600000,  1, 'Social Security Tax'),
  ('2081/82','married',2,   600000,   800000, 10, NULL),
  ('2081/82','married',3,   800000,  1100000, 20, NULL),
  ('2081/82','married',4,  1100000,  2000000, 30, NULL),
  ('2081/82','married',5,  2000000,  5000000, 36, NULL),
  ('2081/82','married',6,  5000000,     NULL, 39, NULL)
ON CONFLICT (fiscal_year, filing_status, slab_order) DO NOTHING;

-- 8. PAYROLL PERIODS + PAYSLIPS ------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  period_label TEXT NOT NULL,              -- e.g. 'Baisakh 2082' or '2025-04'
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','calculated','approved','paid','closed')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year, period_label)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
GRANT ALL ON public.payroll_periods TO service_role;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view payroll_periods"
  ON public.payroll_periods FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages payroll_periods"
  ON public.payroll_periods FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE IF NOT EXISTS public.payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id   UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  allowance    NUMERIC NOT NULL DEFAULT 0,
  other_benefits NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  employee_ssf NUMERIC NOT NULL DEFAULT 0,
  employer_ssf NUMERIC NOT NULL DEFAULT 0,
  tax_deduction NUMERIC NOT NULL DEFAULT 0,
  advance_recovery NUMERIC NOT NULL DEFAULT 0,
  other_deductions NUMERIC NOT NULL DEFAULT 0,
  net_pay NUMERIC NOT NULL DEFAULT 0,
  ctc NUMERIC NOT NULL DEFAULT 0,
  filing_status TEXT NOT NULL DEFAULT 'single',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','calculated','approved','paid')),
  payment_mode TEXT,
  paid_at TIMESTAMPTZ,
  journal_entry_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_id, employee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payslips TO authenticated;
GRANT ALL ON public.payslips TO service_role;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view payslips"
  ON public.payslips FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages payslips"
  ON public.payslips FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX IF NOT EXISTS idx_payslips_period   ON public.payslips(period_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON public.payslips(employee_id);

-- 9. DOUBLE-ENTRY JOURNAL ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type TEXT NOT NULL,            -- 'advance_disbursement' | 'advance_settlement' | 'payroll_accrual' | 'payroll_payment' | ...
  reference_id UUID,
  narration TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  posted_by UUID NOT NULL,
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  reversed_by_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account TEXT NOT NULL,                   -- e.g. 'Staff Advance Receivable', 'Cash', 'Salary Expense', 'SSF Payable'
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  memo TEXT,
  CHECK (debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0))
);

GRANT SELECT, INSERT ON public.journal_entries TO authenticated;
GRANT SELECT, INSERT ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
GRANT ALL ON public.journal_lines   TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view journal_entries"
  ON public.journal_entries FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin can append journal_entries"
  ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() AND posted_by = auth.uid());

CREATE POLICY "Authenticated can view journal_lines"
  ON public.journal_lines FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin can append journal_lines"
  ON public.journal_lines FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry   ON public.journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ref   ON public.journal_entries(reference_type, reference_id);

-- 10. RPC: disburse_advance ----------------------------------------------
CREATE OR REPLACE FUNCTION public.disburse_advance(
  p_advance_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_payment_mode TEXT,
  p_bank_name TEXT DEFAULT NULL,
  p_bank_account TEXT DEFAULT NULL,
  p_transaction_id TEXT DEFAULT NULL,
  p_cashier TEXT DEFAULT NULL,
  p_disbursement_date DATE DEFAULT CURRENT_DATE,
  p_remarks TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_entry_id UUID;
  v_disb_id UUID;
  v_credit_account TEXT;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  v_credit_account := CASE
    WHEN p_method = 'cash' THEN 'Cash'
    WHEN lower(p_payment_mode) IN ('esewa','fonepay','bank') THEN initcap(p_payment_mode)
    ELSE 'Bank'
  END;

  -- Journal entry: Dr Staff Advance Receivable / Cr Cash or Bank
  INSERT INTO public.journal_entries (entry_date, reference_type, reference_id, narration, total_amount, posted_by)
  VALUES (p_disbursement_date, 'advance_disbursement', p_advance_id,
          'Staff advance disbursement', p_amount, v_user)
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_lines (entry_id, account, debit, credit, memo) VALUES
    (v_entry_id, 'Staff Advance Receivable', p_amount, 0, 'Advance to staff'),
    (v_entry_id, v_credit_account, 0, p_amount, p_method);

  INSERT INTO public.advance_disbursements (
    advance_id, disbursement_date, amount, method, payment_mode,
    bank_name, bank_account, transaction_id, cashier, remarks,
    disbursed_by, journal_entry_id
  ) VALUES (
    p_advance_id, p_disbursement_date, p_amount, p_method, p_payment_mode,
    p_bank_name, p_bank_account, p_transaction_id, p_cashier, p_remarks,
    v_user, v_entry_id
  ) RETURNING id INTO v_disb_id;

  UPDATE public.staff_advances
     SET amount_disbursed = COALESCE(amount_disbursed,0) + p_amount,
         status = 'disbursed',
         updated_at = now()
   WHERE id = p_advance_id;

  RETURN v_disb_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.disburse_advance FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.disburse_advance TO authenticated;

-- 11. RPC: verify_advance_settlement -------------------------------------
CREATE OR REPLACE FUNCTION public.verify_advance_settlement(
  p_settlement_id UUID,
  p_decision TEXT,                         -- 'approved' | 'rejected'
  p_verifier_remarks TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_set RECORD;
  v_entry_id UUID;
  v_new_settled NUMERIC;
  v_disbursed NUMERIC;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Permission denied'; END IF;
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;

  SELECT * INTO v_set FROM public.advance_settlements WHERE id = p_settlement_id;
  IF v_set IS NULL THEN RAISE EXCEPTION 'Settlement not found'; END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.advance_settlements
      SET verification_status='rejected', verifier_remarks=p_verifier_remarks,
          verified_by=v_user, verified_at=now(), updated_at=now()
    WHERE id = p_settlement_id;
    RETURN NULL;
  END IF;

  -- approved: post Dr Expense / Cr Staff Advance Receivable
  INSERT INTO public.journal_entries (entry_date, reference_type, reference_id, narration, total_amount, posted_by)
  VALUES (COALESCE(v_set.expense_date, CURRENT_DATE), 'advance_settlement', p_settlement_id,
          COALESCE(v_set.description,'Advance settled via bill'), v_set.amount, v_user)
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_lines (entry_id, account, debit, credit, memo) VALUES
    (v_entry_id, COALESCE(v_set.expense_type,'Expense'), v_set.amount, 0, 'Bill settled against advance'),
    (v_entry_id, 'Staff Advance Receivable', 0, v_set.amount, 'Reduce staff advance');

  UPDATE public.advance_settlements
    SET verification_status='approved', verifier_remarks=p_verifier_remarks,
        verified_by=v_user, verified_at=now(),
        journal_entry_id=v_entry_id, updated_at=now()
  WHERE id = p_settlement_id;

  -- update parent advance settled amount + status
  UPDATE public.staff_advances
     SET amount_settled = COALESCE(amount_settled,0) + v_set.amount,
         updated_at = now()
   WHERE id = v_set.advance_id;

  SELECT amount_disbursed, amount_settled
    INTO v_disbursed, v_new_settled
    FROM public.staff_advances WHERE id = v_set.advance_id;

  UPDATE public.staff_advances
     SET status = CASE
       WHEN v_new_settled >= v_disbursed THEN 'fully_settled'
       WHEN v_new_settled > 0 THEN 'partially_settled'
       ELSE status
     END
   WHERE id = v_set.advance_id;

  RETURN v_entry_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_advance_settlement FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.verify_advance_settlement TO authenticated;

-- 12. RPC: calculate_payroll_tax -----------------------------------------
-- Given annual taxable income (gross - employee SSF), returns annual tax.
CREATE OR REPLACE FUNCTION public.calculate_payroll_tax(
  p_annual_taxable NUMERIC,
  p_filing_status TEXT,
  p_fiscal_year TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_remaining NUMERIC := GREATEST(p_annual_taxable, 0);
  v_tax NUMERIC := 0;
  v_slab RECORD;
  v_slab_width NUMERIC;
  v_taxed NUMERIC;
BEGIN
  IF v_remaining = 0 THEN RETURN 0; END IF;

  FOR v_slab IN
    SELECT from_amount, to_amount, rate_pct
      FROM public.tax_slabs
     WHERE fiscal_year = p_fiscal_year AND filing_status = p_filing_status
     ORDER BY slab_order
  LOOP
    v_slab_width := CASE
      WHEN v_slab.to_amount IS NULL THEN v_remaining - GREATEST(v_slab.from_amount - (p_annual_taxable - v_remaining), 0)
      ELSE LEAST(v_slab.to_amount - v_slab.from_amount, v_remaining)
    END;

    -- Simpler: iterate by checking how much of p_annual_taxable falls in this slab
    -- Reset approach below for correctness:
  END LOOP;

  -- Correct, simple slab walk:
  v_tax := 0;
  FOR v_slab IN
    SELECT from_amount, to_amount, rate_pct
      FROM public.tax_slabs
     WHERE fiscal_year = p_fiscal_year AND filing_status = p_filing_status
     ORDER BY slab_order
  LOOP
    IF p_annual_taxable <= v_slab.from_amount THEN
      EXIT;
    END IF;
    v_taxed := CASE
      WHEN v_slab.to_amount IS NULL THEN p_annual_taxable - v_slab.from_amount
      ELSE LEAST(p_annual_taxable, v_slab.to_amount) - v_slab.from_amount
    END;
    v_tax := v_tax + (v_taxed * v_slab.rate_pct / 100.0);
  END LOOP;

  RETURN ROUND(v_tax, 2);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_payroll_tax FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.calculate_payroll_tax TO authenticated;

-- 13. RPC: run_payroll_for_employee --------------------------------------
CREATE OR REPLACE FUNCTION public.run_payroll_for_employee(
  p_period_id UUID,
  p_employee_id UUID,
  p_basic NUMERIC,
  p_allowance NUMERIC DEFAULT 0,
  p_other_benefits NUMERIC DEFAULT 0,
  p_advance_recovery NUMERIC DEFAULT 0,
  p_other_deductions NUMERIC DEFAULT 0,
  p_filing_status TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_period RECORD;
  v_emp RECORD;
  v_cfg RECORD;
  v_gross NUMERIC;
  v_emp_ssf NUMERIC;
  v_er_ssf NUMERIC;
  v_annual_taxable NUMERIC;
  v_annual_tax NUMERIC;
  v_monthly_tax NUMERIC;
  v_net NUMERIC;
  v_ctc NUMERIC;
  v_filing TEXT;
  v_payslip_id UUID;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Permission denied'; END IF;

  SELECT * INTO v_period FROM public.payroll_periods WHERE id = p_period_id;
  IF v_period IS NULL THEN RAISE EXCEPTION 'Period not found'; END IF;
  IF v_period.status NOT IN ('draft','calculated') THEN
    RAISE EXCEPTION 'Period is locked (status=%)', v_period.status;
  END IF;

  SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id;
  IF v_emp IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  SELECT * INTO v_cfg FROM public.payroll_config
   WHERE fiscal_year = v_period.fiscal_year AND is_active = true
   ORDER BY updated_at DESC LIMIT 1;
  IF v_cfg IS NULL THEN RAISE EXCEPTION 'No active payroll_config for fiscal_year=%', v_period.fiscal_year; END IF;

  v_filing := COALESCE(p_filing_status, v_emp.marital_status, 'single');

  v_gross := COALESCE(p_basic,0) + COALESCE(p_allowance,0) + COALESCE(p_other_benefits,0);
  v_emp_ssf := ROUND(v_gross * v_cfg.employee_ssf_pct / 100.0, 2);
  v_er_ssf  := ROUND(v_gross * v_cfg.employer_ssf_pct / 100.0, 2);

  v_annual_taxable := (v_gross - v_emp_ssf) * 12;
  v_annual_tax := public.calculate_payroll_tax(v_annual_taxable, v_filing, v_period.fiscal_year);
  v_monthly_tax := ROUND(v_annual_tax / 12.0, 2);

  v_net := v_gross - v_emp_ssf - v_monthly_tax - COALESCE(p_advance_recovery,0) - COALESCE(p_other_deductions,0);
  v_ctc := v_gross + v_er_ssf;

  INSERT INTO public.payslips (
    period_id, employee_id, basic_salary, allowance, other_benefits,
    gross_salary, employee_ssf, employer_ssf, tax_deduction,
    advance_recovery, other_deductions, net_pay, ctc, filing_status, status
  ) VALUES (
    p_period_id, p_employee_id, p_basic, p_allowance, p_other_benefits,
    v_gross, v_emp_ssf, v_er_ssf, v_monthly_tax,
    COALESCE(p_advance_recovery,0), COALESCE(p_other_deductions,0),
    v_net, v_ctc, v_filing, 'calculated'
  )
  ON CONFLICT (period_id, employee_id) DO UPDATE SET
    basic_salary=EXCLUDED.basic_salary,
    allowance=EXCLUDED.allowance,
    other_benefits=EXCLUDED.other_benefits,
    gross_salary=EXCLUDED.gross_salary,
    employee_ssf=EXCLUDED.employee_ssf,
    employer_ssf=EXCLUDED.employer_ssf,
    tax_deduction=EXCLUDED.tax_deduction,
    advance_recovery=EXCLUDED.advance_recovery,
    other_deductions=EXCLUDED.other_deductions,
    net_pay=EXCLUDED.net_pay,
    ctc=EXCLUDED.ctc,
    filing_status=EXCLUDED.filing_status,
    status='calculated',
    updated_at=now()
  RETURNING id INTO v_payslip_id;

  UPDATE public.payroll_periods
     SET status = CASE WHEN status='draft' THEN 'calculated' ELSE status END,
         updated_at = now()
   WHERE id = p_period_id;

  RETURN v_payslip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_payroll_for_employee FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.run_payroll_for_employee TO authenticated;

-- 14. RPC: pay_payroll_period --------------------------------------------
-- Posts journal entries for all payslips in the period and marks them paid.
-- Also reduces outstanding staff advances by each payslip's advance_recovery.
CREATE OR REPLACE FUNCTION public.pay_payroll_period(
  p_period_id UUID,
  p_payment_mode TEXT DEFAULT 'bank',
  p_pay_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_period RECORD;
  v_slip RECORD;
  v_entry_id UUID;
  v_cash_acct TEXT;
  v_count INTEGER := 0;
  v_emp_open UUID;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Permission denied'; END IF;

  SELECT * INTO v_period FROM public.payroll_periods WHERE id = p_period_id;
  IF v_period IS NULL THEN RAISE EXCEPTION 'Period not found'; END IF;
  IF v_period.status NOT IN ('calculated','approved') THEN
    RAISE EXCEPTION 'Period not ready to pay (status=%)', v_period.status;
  END IF;

  v_cash_acct := CASE lower(p_payment_mode)
    WHEN 'cash' THEN 'Cash' WHEN 'esewa' THEN 'Esewa'
    WHEN 'fonepay' THEN 'Fonepay' ELSE 'Bank' END;

  FOR v_slip IN
    SELECT * FROM public.payslips WHERE period_id = p_period_id AND status IN ('calculated','approved')
  LOOP
    -- Combined accrual + payment in one entry
    INSERT INTO public.journal_entries (entry_date, reference_type, reference_id, narration, total_amount, posted_by)
    VALUES (p_pay_date, 'payroll_payment', v_slip.id, 'Salary payment for period '||v_period.period_label, v_slip.gross_salary + v_slip.employer_ssf, v_user)
    RETURNING id INTO v_entry_id;

    -- Debits
    INSERT INTO public.journal_lines (entry_id, account, debit, credit, memo) VALUES
      (v_entry_id, 'Salary Expense',          v_slip.gross_salary, 0, 'Gross salary'),
      (v_entry_id, 'SSF Expense (Employer)',  v_slip.employer_ssf, 0, 'Employer SSF contribution');

    -- Credits
    INSERT INTO public.journal_lines (entry_id, account, debit, credit, memo) VALUES
      (v_entry_id, v_cash_acct,                 0, v_slip.net_pay,         'Net salary paid'),
      (v_entry_id, 'SSF Payable',               0, v_slip.employee_ssf + v_slip.employer_ssf, 'SSF liability'),
      (v_entry_id, 'TDS Payable',               0, v_slip.tax_deduction,   'Tax withheld'),
      (v_entry_id, 'Other Deductions Payable', 0, v_slip.other_deductions, 'Other deductions');

    IF v_slip.advance_recovery > 0 THEN
      INSERT INTO public.journal_lines (entry_id, account, debit, credit, memo)
      VALUES (v_entry_id, 'Staff Advance Receivable', 0, v_slip.advance_recovery, 'Advance recovered from salary');

      -- Apply recovery to oldest outstanding advance for this employee
      FOR v_emp_open IN
        SELECT id FROM public.staff_advances
         WHERE employee_id = v_slip.employee_id
           AND status IN ('disbursed','partially_settled')
         ORDER BY request_date ASC
      LOOP
        EXIT WHEN v_slip.advance_recovery <= 0;
        DECLARE
          v_outstanding NUMERIC;
          v_apply NUMERIC;
        BEGIN
          SELECT outstanding_amount INTO v_outstanding FROM public.staff_advances WHERE id = v_emp_open;
          v_apply := LEAST(v_outstanding, v_slip.advance_recovery);
          IF v_apply > 0 THEN
            INSERT INTO public.advance_settlements (
              advance_id, employee_id, settlement_type, amount, description,
              verification_status, verified_by, verified_at,
              submitted_by, journal_entry_id
            ) VALUES (
              v_emp_open, v_slip.employee_id, 'salary_deduction', v_apply,
              'Salary deduction for period '||v_period.period_label,
              'approved', v_user, now(), v_user, v_entry_id
            );
            UPDATE public.staff_advances
               SET amount_settled = COALESCE(amount_settled,0) + v_apply,
                   updated_at = now()
             WHERE id = v_emp_open;
            UPDATE public.staff_advances
               SET status = CASE
                 WHEN amount_settled >= amount_disbursed THEN 'fully_settled'
                 ELSE 'partially_settled' END
             WHERE id = v_emp_open;
            v_slip.advance_recovery := v_slip.advance_recovery - v_apply;
          END IF;
        END;
      END LOOP;
    END IF;

    UPDATE public.payslips
       SET status='paid', payment_mode=p_payment_mode, paid_at=now(),
           journal_entry_id=v_entry_id, updated_at=now()
     WHERE id = v_slip.id;

    v_count := v_count + 1;
  END LOOP;

  UPDATE public.payroll_periods
     SET status='paid', paid_at=now(), updated_at=now()
   WHERE id = p_period_id;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pay_payroll_period FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.pay_payroll_period TO authenticated;

-- 15. STORAGE BUCKET for attachments -------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-attachments','staff-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can read staff-attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'staff-attachments');

CREATE POLICY "Super admin can upload staff-attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'staff-attachments' AND is_super_admin());

CREATE POLICY "Super admin can update staff-attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'staff-attachments' AND is_super_admin());

CREATE POLICY "Super admin can delete staff-attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'staff-attachments' AND is_super_admin());

-- 16. updated_at triggers ------------------------------------------------
CREATE TRIGGER trg_employees_upd          BEFORE UPDATE ON public.employees          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_staff_advances_upd     BEFORE UPDATE ON public.staff_advances     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_advance_settlements_upd BEFORE UPDATE ON public.advance_settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payroll_config_upd     BEFORE UPDATE ON public.payroll_config     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_slabs_upd          BEFORE UPDATE ON public.tax_slabs          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payroll_periods_upd    BEFORE UPDATE ON public.payroll_periods    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payslips_upd           BEFORE UPDATE ON public.payslips           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
