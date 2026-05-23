-- Enhance charger_transactions for detailed reporting
ALTER TABLE charger_transactions
ADD COLUMN IF NOT EXISTS initial_soc NUMERIC,
ADD COLUMN IF NOT EXISTS final_soc NUMERIC,
ADD COLUMN IF NOT EXISTS total_energy_kwh NUMERIC,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC,
ADD COLUMN IF NOT EXISTS end_meter NUMERIC,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- Add address/location to charger_status
ALTER TABLE charger_status
ADD COLUMN IF NOT EXISTS location_address TEXT;
