-- Marketing demo / sales inquiries (public landing page)
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(256) NOT NULL,
  company VARCHAR(256) NOT NULL,
  phone VARCHAR(64) DEFAULT '',
  plan_interest VARCHAR(128) DEFAULT '',
  message TEXT DEFAULT '',
  source VARCHAR(64) DEFAULT 'landing',
  status VARCHAR(32) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests (status);
