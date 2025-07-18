ALTER TABLE withdrawals
ADD COLUMN payment_mode TEXT;

ALTER TABLE deposits
ADD COLUMN payment_mode TEXT;
