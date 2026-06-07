# PHASE 8: MikroTik Integration + Dynamic Charts

**Status: ✅ COMPLETE**

**Goal:** Parse MikroTik syslog data, store metrics, and display configurable charts per tenant — with Super Admin visibility controls.

**Estimated time:** 4–6 hours

---

## Architecture

```
MikroTik Router → syslog (514) → Parser → syslogs + metric_data → API → DynamicChart → Analytics page
                                      ↑
                         Super Admin configures visibility (tenant_metric_settings)
```

---

## STEP 8.1: Database schema ✅

Tables in `public`:

| Table | Purpose |
|-------|---------|
| `metrics` | Metric definitions (name, chart_type, color, unit) |
| `tenant_metric_settings` | Per-tenant visibility, position, size, refresh |
| `metric_data` | Time-series values |

Apply migration:

```bash
npm run db:phase8
```

Default metrics: bandwidth, active_users, active_connections, protocol_dist, top_ips, error_rate.

---

## STEP 8.2: MikroTik parser ✅

`src/utils/mikrotik-parser.utils.ts` (re-export: `src/lib/mikrotik-parser.ts`)

- `parseMikroTikLog(rawLog)` — key=value syslog format
- `logEntryToMikroTikLog(entry)` — from NAT log rows
- `aggregateMetrics(logs)` — bandwidth, users, connections, top IPs, protocols

Log ingest (`POST /api/logs`) automatically records metric snapshots when `tenant_id` is provided.

---

## STEP 8.3: Metrics API ✅

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/metrics?tenant_id=&range=` | Visible metrics + chart data |
| GET | `/api/admin/metrics?tenantId=` | All metrics + visibility (super admin) |
| POST | `/api/admin/metrics/[id]` | Toggle visibility `{ tenantId, isVisible }` |
| PATCH | `/api/admin/metrics/[id]` | Update position, size, refresh |

**Time ranges:** `1h`, `24h`, `7d`, `30d`

---

## STEP 8.4: Dynamic charts ✅

`DynamicChart.tsx` — Chart.js (matches existing dashboard):

| `chart_type` | Renders |
|--------------|---------|
| `line` | Line chart (bandwidth, users, error rate) |
| `bar` | Bar chart (connections, top IPs) |
| `pie` | Doughnut chart (protocol distribution) |

Chart size: `small` | `medium` | `large` (grid span on Analytics page).

---

## STEP 8.5: Super Admin metric config ✅

**URL:** `/admin/metrics`

- Select tenant
- Toggle each metric visible/hidden
- Link from `/admin` → “Configure Analytics Charts”

---

## Analytics page (sidebar) ✅

**Dashboard → Analytics** (new sidebar item under Main)

- Shows **all visible metrics** for selected tenant
- Each chart uses its configured type (line / bar / pie)
- Time range filter + auto-refresh from `refresh_interval`
- Large charts span 2 columns when `chart_size = large`

---

## Verify

```bash
npm run verify:phase8
npm run db:phase8
npm run dev
```

1. Sign in → Dashboard → **Analytics** in sidebar
2. Super Admin → `/admin/metrics` → toggle metrics
3. Return to Analytics — charts update by type

---

## Default chart mapping

| Metric | Type | Color |
|--------|------|-------|
| Total Bandwidth | line | #0EA5E9 |
| Active Users | line | #10B981 |
| Active Connections | bar | #F59E0B |
| Protocol Distribution | pie | #8B5CF6 |
| Top Visited IPs | bar | #EC4899 |
| Error Rate | line | #EF4444 |

**✅ PHASE 8 COMPLETE — System is production ready with live analytics.**
