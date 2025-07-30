-- Form Reformation SQL Updates
-- This file contains all SQL commands to support the new form fields

-- =====================================================
-- 1. UPDATE COOPERATIVE_SAVINGS TABLE
-- =====================================================

-- Add payment_mode column if it doesn't exist
ALTER TABLE cooperative_savings 
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Cash';

-- Add savings_to column for the new "Savings to" field
ALTER TABLE cooperative_savings 
ADD COLUMN IF NOT EXISTS savings_to VARCHAR(50) DEFAULT 'Cooperative';

-- Update existing records to have valid payment_mode values
UPDATE cooperative_savings 
SET payment_mode = 'Cash' 
WHERE payment_mode IS NULL OR payment_mode NOT IN ('Cash', 'Esewa', 'Fonepay');

-- Update existing records to have valid savings_to values
UPDATE cooperative_savings 
SET savings_to = 'Cooperative' 
WHERE savings_to IS NULL OR savings_to NOT IN ('Bank', 'Cooperative');

-- Add constraints
ALTER TABLE cooperative_savings 
DROP CONSTRAINT IF EXISTS cooperative_savings_payment_mode_check;

ALTER TABLE cooperative_savings 
ADD CONSTRAINT cooperative_savings_payment_mode_check 
CHECK (payment_mode IN ('Cash', 'Esewa', 'Fonepay'));

ALTER TABLE cooperative_savings 
ADD CONSTRAINT cooperative_savings_savings_to_check 
CHECK (savings_to IN ('Bank', 'Cooperative'));

-- =====================================================
-- 2. UPDATE WITHDRAWALS TABLE  
-- =====================================================

-- Add payment_mode column if it doesn't exist
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Cash';

-- Add withdrawal_from column if it doesn't exist
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS withdrawal_from VARCHAR(50) DEFAULT 'Cooperative';

-- Update existing records to have valid values
UPDATE withdrawals 
SET payment_mode = 'Cash' 
WHERE payment_mode IS NULL OR payment_mode NOT IN ('Cash', 'Esewa', 'Fonepay');

UPDATE withdrawals 
SET withdrawal_from = 'Cooperative' 
WHERE withdrawal_from IS NULL OR withdrawal_from NOT IN ('Esewa', 'Bank', 'Cooperative');

-- Add constraints
ALTER TABLE withdrawals 
DROP CONSTRAINT IF EXISTS withdrawals_payment_mode_check;

ALTER TABLE withdrawals 
DROP CONSTRAINT IF EXISTS withdrawals_withdrawal_from_check;

ALTER TABLE withdrawals 
ADD CONSTRAINT withdrawals_payment_mode_check 
CHECK (payment_mode IN ('Cash', 'Esewa', 'Fonepay'));

ALTER TABLE withdrawals 
ADD CONSTRAINT withdrawals_withdrawal_from_check 
CHECK (withdrawal_from IN ('Esewa', 'Bank', 'Cooperative'));

-- =====================================================
-- 3. UPDATE DEPOSITS TABLE
-- =====================================================

-- Add deposited_by_type column if it doesn't exist
ALTER TABLE deposits 
ADD COLUMN IF NOT EXISTS deposited_by_type VARCHAR(50) DEFAULT 'Customer';

-- Update existing records to have valid deposited_by_type values
UPDATE deposits 
SET deposited_by_type = 'Customer' 
WHERE deposited_by_type IS NULL OR deposited_by_type NOT IN ('Customer', 'Staff');

-- Add constraint
ALTER TABLE deposits 
DROP CONSTRAINT IF EXISTS deposits_deposited_by_type_check;

ALTER TABLE deposits 
ADD CONSTRAINT deposits_deposited_by_type_check 
CHECK (deposited_by_type IN ('Customer', 'Staff'));

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cooperative_savings_payment_mode 
ON cooperative_savings(payment_mode);

CREATE INDEX IF NOT EXISTS idx_cooperative_savings_savings_to 
ON cooperative_savings(savings_to);

