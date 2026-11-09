# Home Service Booking System

A home-service booking platform with three standalone applications:

- `be/`: Express 5 REST API and MongoDB.
- `fe/web/`: Next.js customer, provider, staff, and admin web app.
- `fe/mobile/`: Expo / React Native customer and provider app.

Each application has its own dependencies and lockfile. There is no root npm workspace.

## Requirements

- Node.js 22 or newer is recommended. Mobile requires Node.js 22.6 or newer.
- MongoDB is required to run the backend and seed data.
- Install dependencies separately in each application folder.

## Local setup

### Backend

```powershell
cd be
npm install
Copy-Item .env.example .env
npm run dev
```

Set `MONGO_URI` and `JWT_SECRET` in `be/.env`. To load local demo records, configure `SEED_PASSWORD` and `SEED_ADMIN_PASSWORD`, then run `npm run seed` against a development database only. Demo seed scripts refuse production mode. Seed passwords must be at least 10 characters and no more than 72 UTF-8 bytes; their values are not printed.

The API listens on `http://localhost:5000` by default. Set `PORT` to change it and `CLIENT_URL` to configure allowed web origins. Optional integrations use `GOOGLE_CLIENT_IDS`, `SMTP_*`, `CLOUDINARY_*`, and `PAYOS_*` variables. Configure `TRUST_PROXY` only for the actual reverse-proxy topology.

### Web

```powershell
cd fe/web
npm install
npm run dev
```

The web app listens on `http://localhost:3000`. Set `BACKEND_URL` for the Next.js API rewrite. Other supported public settings include `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL`, and `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Never place credentials or tokens in `NEXT_PUBLIC_*` values.

### Mobile

```powershell
cd fe/mobile
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` for a deployed build. Production builds require a public HTTPS URL; development can use the documented local emulator defaults. Google sign-in uses the `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` variables.

## Verification commands

Run commands from the corresponding application folder:

```powershell
# Backend
npm test

# Web
npm run typecheck
npm run build

# Mobile
npm test
npm run typecheck
```

The current backend suite contains **358 passing tests across 51 files**. Mobile has 19 tests in its API URL validation suite. The web app has a TypeScript check and build, but no configured component-test runner. Security verification details and open items are recorded in [SECURITY_HARDENING_FOLLOWUP.md](SECURITY_HARDENING_FOLLOWUP.md).

Run `npm audit` separately in `be/`, `fe/web/`, and `fe/mobile/`. The 2026-11-09 audit results and unresolved dependency findings are recorded in the security follow-up.

## Security and project documentation

- [Security hardening follow-up](SECURITY_HARDENING_FOLLOWUP.md) — changes, test evidence, and remaining risks.
- `SECURITY_AUDIT.md`, `SECURITY_AUDIT_AUTH_FLOWS.md`, and `SECURITY_AUDIT_NOSQL.md` are local audit source documents currently excluded by the repository's Markdown ignore rule; the follow-up records the findings rechecked against current code.
- `be/.env.example` lists backend variable names. Do not commit `.env`, `.env.local`, credentials, or production data.

Important data-safety rules: do not run seed or apply a migration against production or an unconfirmed database. Migration scripts default to dry-run; use `--apply` only after confirming the target is a development database.
