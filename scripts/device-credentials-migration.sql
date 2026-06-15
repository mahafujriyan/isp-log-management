-- Optional MikroTik API / device credentials (password NOT required for syslog)
-- Applies to every tenant schema (active or not) + any orphan tenant_* schema with devices table
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schema_name FROM public.tenants LOOP
    PERFORM public.create_tenant_schema(r.schema_name);
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

  FOR r IN
    SELECT n.nspname AS schema_name
    FROM pg_namespace n
    WHERE n.nspname LIKE 'tenant\_%' ESCAPE '\'
      AND EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = n.nspname AND t.table_name = 'devices'
      )
  LOOP
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
