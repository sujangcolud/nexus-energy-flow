-- Fixed Database Schema Updates for Savings & Withdrawals Integration
-- This file fixes constraint violations by properly handling existing data

-- =====================================================
-- 1. FIX COOPERATIVE_SAVINGS TABLE
-- =====================================================

-- First, let's see what values exist in the table
-- (You can run this to check: SELECT DISTINCT payment_mode FROM cooperative_savings;)

-- Remove the constraint if it exists
ALTER TABLE cooperative_savings 
DROP CONSTRAINT IF EXISTS cooperative_savings_payment_mode_check;

-- Add payment_mode column if it doesn't exist
ALTER TABLE cooperative_savings 
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50);

-- Update ALL existing records to have 'Cash' as payment mode
-- This handles NULL values and any other existing values
UPDATE cooperative_savings 
SET payment_mode = 'Cash' 
WHERE payment_mode IS NULL OR payment_mode NOT IN ('Cash', 'Esewa', 'Fonepay');

-- Set default for new records
ALTER TABLE cooperative_savings 
ALTER COLUMN payment_mode SET DEFAULT 'Cash';

-- Now add the constraint (this should work since all rows now have valid values)
ALTER TABLE cooperative_savings 
ADD CONSTRAINT cooperative_savings_payment_mode_check 
CHECK (payment_mode IN ('Cash', 'Esewa', 'Fonepay'));

-- =====================================================
-- 2. FIX WITHDRAWALS TABLE  
-- =====================================================

-- Remove constraints if they exist
ALTER TABLE withdrawals 
DROP CONSTRAINT IF EXISTS withdrawals_payment_mode_check;

ALTER TABLE withdrawals 
DROP CONSTRAINT IF EXISTS withdrawals_withdrawal_from_check;

-- Add columns if they don't exist
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50);

ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS withdrawal_from VARCHAR(50);

-- Update ALL existing records with valid values
UPDATE withdrawals 
SET payment_mode = 'Cash' 
WHERE payment_mode IS NULL OR payment_mode NOT IN ('Cash', 'Esewa', 'Fonepay');

UPDATE withdrawals 
SET withdrawal_from = 'Cooperative' 
WHERE withdrawal_from IS NULL OR withdrawal_from NOT IN ('Esewa', 'Bank', 'Cooperative');

-- Set defaults
ALTER TABLE withdrawals 
ALTER COLUMN payment_mode SET DEFAULT 'Cash';

ALTER TABLE withdrawals 
ALTER COLUMN withdrawal_from SET DEFAULT 'Cooperative';

-- Add constraints
ALTER TABLE withdrawals 
ADD CONSTRAINT withdrawals_payment_mode_check 
CHECK (payment_mode IN ('Cash', 'Esewa', 'Fonepay'));

ALTER TABLE withdrawals 
ADD CONSTRAINT withdrawals_withdrawal_from_check 
CHECK (withdrawal_from IN ('Esewa', 'Bank', 'Cooperative'));

-- =====================================================
-- 3. FIX DEPOSITS TABLE
-- =====================================================

-- Remove constraint if it exists
ALTER TABLE deposits 
DROP CONSTRAINT IF EXISTS deposits_deposited_by_type_check;

-- Add column if it doesn't exist
ALTER TABLE deposits 
ADD COLUMN IF NOT EXISTS deposited_by_type VARCHAR(50);

-- Update ALL existing records
UPDATE deposits 
SET deposited_by_type = 'Customer' 
WHERE deposited_by_type IS NULL OR deposited_by_type NOT IN ('Customer', 'Staff');

-- Set default
ALTER TABLE deposits 
ALTER COLUMN deposited_by_type SET DEFAULT 'Customer';

-- Add constraint
ALTER TABLE deposits 
ADD CONSTRAINT deposits_deposited_by_type_check 
CHECK (deposited_by_type IN ('Customer', 'Staff'));

-- =====================================================
-- 4. CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Create indexes (these will be created only if they don't exist)
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_cooperative_savings_payment_mode 
    ON cooperative_savings(payment_mode);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_withdrawals_payment_mode 
    ON withdrawals(payment_mode);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_withdrawals_withdrawal_from 
    ON withdrawals(withdrawal_from);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_deposits_deposited_by_type 
    ON deposits(deposited_by_type);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_cooperative_savings_date_payment 
    ON cooperative_savings(contribution_date, payment_mode);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_withdrawals_date_payment 
    ON withdrawals(withdrawal_date, payment_mode);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_deposits_date_type 
    ON deposits(deposit_date, deposited_by_type);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Run these to verify the fixes worked:

-- Check cooperative_savings payment modes
-- SELECT payment_mode, COUNT(*) FROM cooperative_savings GROUP BY payment_mode;

-- Check withdrawals payment modes and sources
-- SELECT payment_mode, COUNT(*) FROM withdrawals GROUP BY payment_mode;
-- SELECT withdrawal_from, COUNT(*) FROM withdrawals GROUP BY withdrawal_from;

-- Check deposits deposited_by_type
-- SELECT deposited_by_type, COUNT(*) FROM deposits GROUP BY deposited_by_type;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
