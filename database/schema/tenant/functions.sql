-- Per-tenant schema provisioning (single source of truth)
-- Usage: SELECT public.create_tenant_schema('tenant_001');

CREATE OR REPLACE FUNCTION public.create_tenant_schema(p_schema_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_schema_name IS NULL OR p_schema_name !~ '^tenant_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid tenant schema name: %', p_schema_name;
  END IF;

  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);

  -- Legacy syslog rows (still queried as fallback)
  EXECUTE format($SQL$
    CREATE TABLE IF NOT EXISTS %I.syslogs (
      id BIGSERIAL PRIMARY KEY,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_syslogs_received ON %I.syslogs (received_at DESC)', p_schema_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_syslogs_user_ip ON %I.syslogs (user_ip)', p_schema_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_syslogs_visited ON %I.syslogs (visited_ip, visited_port)', p_schema_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_syslogs_pppoe ON %I.syslogs (pppoe_user, received_at DESC)', p_schema_name);

  -- MikroTik / NAS device registry
  EXECUTE format($SQL$
    CREATE TABLE IF NOT EXISTS %I.devices (
      id SERIAL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      device_ip INET NOT NULL,
      config_type VARCHAR(16) NOT NULL DEFAULT 'NAT',
      nat_ip INET,
      syslog_user VARCHAR(64) NOT NULL DEFAULT 'log',
      syslog_port INT NOT NULL DEFAULT 514,
      listen_port INT NOT NULL DEFAULT 514,
      api_user VARCHAR(128),
      api_password VARCHAR(256),
      api_port INT NOT NULL DEFAULT 8728,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  $SQL$, p_schema_name);

  -- MikroTik routers (NAT gateways sending syslog)
  EXECUTE format($SQL$
    CREATE TABLE IF NOT EXISTS %I.routers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      router_ip INET NOT NULL,
      identity VARCHAR(128),
      nat_ip INET,
      model VARCHAR(64),
      routeros_version VARCHAR(32),
      syslog_port INT NOT NULL DEFAULT 514,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (router_ip)
    )
  $SQL$, p_schema_name);

  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_routers_ip ON %I.routers (router_ip)', p_schema_name);

  -- PPPoE subscriber registry
  EXECUTE format($SQL$
    CREATE TABLE IF NOT EXISTS %I.pppoe_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(128) NOT NULL UNIQUE,
      mac_address VARCHAR(20),
      last_private_ip INET,
      last_public_ip INET,
      router_id INT REFERENCES %I.routers(id) ON DELETE SET NULL,
      session_count BIGINT NOT NULL DEFAULT 0,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status VARCHAR(32) NOT NULL DEFAULT 'active'
    )
  $SQL$, p_schema_name, p_schema_name);

  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pppoe_users_mac ON %I.pppoe_users (mac_address)', p_schema_name);

  -- Primary MikroTik ingest target (session / NAT logs)
  EXECUTE format($SQL$
    CREATE TABLE IF NOT EXISTS %I.session_logs (
      id BIGSERIAL PRIMARY KEY,
      log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      router_id INT REFERENCES %I.routers(id) ON DELETE SET NULL,
      pppoe_user VARCHAR(128),
      mac_address VARCHAR(20),
      user_ip INET,
      user_port INT,
      nat_ip INET,
      nat_port INT,
      visited_ip INET,
      visited_port INT,
      protocol VARCHAR(16),
      log_topic VARCHAR(64),
      raw_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  $SQL$, p_schema_name, p_schema_name);

  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_session_logs_time ON %I.session_logs (log_time DESC)', p_schema_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_session_logs_user ON %I.session_logs (pppoe_user, log_time DESC)', p_schema_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_session_logs_nat ON %I.session_logs (nat_ip, log_time DESC)', p_schema_name);
END;
$$;

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
