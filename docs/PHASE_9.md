# PHASE 9 — Marketing Landing + Multi-Portal System

## Public vs private entry points

The **marketing site (`/`)** is fully public and has **no login links**. Sales CTAs use email only.

| Entry | URL | Notes |
|-------|-----|-------|
| Marketing | `/` | Public — features, pricing, contact only |
| Super Admin login | `/admin/login` | Direct URL only (bookmark / internal) |
| Super Admin app | `/admin/*` | Protected |
| Operator login | `/auth/login` | Direct URL only |
| Operator app | `/operator/*` | Protected |

Admin and operator portals are **completely separate** from the marketing website.

## Route architecture

| URL | Purpose | Auth |
|-----|---------|------|
| `/` | Marketing landing (public) | None |
| `/admin/login` | Super Admin login | Public |
| `/admin` | Super Admin dashboard | `super_admin` |
| `/admin/tenants` | Tenant management | `super_admin` |
| `/admin/metrics` | Analytics chart config | `super_admin` |
| `/admin/billing` | Plans overview | `super_admin` |
| `/admin/settings` | Platform settings | `super_admin` |
| `/auth/login` | Operator login | Public |
| `/operator` | Operator portal home | Authenticated |
| `/operator/logs` | Log stream | Authenticated |
| `/operator/users` | User manager | Authenticated |
| `/operator/reports` | Analytics | Authenticated |
| `/dashboard` | Full legacy console | Authenticated |

## Libraries

- `framer-motion` — hero, cards, portal transitions
- `embla-carousel-react` + `embla-carousel-autoplay` — testimonials
- `aos` — scroll reveal on landing sections

## Design system (CSS variables)

- `--brand-primary` #1A3C5E
- `--brand-accent` #0EA5E9
- `--brand-success` #10B981

## Verify

```bash
npm run verify:phase9
```

## Deploy notes

Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production domain so marketing + portal links resolve correctly.
