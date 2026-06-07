# BTRC Integration Guide

Bangladesh Telecommunication Regulatory Commission (BTRC) requires ISPs to maintain and submit NAT session logs for subscriber traceability.

## Dashboard

Open **System → BTRC Compliance** in the dashboard (`/dashboard` → sidebar).

Features:
- Compliance status banner
- Export logs as **CSV** or **JSON** (BTRC standard fields)
- **Submit to BTRC Portal** (API or simulation mode)
- ISP configuration (license number, API URL, retention)
- Submission history with batch IDs and audit trail

## BTRC Export Format

Each record includes:

| Field | Description |
|-------|-------------|
| ISP_LICENSE | Your BTRC ISP license number |
| ISP_NAME | Registered ISP name |
| LOG_DATETIME | Timestamp (Asia/Dhaka, ISO8601) |
| SUBSCRIBER_ID | PPPoE username |
| MAC_ADDRESS | CPE MAC address |
| PRIVATE_IP | Internal/user IP |
| PUBLIC_IP | NAT/public IP |
| PUBLIC_PORT | NAT port |
| DEST_IP | Visited destination IP |
| DEST_PORT | Destination port |
| PROTOCOL | TCP/UDP |
| SESSION_ID | Unique session reference |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/btrc/config` | Load ISP BTRC settings |
| PUT | `/api/btrc/config` | Save settings (operator+) |
| GET | `/api/btrc/export?format=csv&from=&to=` | Download BTRC file |
| POST | `/api/btrc/submit` | Submit batch to BTRC API |
| GET | `/api/btrc/status` | Compliance stats + history |

## Environment Variables

```env
BTRC_ISP_LICENSE=ISP-BD-CYBER-2024
BTRC_ISP_NAME=Cyber Link Communication
BTRC_API_URL=https://your-btrc-portal-endpoint/api/nat-logs
BTRC_API_KEY=your-api-key-from-btrc
BTRC_AUTO_SUBMIT=false
BTRC_RETENTION_DAYS=180
BTRC_CONTACT_EMAIL=admin@cyberlink.com
```

If `BTRC_API_URL` is empty, submissions run in **simulation mode** (validates format, saves audit log).

## Database Setup

New installs: included in `scripts/init-db.sql`

Existing database:

```bash
psql -U loguser -d isp_logserver -f scripts/btrc-migration.sql
```

Tables:
- `btrc_config` — ISP settings
- `btrc_submissions` — audit trail
- `nat_logs` — stored NAT sessions (populated from syslog in PHASE 4)

## Retention Policy

BTRC minimum: **180 days (6 months)**. Configure in dashboard or `BTRC_RETENTION_DAYS`.

## Manual Export (curl)

```bash
curl -b cookies.txt "http://localhost:3000/api/btrc/export?format=csv&from=2026-06-01&to=2026-06-07" -o btrc-logs.csv
```

## Submit (curl)

```bash
curl -X POST http://localhost:3000/api/btrc/submit \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"from":"2026-06-01","to":"2026-06-07","limit":500}'
```

## Next Steps (PHASE 4)

When MikroTik syslog ingestion is live, logs will auto-populate `nat_logs` and BTRC export will use real data instead of demo logs.
