# Home Service Booking Backend

Express + MongoDB Atlas + Mongoose.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Seed

```bash
npm run seed
```

`npm run seed` loads the complete, idempotent demo dataset from `src/seed/full.seed.js` (accounts, services, bookings, membership, notifications, and reports). `npm run seed:full` is an alias for the same dataset. Do not run these commands against a production database.

## Endpoints

- `GET /api/bookings/customer/me` returns the authenticated customer's bookings and progress history.
- `PATCH /api/bookings/:id/status` accepts an optional non-negative integer `finalPrice` only when the provider marks the booking `COMPLETED`. The amount is recorded only when the parties have agreed on it; otherwise omit it.
- `PATCH /api/bookings/:id/reschedule` accepts `{ "scheduledStartAt": "<ISO date>", "note": "<optional reason>" }`; customers may reschedule confirmed bookings before their start time.
- `POST /api/bookings/:id/cancel` accepts `{ "reason": "<reason>" }`; customers may cancel confirmed bookings before their start time.
- GET `/`
- GET `/api/health`
- POST `/api/auth/register`
- POST `/api/auth/verify-email`
- POST `/api/auth/resend-verification`
- POST `/api/auth/login`
- POST `/api/auth/google`
- GET `/api/auth/me` with `Authorization: Bearer <token>`

### Auth configuration

Copy `.env.example` to `.env`, then set `GOOGLE_CLIENT_IDS` to the comma-separated Android, iOS and Web OAuth client IDs from Google Cloud Console. Set `SMTP_USER` to the Gmail sender and `SMTP_PASSWORD` to a Google App Password (not the normal Gmail password); set `SMTP_FROM` to the sender address. Never commit `.env` or share these credentials in chat.

Email/password registration responds with `202` and sends a six-digit code that expires after 15 minutes. `/api/auth/verify-email` activates the user and returns the access token. Google sign-in accepts a Google ID token and only trusts tokens with a verified email.

Google-only accounts can omit phone. Existing databases may have a non-sparse unique `phone_1` index; before deploying this schema change, drop that old index once so Mongoose can create the new partial unique index: `db.users.dropIndex("phone_1")`. Back up the database before applying the index migration.

### Database Index Migration & Concurrency (V-12)

Booking creation and rescheduling enforce concurrency protection via MongoDB multi-document transactions and a partial unique index on `(provider, scheduledStartAt)` for active bookings (`PENDING_CONFIRMATION`, `CONFIRMED`, `PROVIDER_ON_THE_WAY`, `ARRIVED`, `IN_PROGRESS`, `AWAITING_APPROVAL`).

1. **Transaction policy**:
   - In production (`NODE_ENV=production`), multi-document transactions are strictly required for bookings and reviews (V-12, V-27). If unavailable, requests fail-fast with HTTP 503 (no silent non-transactional writes).
   - In local development, you have two options:
     - **Option A (Recommended - 1-node replica set)**:
       - Via Docker:
         ```bash
         docker run -d --name mongo-rs -p 27017:27017 mongo:7 mongod --replSet rs0 --bind_ip_all
         docker exec -it mongo-rs mongosh --eval "rs.initiate()"
         ```
       - Via local mongod:
         ```bash
         mongod --replSet rs0 --dbpath <data_directory>
         mongosh --eval "rs.initiate()"
         ```
       - Connect string in `be/.env`: `MONGO_URI=mongodb://localhost:27017/homecare?replicaSet=rs0`
     - **Option B (Standalone dev fallback without replica set)**: Set `ALLOW_NO_TRANSACTION=true` in `be/.env` to allow fallback with a warning log. Do not use this mode in production!
2. **Checking duplicates before applying index**:
   - Run dry-run scan: `node be/scripts/check-booking-duplicates.js`
   - If duplicates exist, resolve or cancel them (`status: "CANCELLED"`) before creating the index. Note: only statuses defined in `booking.status.js` (`CANCELLED`, `COMPLETED`, `NO_SHOW`) exist in the schema; `DECLINED` and `EXPIRED` are decline reasons (`reasonCode`), not standalone booking statuses.
