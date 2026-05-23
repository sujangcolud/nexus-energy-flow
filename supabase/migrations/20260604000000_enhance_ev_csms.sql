-- Enhance EV CSMS Schema
ALTER TABLE charger_status
ADD COLUMN IF NOT EXISTS charger_name TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS price_per_kwh NUMERIC DEFAULT 15.0;

CREATE TABLE IF NOT EXISTS charger_connectors (
    charger_id TEXT REFERENCES charger_status(charger_id) ON DELETE CASCADE,
    connector_id INTEGER,
    status TEXT DEFAULT 'Available',
    power_kw FLOAT DEFAULT 0.0,
    voltage FLOAT DEFAULT 0.0,
    current FLOAT DEFAULT 0.0,
    soc FLOAT DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (charger_id, connector_id)
);

-- Enable Realtime for connectors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'charger_connectors'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE charger_connectors;
    END IF;
END
$$;

-- Insert initial metadata for known charger if exists
INSERT INTO charger_status (charger_id, charger_name, model, vendor, price_per_kwh)
VALUES ('theego084', 'Energy Palace 80KW GB/T, Bhiman', 'I328', 'StarCharge', 15.0)
ON CONFLICT (charger_id) DO UPDATE SET
    charger_name = EXCLUDED.charger_name,
    model = EXCLUDED.model,
    vendor = EXCLUDED.vendor,
    price_per_kwh = EXCLUDED.price_per_kwh;

-- Initial connectors for theego084
INSERT INTO charger_connectors (charger_id, connector_id, status)
VALUES
    ('theego084', 1, 'Offline'),
    ('theego084', 2, 'Offline')
ON CONFLICT (charger_id, connector_id) DO NOTHING;
