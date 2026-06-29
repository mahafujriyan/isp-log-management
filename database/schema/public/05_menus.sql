-- Sidebar menus + role-based access

CREATE TABLE IF NOT EXISTS public.app_menus (
  id SERIAL PRIMARY KEY,
  label VARCHAR(128) NOT NULL,
  page_id VARCHAR(64) NOT NULL UNIQUE,
  url_path VARCHAR(256) NOT NULL,
  section VARCHAR(32) NOT NULL DEFAULT 'main',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_menu_assignments (
  id SERIAL PRIMARY KEY,
  role VARCHAR(32) NOT NULL,
  menu_id INT NOT NULL REFERENCES public.app_menus(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role, menu_id)
);

CREATE INDEX IF NOT EXISTS idx_app_menus_section ON public.app_menus (section, sort_order);
CREATE INDEX IF NOT EXISTS idx_role_menu_role ON public.role_menu_assignments (role);
