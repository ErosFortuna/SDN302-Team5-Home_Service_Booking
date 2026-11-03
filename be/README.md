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
- POST `/api/auth/login`
- GET `/api/auth/me` with `Authorization: Bearer <token>`

Never commit `.env`. Change the seed admin password before using a real environment.
