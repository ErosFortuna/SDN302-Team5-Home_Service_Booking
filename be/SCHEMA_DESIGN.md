# MongoDB Schema Design

## Core business rules

1. Only `CUSTOMER` can create a service request.
2. Only an active and verified `PROVIDER` can submit a quote.
3. A provider can submit at most one quote per request (`request + provider` unique index).
4. A request can have at most one booking (`request` unique index).
5. A quote can belong to at most one booking (`quote` unique index).
6. Only the request owner can accept a quote.
7. Accepting a quote must be done in a transaction and must atomically reject other pending quotes.
8. Provider booking overlaps must be checked with interval logic: `existing.start < new.end && existing.end > new.start`.
9. Booking status transitions must be whitelisted; clients must not set arbitrary status values.
10. Only completed bookings can receive a review; one review per booking is enforced by a unique index.
11. Only participants in a booking may create a complaint; staff/admin can resolve it.
12. Provider rating and counters should be updated transactionally or with an idempotent aggregation job.

## Important implementation note

Mongoose validators do not protect against race conditions between concurrent requests. Use MongoDB transactions for quote acceptance, booking creation, and review/counter updates. Use a transaction with a query that re-checks provider availability before inserting a booking.
