-- Global MikroTik router → tenant routing (syslog ingest)

CREATE TABLE IF NOT EXISTS public.router_tenant_map (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  schema_name VARCHAR(128) NOT NULL,
  router_ip INET NOT NULL,
  router_id INT NOT NULL,
  nat_ip INET,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (router_ip)
);

CREATE INDEX IF NOT EXISTS idx_router_tenant_map_ip ON public.router_tenant_map (router_ip);
CREATE INDEX IF NOT EXISTS idx_router_tenant_map_nat ON public.router_tenant_map (nat_ip);
CREATE INDEX IF NOT EXISTS idx_router_tenant_map_tenant ON public.router_tenant_map (tenant_id);
