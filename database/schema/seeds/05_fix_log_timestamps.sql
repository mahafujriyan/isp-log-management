-- Link operator user to tenant_001 + fix stale log timestamps for dashboard display

UPDATE public.users u
SET tenant_id = t.id
FROM public.tenants t
WHERE t.schema_name = 'tenant_001'
  AND u.email = 'admin@cyberlink.com'
  AND (u.tenant_id IS NULL OR u.tenant_id <> t.id);

-- Logs ingested with wrong syslog header dates (e.g. "Jun  8") — bump to now for UI filters
UPDATE tenant_001.session_logs
SET log_time = NOW()
WHERE log_time < NOW() - INTERVAL '7 days';

UPDATE tenant_001.syslogs
SET received_at = NOW()
WHERE received_at < NOW() - INTERVAL '7 days';
