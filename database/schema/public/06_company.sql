-- Per-tenant company settings + backup history

CREATE TABLE IF NOT EXISTS public.company_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INT UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name VARCHAR(256) NOT NULL DEFAULT 'Cyber Link Communication',
  server_ip VARCHAR(64) NOT NULL DEFAULT '',
  alert_email VARCHAR(256) NOT NULL DEFAULT '',
  log_retention_days INT NOT NULL DEFAULT 90,
  logo_url TEXT NOT NULL DEFAULT '',
  tagline VARCHAR(256) NOT NULL DEFAULT '',
  support_phone VARCHAR(64) NOT NULL DEFAULT '',
  website VARCHAR(256) NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.db_backups (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_label VARCHAR(256) NOT NULL,
  size_mb DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_db_backups_tenant ON public.db_backups (tenant_id, created_at DESC);
