-- Optional MikroTik API / device credentials (password NOT required for syslog)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schema_name FROM public.tenants WHERE status = 'active' LOOP
    EXECUTE format(
      'ALTER TABLE %I.devices ADD COLUMN IF NOT EXISTS api_user VARCHAR(128)',
      r.schema_name
    );
    EXECUTE format(
      'ALTER TABLE %I.devices ADD COLUMN IF NOT EXISTS api_password VARCHAR(256)',
      r.schema_name
    );
    EXECUTE format(
      'ALTER TABLE %I.devices ADD COLUMN IF NOT EXISTS api_port INT DEFAULT 8728',
      r.schema_name
    );
  END LOOP;
END $$;
