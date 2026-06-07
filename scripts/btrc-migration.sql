-- Run this if you already applied init-db.sql before BTRC tables were added:
-- psql -U loguser -d isp_logserver -f scripts/btrc-migration.sql

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
