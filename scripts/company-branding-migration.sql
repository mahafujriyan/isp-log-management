-- Company branding + contact fields for operator account settings

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tagline VARCHAR(256) DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_phone VARCHAR(64) DEFAULT '',
  ADD COLUMN IF NOT EXISTS website VARCHAR(256) DEFAULT '',
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Dhaka';
