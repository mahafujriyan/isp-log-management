-- Company settings + backup history

CREATE TABLE IF NOT EXISTS public.company_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name VARCHAR(256) NOT NULL DEFAULT 'Cyber Link Communication',
  server_ip VARCHAR(64) DEFAULT '',
  alert_email VARCHAR(256) DEFAULT '',
  log_retention_days INT NOT NULL DEFAULT 90,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS public.db_backups (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_label VARCHAR(256) NOT NULL,
  size_mb DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.company_settings (tenant_id, company_name, server_ip, alert_email, log_retention_days)
SELECT t.id, 'Cyber Link Communication', '160.187.175.30', 'admin@cyberlink.com', 90
FROM public.tenants t
WHERE t.schema_name = 'tenant_001'
ON CONFLICT (tenant_id) DO NOTHING;

-- Demo devices for tenant_001
INSERT INTO tenant_001.devices (name, device_ip, config_type, nat_ip, syslog_user, syslog_port, listen_port, status, last_seen_at)
SELECT * FROM (VALUES
  ('Exabye_Core', '160.187.175.136'::inet, 'NAT', '160.187.175.136'::inet, 'log', 514, 514, 'active', NOW()),
  ('CyberHome-DIS', '160.187.175.137'::inet, 'ACCESS', '160.187.175.137'::inet, 'log', 514, 514, 'active', NOW())
) AS v(name, device_ip, config_type, nat_ip, syslog_user, syslog_port, listen_port, status, last_seen_at)
WHERE NOT EXISTS (SELECT 1 FROM tenant_001.devices LIMIT 1);
