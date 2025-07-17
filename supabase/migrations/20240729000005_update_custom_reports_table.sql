ALTER TABLE custom_reports
ADD COLUMN data_sources TEXT[],
ADD COLUMN joins JSONB,
ADD COLUMN calculation_column TEXT;

ALTER TABLE custom_reports
DROP COLUMN data_source;
