-- Add payment_date column to expense_bookings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_bookings' AND column_name='payment_date') THEN
        ALTER TABLE public.expense_bookings ADD COLUMN payment_date date;
    END IF;
END $$;
