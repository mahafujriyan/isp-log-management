-- Real production tenant: Cyber Link Communication (no sample logs/devices)

SELECT public.create_tenant_schema('tenant_001');

INSERT INTO public.tenants (admin_name, admin_email, schema_name, plan_id, status, expires_at, is_demo_sandbox)
SELECT
  'Cyber Link Communication',
  'admin@cyberlink.com',
  'tenant_001',
  1,
  'active',
  NOW() + INTERVAL '365 days',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE schema_name = 'tenant_001');

UPDATE public.tenants
SET
  admin_name = 'Cyber Link Communication',
  admin_email = 'admin@cyberlink.com',
  is_demo_sandbox = FALSE
WHERE schema_name = 'tenant_001';

INSERT INTO public.tenant_metric_settings (tenant_id, metric_id, is_visible, position, chart_size, refresh_interval)
SELECT t.id, m.id, TRUE, row_number() OVER (ORDER BY m.id) - 1, 'medium', 5
FROM public.tenants t
CROSS JOIN public.metrics m
WHERE t.schema_name = 'tenant_001'
ON CONFLICT (tenant_id, metric_id) DO NOTHING;

INSERT INTO public.company_settings (tenant_id, company_name, server_ip, alert_email, log_retention_days)
SELECT t.id, 'Cyber Link Communication', '160.187.175.30', 'admin@cyberlink.com', 90
FROM public.tenants t
WHERE t.schema_name = 'tenant_001'
ON CONFLICT (tenant_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  server_ip = EXCLUDED.server_ip,
  alert_email = EXCLUDED.alert_email;
