\c isp_logserver

\i sql/tenant-schema-function.sql

-- Ensure plan_id is NOT NULL on tenants
ALTER TABLE public.tenants
  ALTER COLUMN plan_id SET NOT NULL;

-- Demo tenant schema (PHASE 2 template)
SELECT public.create_tenant_schema('tenant_001');

INSERT INTO public.tenants (admin_name, admin_email, schema_name, plan_id, status, expires_at)
SELECT
  'Cyber Link Demo',
  'demo@cyberlink.com',
  'tenant_001',
  1,
  'active',
  NOW() + INTERVAL '365 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE schema_name = 'tenant_001');

-- Sample syslog rows for demo tenant
INSERT INTO tenant_001.syslogs (
  pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port,
  visited_ip, visited_port, protocol, country_code, city
)
SELECT * FROM (VALUES
  ('clc05@sohel3', 'CC:2D:21:3F:BC:D0', '10.55.120.44'::inet, 51234, '160.187.175.136'::inet, 443, '142.250.185.46'::inet, 443, 'TCP', 'US', 'Mountain View'),
  ('01baharuddin', '50:3D:D1:B2:74:B6', '10.55.88.12'::inet, 49821, '160.187.175.137'::inet, 8080, '104.21.45.12'::inet, 443, 'TCP', 'US', 'San Francisco'),
  ('shohid', 'D8:32:14:9C:13:B0', '10.56.10.200'::inet, 60102, '160.187.175.138'::inet, 53, '8.8.8.8'::inet, 53, 'UDP', 'US', NULL)
) AS v(pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port, visited_ip, visited_port, protocol, country_code, city)
WHERE NOT EXISTS (SELECT 1 FROM tenant_001.syslogs LIMIT 1);
