-- Enrich demo sandbox so the portal looks like a real ISP account

INSERT INTO tenant_demo.devices (name, device_ip, config_type, nat_ip, syslog_user, syslog_port, listen_port, status, last_seen_at)
SELECT * FROM (VALUES
  ('Core-RTR-01', '192.168.10.1'::inet, 'NAT', '160.187.175.200'::inet, 'log', 514, 514, 'active', NOW()),
  ('POP-DHK-02',  '192.168.20.5'::inet, 'NAT', '160.187.175.201'::inet, 'log', 514, 514, 'active', NOW() - INTERVAL '2 minutes'),
  ('POP-CTG-01',  '192.168.30.8'::inet, 'NAT', '160.187.175.202'::inet, 'log', 514, 514, 'active', NOW() - INTERVAL '5 minutes')
) AS v(name, device_ip, config_type, nat_ip, syslog_user, syslog_port, listen_port, status, last_seen_at)
WHERE NOT EXISTS (SELECT 1 FROM tenant_demo.devices LIMIT 1);

INSERT INTO tenant_demo.syslogs (
  pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port,
  visited_ip, visited_port, protocol, country_code, city
)
SELECT * FROM (VALUES
  ('rifat_001@isp',    'CC:2D:21:3F:BC:D0', '10.70.10.44'::inet, 51234, '160.187.175.200'::inet, 443, '142.250.185.46'::inet, 443, 'TCP', 'US', 'Mountain View'),
  ('01karim@net',      '50:3D:D1:B2:74:B6', '10.70.11.12'::inet, 49821, '160.187.175.201'::inet, 8080, '104.21.45.12'::inet, 443, 'TCP', 'US', 'San Francisco'),
  ('sadia_home',       'D8:32:14:9C:13:B0', '10.70.12.200'::inet, 60102, '160.187.175.202'::inet, 53, '8.8.8.8'::inet, 53, 'UDP', 'US', NULL),
  ('imran_office',     'AA:BB:CC:11:22:33', '10.70.13.55'::inet, 44321, '160.187.175.200'::inet, 443, '31.13.72.36'::inet, 443, 'TCP', 'US', 'Menlo Park'),
  ('nusrat_wifi',      'FF:EE:DD:44:55:66', '10.70.14.90'::inet, 52001, '160.187.175.201'::inet, 80, '52.94.236.248'::inet, 80, 'TCP', 'US', 'Seattle'),
  ('zakir_cafe',       '11:22:33:44:55:66', '10.70.15.3'::inet, 61000, '160.187.175.202'::inet, 443, '64.233.160.0'::inet, 443, 'TCP', 'US', NULL)
) AS v(pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port, visited_ip, visited_port, protocol, country_code, city)
WHERE (SELECT COUNT(*)::int FROM tenant_demo.syslogs) < 6;

-- Copy metric visibility from tenant 001 to demo sandbox tenant (if both exist)
INSERT INTO public.tenant_metric_settings (tenant_id, metric_id, is_visible, position, chart_size, refresh_interval)
SELECT dt.id, tms.metric_id, tms.is_visible, tms.position, tms.chart_size, tms.refresh_interval
FROM public.tenant_metric_settings tms
JOIN public.tenants st ON st.id = tms.tenant_id AND st.schema_name = 'tenant_001'
JOIN public.tenants dt ON dt.is_demo_sandbox = TRUE
ON CONFLICT (tenant_id, metric_id) DO NOTHING;

-- Demo users use operator role (same portal sections as production operator)
UPDATE public.users SET role = 'operator' WHERE account_type = 'demo';

INSERT INTO public.company_settings (tenant_id, company_name, server_ip, alert_email, log_retention_days)
SELECT t.id, 'Demo ISP Sandbox', '160.187.175.200', 'noc@demosandbox.local', 90
FROM public.tenants t
WHERE t.is_demo_sandbox = TRUE
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.db_backups (tenant_id, file_label, size_mb)
SELECT t.id, 'demo_sandbox_backup.sql', 128.5
FROM public.tenants t
WHERE t.is_demo_sandbox = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.db_backups b WHERE b.tenant_id = t.id
  );
