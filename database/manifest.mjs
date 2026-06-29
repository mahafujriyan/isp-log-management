/**
 * Ordered SQL apply lists — production only (no demo/fake data).
 */

export const PUBLIC_SCHEMA_FILES = [
  "schema/public/00_migrations.sql",
  "schema/public/01_core.sql",
  "schema/public/02_btrc.sql",
  "schema/public/03_nat_logs.sql",
  "schema/public/04_metrics.sql",
  "schema/public/05_menus.sql",
  "schema/public/06_company.sql",
  "schema/public/07_demo_requests.sql",
  "schema/public/08_router_map.sql",
];

export const TENANT_SCHEMA_FILES = ["schema/tenant/functions.sql"];

/** System reference only: plans, menus, metrics defs, real admin accounts */
export const REFERENCE_SEED_FILES = ["schema/seeds/01_reference.sql"];

/** Real ISP tenant + MikroTik router — no sample logs */
export const PRODUCTION_SEED_FILES = [
  "schema/seeds/02_tenant_production.sql",
  "schema/seeds/04_router_sfp1.sql",
];

export const PURGE_DEMO_FILE = "schema/seeds/99_purge_demo.sql";

export const SEED_FILES = [...REFERENCE_SEED_FILES, ...PRODUCTION_SEED_FILES];

/** Versioned patches applied after base schema (idempotent). */
export const MIGRATION_VERSIONS = [
  {
    version: "001_initial",
    description: "Public schema + tenant functions + production seeds",
    files: [...PUBLIC_SCHEMA_FILES, ...TENANT_SCHEMA_FILES, ...SEED_FILES],
  },
  {
    version: "002_backfill_tenants",
    description: "Ensure all active tenants have full schema",
    sql: `
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN SELECT schema_name FROM public.tenants WHERE status = 'active' LOOP
          PERFORM public.create_tenant_schema(r.schema_name);
        END LOOP;
      END $$;
    `,
  },
  {
    version: "003_purge_demo_data",
    description: "Remove demo sandbox, fake devices, and sample syslog rows",
    files: [PURGE_DEMO_FILE],
  },
];
