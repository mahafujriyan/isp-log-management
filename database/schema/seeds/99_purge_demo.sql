-- Remove demo/fake data from existing databases (safe to re-run)

-- Drop demo sandbox tenant schema + row
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tenants WHERE schema_name = 'tenant_demo') THEN
    PERFORM public.drop_tenant_schema('tenant_demo');
    DELETE FROM public.router_tenant_map
    WHERE schema_name = 'tenant_demo' OR tenant_id IN (SELECT id FROM public.tenants WHERE schema_name = 'tenant_demo');
    DELETE FROM public.company_settings WHERE tenant_id IN (SELECT id FROM public.tenants WHERE is_demo_sandbox = TRUE);
    DELETE FROM public.tenant_metric_settings WHERE tenant_id IN (SELECT id FROM public.tenants WHERE is_demo_sandbox = TRUE);
    DELETE FROM public.db_backups WHERE tenant_id IN (SELECT id FROM public.tenants WHERE is_demo_sandbox = TRUE);
    DELETE FROM public.tenants WHERE schema_name = 'tenant_demo' OR is_demo_sandbox = TRUE;
  END IF;
END $$;

-- Remove seeded fake devices (keep real MikroTik CLC-SFP1-NAT at 160.187.175.26)
DELETE FROM tenant_001.devices
WHERE host(device_ip) IN ('160.187.175.136', '160.187.175.137', '160.187.175.138', '160.187.175.139', '160.187.175.143', '160.187.175.9', '160.187.175.46');

-- Remove seeded sample syslog rows only (keep real MikroTik-ingested logs)
DELETE FROM tenant_001.syslogs
WHERE pppoe_user IN ('clc05@sohel3', '01baharuddin', 'shohid')
   OR mac_address IN ('CC:2D:21:3F:BC:D0', '50:3D:D1:B2:74:B6', 'D8:32:14:9C:13:B0');

DELETE FROM tenant_001.session_logs
WHERE pppoe_user IN ('clc05@sohel3', '01baharuddin', 'shohid');

-- Remove fake metric time-series samples
DELETE FROM public.metric_data;

-- Remove demo sandbox users
DELETE FROM public.users WHERE account_type = 'demo' OR email LIKE '%@demosandbox.local';
