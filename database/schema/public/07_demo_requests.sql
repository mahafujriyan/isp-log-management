-- Marketing landing page demo / sales inquiries

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(256) NOT NULL,
  company VARCHAR(256) NOT NULL,
  phone VARCHAR(64) NOT NULL DEFAULT '',
  plan_interest VARCHAR(128) NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  source VARCHAR(64) NOT NULL DEFAULT 'landing',
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  provisioned_user_id INT REFERENCES public.users(id) ON DELETE SET NULL,
  provisioned_tenant_id INT REFERENCES public.tenants(id) ON DELETE SET NULL,
  provisioned_at TIMESTAMPTZ,
  demo_expires_at TIMESTAMPTZ,
  duration_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests (status);
