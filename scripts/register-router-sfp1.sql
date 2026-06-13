-- Register MikroTik SFP1 NAT router (160.187.175.26) for tenant_001
-- Run: npm run db:register-sfp1

INSERT INTO tenant_001.devices (name, device_ip, config_type, nat_ip, syslog_user, syslog_port, listen_port, status, last_seen_at)
SELECT 'CLC-SFP1-NAT', '160.187.175.26'::inet, 'NAT', '160.187.175.26'::inet, 'log', 514, 514, 'active', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_001.devices WHERE host(device_ip) = '160.187.175.26'
);

INSERT INTO tenant_001.routers (name, router_ip, identity, nat_ip, syslog_port, status, last_seen_at)
SELECT 'CLC-SFP1-NAT', '160.187.175.26'::inet, 'CLC-SFP1-NAT', '160.187.175.26'::inet, 514, 'active', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_001.routers WHERE host(router_ip) = '160.187.175.26'
);

INSERT INTO public.router_tenant_map (tenant_id, schema_name, router_ip, router_id, nat_ip, updated_at)
SELECT t.id, t.schema_name, '160.187.175.26'::inet, r.id, '160.187.175.26'::inet, NOW()
FROM public.tenants t
JOIN tenant_001.routers r ON host(r.router_ip) = '160.187.175.26'
WHERE t.schema_name = 'tenant_001'
ON CONFLICT (router_ip) DO UPDATE SET
  router_id = EXCLUDED.router_id,
  nat_ip = EXCLUDED.nat_ip,
  updated_at = NOW();

UPDATE public.company_settings
SET server_ip = '160.187.175.30', updated_at = NOW()
WHERE tenant_id = (SELECT id FROM public.tenants WHERE schema_name = 'tenant_001' LIMIT 1);
