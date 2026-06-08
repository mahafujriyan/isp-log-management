-- Demo provisioning: sandbox tenant, time-limited demo users, request tracking

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_demo_sandbox BOOLEAN DEFAULT FALSE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(32) DEFAULT 'standard';

ALTER TABLE public.demo_requests
  ADD COLUMN IF NOT EXISTS provisioned_user_id INT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provisioned_tenant_id INT REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INT;

CREATE INDEX IF NOT EXISTS idx_users_demo_expires ON public.users (demo_expires_at)
  WHERE account_type = 'demo';

-- Shared demo sandbox (isolated from production tenant_001)
INSERT INTO public.tenants (admin_name, admin_email, schema_name, plan_id, status, expires_at, is_demo_sandbox)
SELECT
  'Demo Sandbox',
  'demo@sandbox.local',
  'tenant_demo',
  1,
  'active',
  NOW() + INTERVAL '10 years',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE is_demo_sandbox = TRUE);

SELECT public.create_tenant_schema('tenant_demo');

INSERT INTO tenant_demo.syslogs (
  pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port,
  visited_ip, visited_port, protocol, country_code, city
)
SELECT * FROM (VALUES
  ('demo_user@isp', 'AA:BB:CC:DD:EE:01', '10.70.1.10'::inet, 51234, '160.187.175.200'::inet, 443, '142.250.185.46'::inet, 443, 'TCP', 'US', 'Mountain View'),
  ('demo_user@isp', 'AA:BB:CC:DD:EE:02', '10.70.1.11'::inet, 49821, '160.187.175.201'::inet, 8080, '104.21.45.12'::inet, 443, 'TCP', 'US', 'San Francisco'),
  ('guest_demo', 'AA:BB:CC:DD:EE:03', '10.70.2.5'::inet, 60102, '160.187.175.202'::inet, 53, '8.8.8.8'::inet, 53, 'UDP', 'US', NULL)
) AS v(pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port, visited_ip, visited_port, protocol, country_code, city)
WHERE NOT EXISTS (SELECT 1 FROM tenant_demo.syslogs LIMIT 1);
