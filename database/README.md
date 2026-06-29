# Database layer

PostgreSQL **schema-per-tenant** (`tenant_001`, …). Runtime uses `pg` + SQL (not Prisma Client).

**Production:** PostgreSQL on VPS `127.0.0.1:5432/isp_logserver` — see [deploy/VPS-POSTGRES.md](../deploy/VPS-POSTGRES.md)

## Layout

```
database/
├── README.md                 ← you are here
├── SCHEMA.md                 ← table reference (public + tenant)
├── schema/
│   ├── public/               ← shared tables (DDL only)
│   ├── tenant/               ← create_tenant_schema() functions
│   └── seeds/                ← dev/demo data (optional on production)
├── migrations/               ← versioned patches (tracked in DB)
│   └── 001_initial/
└── scripts/
    ├── setup.mjs             ← fresh install: schema + seeds
    ├── migrate.mjs           ← apply pending migrations
    └── lib/
```

## Commands

```bash
npm run db:setup      # full schema + seeds (new DB)
npm run db:migrate    # apply pending migrations only
npm run db:sync-routers
```

## Public tables (15)

`plans`, `tenants`, `users`, `btrc_config`, `btrc_submissions`, `nat_logs`, `metrics`, `tenant_metric_settings`, `metric_data`, `app_menus`, `role_menu_assignments`, `company_settings`, `db_backups`, `demo_requests`, `router_tenant_map`, `schema_migrations`

## Per-tenant tables (5)

`syslogs`, `devices`, `routers`, `pppoe_users`, `session_logs`

Created by `SELECT public.create_tenant_schema('tenant_NNN');`

## New tenant

```sql
SELECT public.create_tenant_schema('tenant_002');
```

Or via app: Super Admin → create tenant (calls `provisionTenantSchema`).
