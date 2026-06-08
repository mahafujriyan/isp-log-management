-- Menu definitions + role-based sidebar permissions

CREATE TABLE IF NOT EXISTS public.app_menus (
  id SERIAL PRIMARY KEY,
  label VARCHAR(128) NOT NULL,
  page_id VARCHAR(64) NOT NULL UNIQUE,
  url_path VARCHAR(256) NOT NULL,
  section VARCHAR(32) NOT NULL DEFAULT 'main',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_menu_assignments (
  id SERIAL PRIMARY KEY,
  role VARCHAR(32) NOT NULL,
  menu_id INT NOT NULL REFERENCES public.app_menus(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (role, menu_id)
);

CREATE INDEX IF NOT EXISTS idx_app_menus_section ON public.app_menus(section, sort_order);
CREATE INDEX IF NOT EXISTS idx_role_menu_role ON public.role_menu_assignments(role);

INSERT INTO public.app_menus (label, page_id, url_path, section, sort_order)
VALUES
  ('Dashboard', 'dashboard', '/LogServer/Index', 'main', 1),
  ('Log Stream', 'stream', '/LogServer/TraceRoute', 'main', 2),
  ('Analytics', 'analytics', '/Analytics/Index', 'main', 3),
  ('Devices', 'devices', '/Server/Index', 'main', 4),
  ('Disabled Devices', 'disabled', '/Server/DisabledServers', 'main', 5),
  ('Search Log', 'search', '/SearchLog/SearchResult', 'main', 6),
  ('User Manager', 'usermgr', '/UserManager/Index', 'admin', 7),
  ('Role Manager', 'rolemgr', '/UserManager/UserRole', 'admin', 8),
  ('Server Manager', 'servermgr', '/UserManager/UserServer', 'admin', 9),
  ('Menu Manager', 'menumgr', '/UserManager/RoleMenu', 'admin', 10),
  ('Service Info', 'serviceinfo', '/ServiceInfo/Index', 'system', 11),
  ('BTRC Compliance', 'btrc', '/BTRC/Index', 'system', 12),
  ('Company Settings', 'company', '/CompanySettings/Index', 'system', 13),
  ('FAQ', 'faq', '/FAQ/Index', 'system', 14)
ON CONFLICT (page_id) DO UPDATE SET
  label = EXCLUDED.label,
  url_path = EXCLUDED.url_path,
  section = EXCLUDED.section,
  sort_order = EXCLUDED.sort_order;

-- Super Admin: all menus (matches legacy screenshot)
INSERT INTO public.role_menu_assignments (role, menu_id)
SELECT 'super_admin', id FROM public.app_menus
ON CONFLICT (role, menu_id) DO NOTHING;

-- Operator: main + selected admin/system (no menu manager)
INSERT INTO public.role_menu_assignments (role, menu_id)
SELECT 'operator', id FROM public.app_menus
WHERE page_id IN (
  'dashboard', 'analytics', 'stream', 'devices', 'disabled', 'search',
  'usermgr', 'servermgr', 'serviceinfo', 'btrc', 'company', 'faq'
)
ON CONFLICT (role, menu_id) DO NOTHING;

-- Viewer: read-only pages
INSERT INTO public.role_menu_assignments (role, menu_id)
SELECT 'viewer', id FROM public.app_menus
WHERE page_id IN ('dashboard', 'analytics', 'stream', 'devices', 'search', 'serviceinfo', 'faq')
ON CONFLICT (role, menu_id) DO NOTHING;
