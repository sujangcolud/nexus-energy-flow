-- Enhance Deletion Logic for Staff Management

-- 1. Update handle_staff_financial_impact to handle DELETIONS (Soft deletes via deleted_at)
CREATE OR REPLACE FUNCTION public.handle_staff_financial_impact()
RETURNS TRIGGER AS $$
DECLARE
    v_mode TEXT;
    v_amount NUMERIC;
    v_old_amount NUMERIC;
    v_col TEXT;
BEGIN
    -- Handle Staff Advances
    IF TG_TABLE_NAME = 'staff_advances' THEN
        -- CASE: Record is deleted (soft delete via deleted_at update)
        IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND OLD.status = 'Disbursed') THEN
            v_mode := LOWER(OLD.disbursement_method);
            v_amount := OLD.amount;
            v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;

            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;

        -- CASE: Just Disbursed
        ELSIF (NEW.status = 'Disbursed' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'Disbursed') AND NEW.deleted_at IS NULL) THEN
            v_mode := LOWER(NEW.disbursement_method);
            v_amount := NEW.amount;
            v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;

            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;

        -- CASE: Update to an already disbursed advance
        ELSIF (NEW.status = 'Disbursed' AND OLD.status = 'Disbursed' AND NEW.deleted_at IS NULL) THEN
            IF (NEW.amount != OLD.amount OR NEW.disbursement_method != OLD.disbursement_method) THEN
                -- Revert OLD
                v_mode := LOWER(OLD.disbursement_method);
                v_old_amount := OLD.amount;
                v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;
                IF v_col IS NOT NULL THEN
                    EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_old_amount;
                END IF;

                -- Apply NEW
                v_mode := LOWER(NEW.disbursement_method);
                v_amount := NEW.amount;
                v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;
                IF v_col IS NOT NULL THEN
                    EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
                END IF;
            END IF;

        -- CASE: Revert Disbursed (status changed)
        ELSIF (OLD.status = 'Disbursed' AND NEW.status != 'Disbursed' AND NEW.deleted_at IS NULL) THEN
            v_mode := LOWER(OLD.disbursement_method);
            v_amount := OLD.amount;
            v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;
            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;
        END IF;

    -- Handle Payroll Records
    ELSIF TG_TABLE_NAME = 'payroll_records' THEN
        -- CASE: Soft Delete
        IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND OLD.status = 'Paid') THEN
            v_mode := LOWER(OLD.payment_mode);
            v_amount := OLD.net_salary;
            v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;

            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;

        -- CASE: Just Paid
        ELSIF (NEW.status = 'Paid' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'Paid') AND NEW.deleted_at IS NULL) THEN
            v_mode := LOWER(NEW.payment_mode);
            v_amount := NEW.net_salary;
            v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;

            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;

        -- CASE: Update to already paid
        ELSIF (NEW.status = 'Paid' AND OLD.status = 'Paid' AND NEW.deleted_at IS NULL) THEN
            IF (NEW.net_salary != OLD.net_salary OR NEW.payment_mode != OLD.payment_mode) THEN
                -- Revert OLD
                v_mode := LOWER(OLD.payment_mode);
                v_old_amount := OLD.net_salary;
                v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;
                IF v_col IS NOT NULL THEN
                    EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_old_amount;
                END IF;

                -- Apply NEW
                v_mode := LOWER(NEW.payment_mode);
                v_amount := NEW.net_salary;
                v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;
                IF v_col IS NOT NULL THEN
                    EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
                END IF;
            END IF;

        -- CASE: Revert Paid
        ELSIF (OLD.status = 'Paid' AND NEW.status != 'Paid' AND NEW.deleted_at IS NULL) THEN
            v_mode := LOWER(OLD.payment_mode);
            v_amount := OLD.net_salary;
            v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;
            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revert Overtime status when payroll is deleted
CREATE OR REPLACE FUNCTION public.handle_payroll_deletion_reversal()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
        UPDATE public.employee_overtime
        SET status = 'Approved',
            updated_at = NOW()
        WHERE employee_id = OLD.employee_id
          AND overtime_date >= OLD.month_year
          AND overtime_date < (OLD.month_year + interval '1 month')
          AND status = 'Processed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payroll_deleted_reversal ON public.payroll_records;
CREATE TRIGGER on_payroll_deleted_reversal
    AFTER UPDATE ON public.payroll_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_payroll_deletion_reversal();

-- 2. Enhance Advance Settlement logic to handle deletion impact
CREATE OR REPLACE FUNCTION public.process_advance_settlement_reversal()
RETURNS TRIGGER AS $$
BEGIN
    -- If a settlement was Approved and is now being deleted/rejected, revert the impact on the advance
    IF (OLD.status = 'Approved' AND (NEW.status = 'Rejected' OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL))) THEN
        UPDATE public.staff_advances
        SET outstanding_amount = outstanding_amount + OLD.amount,
            status = 'Partially Settled', -- Simplification: set back to partially settled
            updated_at = NOW()
        WHERE id = OLD.advance_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_settlement_reversal ON public.advance_settlements;
CREATE TRIGGER on_settlement_reversal
    AFTER UPDATE ON public.advance_settlements
    FOR EACH ROW EXECUTE FUNCTION public.process_advance_settlement_reversal();

NOTIFY pgrst, 'reload schema';
