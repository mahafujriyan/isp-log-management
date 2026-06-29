\c isp_logserver

-- DEPRECATED for app bootstrap — use: npm run db:setup
-- Manual psql only. Paths relative to scripts/

\i ../database/schema/public/00_migrations.sql
\i ../database/schema/public/01_core.sql
\i ../database/schema/public/02_btrc.sql
\i ../database/schema/public/03_nat_logs.sql
\i ../database/schema/public/04_metrics.sql
\i ../database/schema/public/05_menus.sql
\i ../database/schema/public/06_company.sql
\i ../database/schema/public/07_demo_requests.sql
\i ../database/schema/public/08_router_map.sql
\i ../database/schema/tenant/functions.sql
\i ../database/schema/seeds/01_reference.sql
\i ../database/schema/seeds/02_tenant_001.sql
\i ../database/schema/seeds/03_tenant_demo.sql
\i ../database/schema/seeds/04_router_sfp1.sql
