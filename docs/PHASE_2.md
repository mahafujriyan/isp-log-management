# PHASE 2: PostgreSQL Schema & Multi-Tenant Database

**Status: ✅ COMPLETE**

**Goal:** PostgreSQL schemas for multi-tenant support — each tenant gets an isolated schema with syslog storage.

**Estimated time:** 3–4 hours

---

## Architecture

```
public (master)
├── plans          — subscription tiers
├── tenants        — tenant registry (schema_name → isolated schema)
└── users, btrc_*  — shared platform tables

tenant_001, tenant_002, …  (per tenant)
├── syslogs        — NAT/session logs (indexed)
└── devices        — MikroTik devices (PHASE 3 ready)
```

Provisioning uses `public.create_tenant_schema(schema_name)` — see `scripts/sql/tenant-schema-function.sql`.

---

## STEP 2.1: Master Database Schema ✅

Tables in `public`:

| Table | Purpose |
|-------|---------|
| `plans` | Starter / Pro / Business / Enterprise limits |
| `tenants` | Admin contact, `schema_name`, plan, expiry |

Seed plans (BDT pricing):

- Starter — 5 users, 2 devices, 30d retention
- Pro — 20 users, 10 devices, 90d
- Business — 100 users, 50 devices, 180d
- Enterprise — unlimited-style caps, 365d

---

## STEP 2.2: Tenant Schema Template ✅

Each tenant schema contains:

```sql
CREATE TABLE {schema}.syslogs (
  id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  pppoe_user, mac_address, user_ip INET, user_port,
  nat_ip INET, nat_port, visited_ip INET, visited_port,
  protocol, country_code, city, raw_message TEXT
);
-- Indexes: received_at DESC, user_ip, (visited_ip, visited_port)
```

Demo tenant `tenant_001` is seeded with 3 sample syslog rows.

---

## Apply migration

From project root (requires PostgreSQL + `loguser`):

```bash
npm run db:init      # fresh install (includes PHASE 2 function + demo tenant)
npm run db:phase2    # existing DB — run PHASE 2 migration only
```

Or manually:

```bash
cd scripts
psql -U loguser -d isp_logserver -f phase2-migration.sql
```

Verify:

```bash
npm run verify:phase2
npm run type-check
npm run build
```

---

## API endpoints (PHASE 2)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/plans` | List subscription plans |
| GET | `/api/tenants` | List all tenants |
| POST | `/api/tenants` | Create tenant + provision schema (super_admin / operator) |
| GET | `/api/tenants/[id]` | Tenant detail + syslog count |
| GET | `/api/logs` | Query logs (`?tenant_id=`, `?schema=`, `?limit=`) |

---

## TypeScript services

| File | Role |
|------|------|
| `src/services/tenant.service.ts` | CRUD, `createTenant()`, schema provisioning |
| `src/services/syslog.service.ts` | Per-tenant and cross-tenant log queries |
| `src/utils/schema.utils.ts` | Safe schema name validation |

BTRC export reads tenant `syslogs` first via `getLogsAcrossTenants()`, then falls back to `public.nat_logs`.

---

## UI

Super Admin → **Tenant Manager** (`/admin`):

- Lists tenants with plan name
- **Add Tenant** form — creates DB row + isolated PostgreSQL schema

---

## Next: PHASE 3

Device management, syslog ingestion from MikroTik, and live log pipeline.

See [READY_TO_START_GUIDE.md](READY_TO_START_GUIDE.md) for the full roadmap.
