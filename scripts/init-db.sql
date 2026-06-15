\c isp_logserver

CREATE TABLE IF NOT EXISTS public.plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL,
  max_users INT DEFAULT 5,
  max_devices INT DEFAULT 2,
  retention_days INT DEFAULT 30,
  max_logs_per_day BIGINT DEFAULT 500000,
  price_bdt DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id SERIAL PRIMARY KEY,
  admin_name VARCHAR(128) NOT NULL,
  admin_email VARCHAR(256) NOT NULL,
  schema_name VARCHAR(128) UNIQUE NOT NULL,
  plan_id INT NOT NULL REFERENCES public.plans(id) DEFAULT 1,
  status VARCHAR(32) DEFAULT 'active',
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES public.tenants(id),
  username VARCHAR(128) NOT NULL,
  email VARCHAR(256) NOT NULL UNIQUE,
  password_hash VARCHAR(256),
  role VARCHAR(32) DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.plans (name, max_users, max_devices, retention_days, max_logs_per_day, price_bdt)
VALUES
  ('Starter', 5, 2, 30, 500000, 2000),
  ('Pro', 20, 10, 90, 5000000, 6000),
  ('Business', 100, 50, 180, 25000000, 15000),
  ('Enterprise', 999, 999, 365, 999999999, 0)
ON CONFLICT (name) DO NOTHING;

-- Default demo users (passwords: Admin@123456 and Super@Secure2026!)
INSERT INTO public.users (tenant_id, username, email, password_hash, role, is_active)
VALUES
  (NULL, 'operator1', 'admin@cyberlink.com', '$2b$10$GZSw4JvH0BN3Jz412OfisuGMkFIeGXLVIL3nxvYKu79hQTUFmGjJK', 'operator', TRUE),
  (NULL, 'admin', 'superadmin@cyberlink.com', '$2b$10$jyMQD2UASx09HitKx86Qr.IVZkMNIUFIdmaFm3NeABGbT27RBR3nW', 'super_admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- BTRC compliance tables
CREATE TABLE IF NOT EXISTS public.btrc_config (
  id SERIAL PRIMARY KEY,
  isp_license VARCHAR(64) NOT NULL DEFAULT 'ISP-BD-XXXX-XXXX',
  isp_name VARCHAR(256) NOT NULL DEFAULT 'Cyber Link Communication',
  api_url VARCHAR(512) DEFAULT '',
  auto_submit BOOLEAN DEFAULT FALSE,
  submit_interval_hours INT DEFAULT 24,
  retention_days INT DEFAULT 180,
  timezone VARCHAR(64) DEFAULT 'Asia/Dhaka',
  contact_email VARCHAR(256) DEFAULT '',
  last_submission_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.btrc_submissions (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(64) UNIQUE NOT NULL,
  record_count INT NOT NULL,
  period_from TIMESTAMPTZ NOT NULL,
  period_to TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL,
  response_code INT,
  response_message TEXT,
  file_hash VARCHAR(128),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS public.nat_logs (
  id BIGSERIAL PRIMARY KEY,
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pppoe_user VARCHAR(256) NOT NULL,
  mac_address VARCHAR(32) NOT NULL,
  private_ip INET NOT NULL,
  public_ip INET NOT NULL,
  public_port INT NOT NULL,
  dest_ip INET NOT NULL,
  dest_port INT NOT NULL,
  protocol VARCHAR(16) DEFAULT 'TCP',
  device_name VARCHAR(128),
  btrc_exported BOOLEAN DEFAULT FALSE,
  btrc_batch_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nat_logs_time ON public.nat_logs(log_time DESC);
CREATE INDEX IF NOT EXISTS idx_nat_logs_btrc ON public.nat_logs(btrc_exported, log_time);

INSERT INTO public.btrc_config (isp_license, isp_name, retention_days, contact_email)
SELECT 'ISP-BD-CYBER-2024', 'Cyber Link Communication', 180, 'admin@cyberlink.com'
WHERE NOT EXISTS (SELECT 1 FROM public.btrc_config LIMIT 1);

-- PHASE 2: Multi-tenant schema provisioning
\i sql/tenant-schema-function.sql

SELECT public.create_tenant_schema('tenant_001');

INSERT INTO public.tenants (admin_name, admin_email, schema_name, plan_id, status, expires_at)
SELECT 'Cyber Link Demo', 'demo@cyberlink.com', 'tenant_001', 1, 'active', NOW() + INTERVAL '365 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE schema_name = 'tenant_001');

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

-- PHASE 8: MikroTik metrics & dynamic charts
\i phase8-migration.sql

-- Menu manager: sidebar items + role permissions
\i menu-migration.sql

-- Company settings + demo devices
\i company-migration.sql

-- Company branding columns (logo, tagline, contact)
\i company-branding-migration.sql

-- Marketing demo / sales inquiries
\i demo-request-migration.sql

-- Featured plan flag for marketing pricing
\i plans-featured-migration.sql

-- Demo sandbox + time-limited demo accounts
\i demo-provisioning-migration.sql

-- MikroTik syslog: routers, pppoe_users, session_logs
\i mikrotik-syslog-migration.sql

-- Device API credentials (api_user, api_password, api_port)
\i device-credentials-migration.sql
