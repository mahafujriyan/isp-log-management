-- Multi-tenant schema provisioning (PHASE 2)
-- Creates isolated schema + syslogs table + indexes per tenant

CREATE OR REPLACE FUNCTION public.create_tenant_schema(p_schema_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_schema_name IS NULL OR p_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid tenant schema name: %', p_schema_name;
  END IF;

  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);

  EXECUTE format($SQL$
    CREATE TABLE IF NOT EXISTS %I.syslogs (
      id BIGSERIAL PRIMARY KEY,
      received_at TIMESTAMPTZ DEFAULT NOW(),
      pppoe_user VARCHAR(128),
      mac_address VARCHAR(20),
      user_ip INET,
      user_port INT,
      nat_ip INET,
      nat_port INT,
      visited_ip INET,
      visited_port INT,
      protocol VARCHAR(8),
      country_code CHAR(2),
      city VARCHAR(64),
      raw_message TEXT
    )
  $SQL$, p_schema_name);

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_syslogs_received ON %I.syslogs (received_at DESC)',
    p_schema_name
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_syslogs_user_ip ON %I.syslogs (user_ip)',
    p_schema_name
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_syslogs_visited ON %I.syslogs (visited_ip, visited_port)',
    p_schema_name
  );

  -- Per-tenant devices registry (PHASE 3 ready)
  EXECUTE format($SQL$
    CREATE TABLE IF NOT EXISTS %I.devices (
      id SERIAL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      device_ip INET NOT NULL,
      config_type VARCHAR(16) DEFAULT 'NAT',
      nat_ip INET,
      syslog_user VARCHAR(64) DEFAULT 'log',
      syslog_port INT DEFAULT 514,
      listen_port INT DEFAULT 514,
      status VARCHAR(32) DEFAULT 'active',
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  $SQL$, p_schema_name);
END;
$$;

-- Drop tenant schema (super admin only — use with care)
CREATE OR REPLACE FUNCTION public.drop_tenant_schema(p_schema_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_schema_name IS NULL OR p_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid tenant schema name: %', p_schema_name;
  END IF;
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_schema_name);
END;
$$;