3. **Applying partial unique index on MongoDB**:
   - Preview mode: `node be/scripts/migrate-create-booking-indexes.js`
   - Apply index: `node be/scripts/migrate-create-booking-indexes.js --apply`
   - When run with `--apply`, the script automatically checks for active duplicates first; if any duplicate is found, it prints the list of duplicate records and exits with error code 1 without creating the index.

### CORS & Allowed Origins Configuration (V-15)

The backend enforces strict cross-origin security rules with no wildcard `*` fallback:
1. **Production & Staging**:
   - `CLIENT_URL` is mandatory. The application fails-fast on startup with a descriptive error if `CLIENT_URL` is missing or empty.
   - Wildcard `*` is strictly forbidden in production and staging (`NODE_ENV !== 'development'`); startup is rejected if `*` is supplied.
   - Staging environments must explicitly configure all allowed client domains in `CLIENT_URL` (e.g. `CLIENT_URL=https://staging.myhomecare.com,https://admin-staging.myhomecare.com`).
2. **Local Development**:
   - `NODE_ENV=development` automatically permits `localhost` and `127.0.0.1` on any port (Next.js web on `3000`, etc.).
   - If testing **Expo mobile web** (`fe/mobile` running with Metro on port `8081` or `19006`), add its origin to `CLIENT_URL` (e.g. `CLIENT_URL=http://localhost:3000,http://localhost:8081`).
   - If wildcard `*` is explicitly set in development, a security warning is logged once to `console.warn` at startup.
3. **Origin Normalization**:
   - All origins in `CLIENT_URL` and incoming `Origin` headers are automatically trimmed, lowercased, and have trailing slashes/default ports stripped before evaluation.

Never commit `.env`. Change the seed admin password before using a real environment.

### Testing & mongodb-memory-server (V-24)

Backend tests are executed via Node.js built-in test runner:
```bash
cd be
npm test
```

- `mongodb-memory-server` is configured in `devDependencies` for fast, isolated in-memory MongoDB integration testing (such as `$geoWithin`, geospatial compound indexes, and pagination consistency).
- **Network requirement on first run**: On the very first execution, `mongodb-memory-server` requires network connectivity to download the matching MongoDB precompiled binary for the operating system (downloaded and cached locally under `%USERPROFILE%/.cache/mongodb-binaries` on Windows or `~/.cache/mongodb-binaries` on Linux/macOS). Subsequent test runs execute entirely offline from cache.

### Index Synchronization (V-24)

To verify or synchronize compound and geospatial indexes across all MongoDB collections (including unique index on `reviews.booking`):
```bash
# Dry-run check of current indexes vs schema definitions:
npm run indexes:sync

# Apply index changes to database:
npm run indexes:sync -- --apply
```

### Provider Rating Synchronization (V-27)

Recalculates and synchronizes `averageRating` and `reviewCount` on `ProviderProfile` documents from visible `Review` documents:
```bash
# Dry-run preview:
npm run ratings:sync

# Apply recalculated ratings to database:
npm run ratings:sync -- --apply
```

### Provider Profile Backfill (V-24)

Synchronizes `userStatus` and `fullName` from the `User` collection onto `ProviderProfile` documents (required for fast single-collection searches without cross-collection lookups). Safe by default (dry-run preview):
```bash
# Dry-run preview (checks profiles, counts mismatches, no DB writes):
node scripts/backfill-provider-profile.js
# Or using npm script:
npm run profile:backfill

# Apply synchronization changes to database:
node scripts/backfill-provider-profile.js --apply
# Or using npm script:
npm run profile:backfill -- --apply
```

- **Idempotent**: Re-running the script against an already synchronized database results in 0 updates.
- **Batch processing**: Processes documents in batches (default: 100) using indexed `_id` cursor pagination.
- **PII safe**: Does not print user emails, phone numbers, or addresses to terminal logs.
- **Missing user handling**: Orphan profiles without a corresponding User document are safely skipped.
