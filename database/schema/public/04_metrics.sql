-- Dashboard analytics metrics (per-tenant visibility)

CREATE TABLE IF NOT EXISTS public.metrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  display_name VARCHAR(256),
  description TEXT,
  unit VARCHAR(32),
  chart_type VARCHAR(32) NOT NULL DEFAULT 'line',
  color VARCHAR(7),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_metric_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_id INT NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  position INT NOT NULL DEFAULT 0,
  chart_size VARCHAR(32) NOT NULL DEFAULT 'medium',
  refresh_interval INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, metric_id)
);

CREATE TABLE IF NOT EXISTS public.metric_data (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_id INT NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  value DECIMAL(20, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metric_data_time ON public.metric_data (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_data_tenant_metric ON public.metric_data (tenant_id, metric_id);
