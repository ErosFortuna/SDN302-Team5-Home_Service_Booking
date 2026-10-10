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

## Endpoints

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

Never commit `.env`. Change the seed admin password before using a real environment.