CREATE INDEX IF NOT EXISTS idx_withdrawals_payment_mode 
ON withdrawals(payment_mode);

CREATE INDEX IF NOT EXISTS idx_withdrawals_withdrawal_from 
ON withdrawals(withdrawal_from);

CREATE INDEX IF NOT EXISTS idx_deposits_deposited_by_type 
ON deposits(deposited_by_type);

-- Composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cooperative_savings_date_payment_savings 
ON cooperative_savings(contribution_date, payment_mode, savings_to);

CREATE INDEX IF NOT EXISTS idx_withdrawals_date_payment_from 
ON withdrawals(withdrawal_date, payment_mode, withdrawal_from);

CREATE INDEX IF NOT EXISTS idx_deposits_date_mode_type 
ON deposits(deposit_date, mode, deposited_by_type);

-- =====================================================
-- 5. SAMPLE DATA UPDATES (OPTIONAL)
-- =====================================================

-- Update some sample records to demonstrate the new functionality
-- Uncomment and modify as needed for your data

-- Update some cooperative_savings records with different payment modes and savings destinations
-- UPDATE cooperative_savings 
-- SET payment_mode = 'Esewa', savings_to = 'Bank' 
-- WHERE id IN (SELECT id FROM cooperative_savings ORDER BY created_at DESC LIMIT 2);

-- UPDATE cooperative_savings 
-- SET payment_mode = 'Fonepay', savings_to = 'Cooperative' 
-- WHERE id IN (SELECT id FROM cooperative_savings ORDER BY created_at DESC OFFSET 2 LIMIT 2);

-- Update some withdrawals records with different payment modes and sources
-- UPDATE withdrawals 
-- SET payment_mode = 'Esewa', withdrawal_from = 'Esewa'
-- WHERE id IN (SELECT id FROM withdrawals ORDER BY created_at DESC LIMIT 2);

-- UPDATE withdrawals 
-- SET payment_mode = 'Fonepay', withdrawal_from = 'Bank'
-- WHERE id IN (SELECT id FROM withdrawals ORDER BY created_at DESC OFFSET 2 LIMIT 2);

-- Update some deposits records with different deposited_by_type
-- UPDATE deposits 
-- SET deposited_by_type = 'Staff'
-- WHERE id IN (SELECT id FROM deposits ORDER BY created_at DESC LIMIT 3);

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify the updates were successful:

-- Check cooperative_savings table structure and data
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'cooperative_savings' 
-- AND column_name IN ('payment_mode', 'savings_to')
-- ORDER BY ordinal_position;

-- SELECT payment_mode, savings_to, COUNT(*) 
-- FROM cooperative_savings 
-- GROUP BY payment_mode, savings_to;

-- Check withdrawals table structure and data
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'withdrawals' 
-- AND column_name IN ('payment_mode', 'withdrawal_from')
-- ORDER BY ordinal_position;

-- SELECT payment_mode, withdrawal_from, COUNT(*) 
-- FROM withdrawals 
-- GROUP BY payment_mode, withdrawal_from;

-- Check deposits table structure and data
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'deposits' 
-- AND column_name = 'deposited_by_type'
-- ORDER BY ordinal_position;

-- SELECT deposited_by_type, COUNT(*) 
-- FROM deposits 
-- GROUP BY deposited_by_type;

-- =====================================================
-- FORM REFORMATION COMPLETE
-- =====================================================

-- After running this SQL:
-- 1. Cooperative savings will have payment_mode (Cash/Esewa/Fonepay) and savings_to (Bank/Cooperative)
-- 2. Withdrawals will have payment_mode (Cash/Esewa/Fonepay) and withdrawal_from (Esewa/Bank/Cooperative)  
-- 3. Deposits will have deposited_by_type (Customer/Staff)
-- 4. All fields have proper constraints and indexes
-- 5. The new combined Savings & Withdrawals tab will work with these fields
