-- Core multi-tenant identity: plans, tenants, users

CREATE TABLE IF NOT EXISTS public.plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL,
  max_users INT NOT NULL DEFAULT 5,
  max_devices INT NOT NULL DEFAULT 2,
  retention_days INT NOT NULL DEFAULT 30,
  max_logs_per_day BIGINT NOT NULL DEFAULT 500000,
  price_bdt DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id SERIAL PRIMARY KEY,
  admin_name VARCHAR(128) NOT NULL,
  admin_email VARCHAR(256) NOT NULL,
  schema_name VARCHAR(128) UNIQUE NOT NULL,
  plan_id INT NOT NULL REFERENCES public.plans(id) DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  is_demo_sandbox BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES public.tenants(id) ON DELETE SET NULL,
  username VARCHAR(128) NOT NULL,
  email VARCHAR(256) NOT NULL UNIQUE,
  password_hash VARCHAR(256),
  role VARCHAR(32) NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  account_type VARCHAR(32) NOT NULL DEFAULT 'standard',
  demo_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_demo_expires ON public.users (demo_expires_at)
  WHERE account_type = 'demo';

CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants (status);
CREATE INDEX IF NOT EXISTS idx_tenants_schema ON public.tenants (schema_name);
