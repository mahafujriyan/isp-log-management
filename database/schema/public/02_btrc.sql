-- BTRC compliance (national regulator export)

CREATE TABLE IF NOT EXISTS public.btrc_config (
  id SERIAL PRIMARY KEY,
  isp_license VARCHAR(64) NOT NULL DEFAULT 'ISP-BD-XXXX-XXXX',
  isp_name VARCHAR(256) NOT NULL DEFAULT 'Cyber Link Communication',
  api_url VARCHAR(512) NOT NULL DEFAULT '',
  auto_submit BOOLEAN NOT NULL DEFAULT FALSE,
  submit_interval_hours INT NOT NULL DEFAULT 24,
  retention_days INT NOT NULL DEFAULT 180,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  contact_email VARCHAR(256) NOT NULL DEFAULT '',
  last_submission_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_by VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_btrc_submissions_submitted ON public.btrc_submissions (submitted_at DESC);
