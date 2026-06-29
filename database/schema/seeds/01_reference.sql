-- Reference data: plans, auth users, BTRC config, metrics, menus

INSERT INTO public.plans (name, max_users, max_devices, retention_days, max_logs_per_day, price_bdt, is_featured)
VALUES
  ('Starter', 5, 2, 30, 500000, 2000, FALSE),
  ('Pro', 20, 10, 90, 5000000, 6000, TRUE),
  ('Business', 100, 50, 180, 25000000, 15000, FALSE),
  ('Enterprise', 999, 999, 365, 999999999, 0, FALSE)
ON CONFLICT (name) DO UPDATE SET is_featured = EXCLUDED.is_featured;

-- Passwords: Admin@123456 / Super@Secure2026!
INSERT INTO public.users (tenant_id, username, email, password_hash, role, is_active)
VALUES
  (NULL, 'operator1', 'admin@cyberlink.com', '$2b$10$GZSw4JvH0BN3Jz412OfisuGMkFIeGXLVIL3nxvYKu79hQTUFmGjJK', 'operator', TRUE),
  (NULL, 'admin', 'superadmin@cyberlink.com', '$2b$10$jyMQD2UASx09HitKx86Qr.IVZkMNIUFIdmaFm3NeABGbT27RBR3nW', 'super_admin', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.btrc_config (isp_license, isp_name, retention_days, contact_email)
SELECT 'ISP-BD-CYBER-2024', 'Cyber Link Communication', 180, 'admin@cyberlink.com'
WHERE NOT EXISTS (SELECT 1 FROM public.btrc_config LIMIT 1);

INSERT INTO public.metrics (name, display_name, unit, chart_type, color, description) VALUES
  ('bandwidth', 'Total Bandwidth Usage', 'Mbps', 'line', '#0EA5E9', 'Real-time bandwidth from MikroTik NAT logs'),
  ('active_users', 'Active Users', 'Users', 'line', '#10B981', 'Active PPPoE users'),
  ('active_connections', 'Active Connections', 'Connections', 'bar', '#F59E0B', 'Total active connections'),
  ('protocol_dist', 'Protocol Distribution', 'Count', 'pie', '#8B5CF6', 'Network protocols'),
  ('top_ips', 'Top Visited IPs', 'Bandwidth', 'bar', '#EC4899', 'Most visited IPs'),
  ('error_rate', 'Error Rate', '%', 'line', '#EF4444', 'Connection errors')
ON CONFLICT (name) DO NOTHING;

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

INSERT INTO public.role_menu_assignments (role, menu_id)
SELECT 'super_admin', id FROM public.app_menus
ON CONFLICT (role, menu_id) DO NOTHING;

INSERT INTO public.role_menu_assignments (role, menu_id)
SELECT 'operator', id FROM public.app_menus
WHERE page_id IN (
  'dashboard', 'analytics', 'stream', 'devices', 'disabled', 'search',
  'usermgr', 'servermgr', 'serviceinfo', 'btrc', 'company', 'faq'
)
ON CONFLICT (role, menu_id) DO NOTHING;

INSERT INTO public.role_menu_assignments (role, menu_id)
SELECT 'viewer', id FROM public.app_menus
WHERE page_id IN ('dashboard', 'analytics', 'stream', 'devices', 'search', 'serviceinfo', 'faq')
ON CONFLICT (role, menu_id) DO NOTHING;
