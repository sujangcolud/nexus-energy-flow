-- Expand EV CSMS for Granular Tracking
CREATE TABLE IF NOT EXISTS charger_meter_values (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT,
    charger_id TEXT NOT NULL REFERENCES charger_status(charger_id),
    connector_id INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    power_kw FLOAT,
    voltage FLOAT,
    current FLOAT,
    soc FLOAT
);

-- Index for fast lookup of historical metrics
CREATE INDEX IF NOT EXISTS idx_charger_meter_values_charger_time ON charger_meter_values(charger_id, timestamp DESC);

-- Update charging_sessions with hardware links
ALTER TABLE charging_sessions
ADD COLUMN IF NOT EXISTS charger_id TEXT,
ADD COLUMN IF NOT EXISTS connector_id INTEGER;

-- Enable Realtime for meter values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'charger_meter_values'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE charger_meter_values;
    END IF;
END
$$;
