\c isp_logserver

CREATE TABLE IF NOT EXISTS public.metrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  display_name VARCHAR(256),
  description TEXT,
  unit VARCHAR(32),
  chart_type VARCHAR(32) DEFAULT 'line',
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_metric_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_id INT REFERENCES public.metrics(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT TRUE,
  position INT DEFAULT 0,
  chart_size VARCHAR(32) DEFAULT 'medium',
  refresh_interval INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, metric_id)
);

CREATE TABLE IF NOT EXISTS public.metric_data (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_id INT REFERENCES public.metrics(id) ON DELETE CASCADE,
  value DECIMAL(20,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metric_data_time ON public.metric_data (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_data_tenant_metric ON public.metric_data (tenant_id, metric_id);

INSERT INTO public.metrics (name, display_name, unit, chart_type, color, description) VALUES
  ('bandwidth', 'Total Bandwidth Usage', 'Mbps', 'line', '#0EA5E9', 'Real-time bandwidth from MikroTik NAT logs'),
  ('active_users', 'Active Users', 'Users', 'line', '#10B981', 'Active PPPoE users'),
  ('active_connections', 'Active Connections', 'Connections', 'bar', '#F59E0B', 'Total active connections'),
  ('protocol_dist', 'Protocol Distribution', 'Count', 'pie', '#8B5CF6', 'Network protocols'),
  ('top_ips', 'Top Visited IPs', 'Bandwidth', 'bar', '#EC4899', 'Most visited IPs'),
  ('error_rate', 'Error Rate', '%', 'line', '#EF4444', 'Connection errors')
ON CONFLICT (name) DO NOTHING;

-- Default visibility for demo tenant (tenant_001)
INSERT INTO public.tenant_metric_settings (tenant_id, metric_id, is_visible, position, chart_size, refresh_interval)
SELECT t.id, m.id, TRUE, row_number() OVER (ORDER BY m.id) - 1, 'medium', 5
FROM public.tenants t
CROSS JOIN public.metrics m
WHERE t.schema_name = 'tenant_001'
ON CONFLICT (tenant_id, metric_id) DO NOTHING;

-- Sample time-series points for demo tenant
INSERT INTO public.metric_data (tenant_id, metric_id, value, recorded_at)
SELECT t.id, m.id,
  CASE m.name
    WHEN 'bandwidth' THEN (random() * 800 + 100)::decimal(20,2)
    WHEN 'active_users' THEN (random() * 80 + 20)::decimal(20,2)
    WHEN 'active_connections' THEN (random() * 500 + 50)::decimal(20,2)
    WHEN 'error_rate' THEN (random() * 3)::decimal(20,2)
    ELSE (random() * 100)::decimal(20,2)
  END,
  NOW() - (gs || ' minutes')::interval
FROM public.tenants t
CROSS JOIN public.metrics m
CROSS JOIN generate_series(0, 23) AS gs
WHERE t.schema_name = 'tenant_001'
  AND m.name IN ('bandwidth', 'active_users', 'active_connections', 'error_rate')
  AND NOT EXISTS (
    SELECT 1 FROM public.metric_data md
    WHERE md.tenant_id = t.id AND md.metric_id = m.id
    LIMIT 1
  );
