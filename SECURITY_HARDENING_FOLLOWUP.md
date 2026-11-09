# Security hardening follow-up

**Review date:** 2026-11-09  
**Repository:** Home Service Booking System  
**Status:** CODE REMEDIATION COMPLETE FOR LISTED IMPLEMENTED ITEMS; PRODUCTION VERIFICATION REMAINS PARTIAL

This follow-up records code changes and verification performed against the current repository. It supersedes older audit status statements only for the findings listed below. No production database, seed, migration, or deployment environment was accessed.

## Remediation matrix

| ID | Result | Implementation and evidence | Remaining limitation |
|---|---|---|---|
| AF-03 | Implemented | Password-change attempts are limited to five per 15 minutes per authenticated user and trusted client IP. Validation runs before the limiter; successful changes do not consume the failure budget. `change-password.rate-limit.test.js` covers lockout, user/IP separation, reset, malformed input, unauthenticated calls, and unrelated APIs. | The configured express-rate-limit MemoryStore is per process. Multi-instance deployments need a shared store to prevent cross-instance bypass. IP identity depends on the verified `TRUST_PROXY` topology. |
| AF-04 | Implemented; UI test coverage limited | Web and Mobile profile screens now have current/new/confirmation fields, visibility controls, password-policy checks, loading/errors, and submit disabling. Successful changes clear local fields, remove the old session, and send the user to login. Backend `tokenVersion` revocation is covered by `auth.token-revocation.test.js`. | The repository has no React component test harness; UI behavior was typechecked but not exercised in a device/browser test. |
| AF-05 | Implemented; notification gap remains | Phone changes through `PATCH /api/auth/me` require the current password, use `isVietnamesePhone`, check uniqueness, and translate duplicate phone index errors to 409. An unchanged phone does not require password re-entry. `auth.phone-change.test.js` covers authentication, invalid password/phone, duplicates, and successful change. | There is no dedicated phone-change security email/SMS notification flow, so no alert is sent. |
| AF-06 | Implemented | Admin email changes are normalized before comparison, set `emailVerified=false`, increment `tokenVersion`, block clients from setting `emailVerified`/`tokenVersion`, and emit an audit event. When email delivery is configured, a verification code is sent to the new address using the existing flow. `admin.user.email-change.test.js` checks changed/unchanged values, verification controls, and old-token rejection. | SMTP delivery was not exercised against an external service. |
| NOSQL-01 | Implemented | `rejectUnsafeMongoKeys` checks body, query, and params without mutating them; rejects `$` and dotted keys, nested objects/arrays, and excessive depth/size with HTTP 400. `request-safety.middleware.test.js` covers JSON, query, form, nested, and valid requests. | The limit is an application-level guard; payload parsers still enforce their own byte limits. |
| NOSQL-02 | Implemented | URL-encoded parsing uses `extended:false` and a 1000-parameter cap. Existing web/mobile APIs use JSON or multipart bodies; repository search found no consumer requiring nested URL-encoded objects. Form-encoded operator input is rejected by the global guard. | None identified in current clients. |
| NOSQL-03 | Implemented | `validateSelectProvider` validates request/provider IDs, optional date input, and the request body whitelist before the controller. `booking.validation.test.js` covers malformed IDs, object input, extra fields, and valid input. |
| V-02 | Implemented | Removed client-side fixed demo passwords, quick-login buttons, and auto-login/auto-register paths. Legacy seed scripts now require `SEED_PASSWORD` and, where applicable, `SEED_ADMIN_PASSWORD`, reject production, and never print password values. | Demo seed flows were not run because they require a database. Existing demo account email identifiers remain as seed data, not credentials. |
| V-11 / V-21 | Partially addressed | Existing backend `tokenVersion` checks and revocation on logout/password reset/change remain active; the added admin email update now revokes old tokens. Web demo role switching and demo-email autofill were removed; API routes continue to enforce backend RBAC. | The larger refresh-token rotation, short access-token TTL, HttpOnly cookie/CSRF flow, Next.js server guard, and mandatory Mobile SecureStore-only storage are not implemented. Current clients still use existing token storage. |
| V-19 | Open | `npm audit` ran for backend, web, and mobile on 2026-11-09. Backend reported 2 moderate findings through nodemon/minimatch (development dependencies); Web reported 6 low/moderate findings in shadcn/ts-morph/minimatch (development toolchain); Mobile reported 4 moderate findings through Expo fingerprint/glob/minimatch. | No dependency changes were made: Web's suggested shadcn fix is major; Mobile's suggested Expo fix downgrades Expo 57 to 53. A non-breaking backend fix was not confirmed from the lockfile dry run. All three audits exited 1 with reported findings. |
| V-26 | Partially addressed | Existing structured audit logger masks email/phone and removes sensitive keys. Authentication success/failure, password change, phone change, admin email change, and existing payment/admin/provider events can now be traced without logging credentials. | Logs go to process stdout; centralized retention, alerting, Sentry/APM, configured production backup, and a restore drill were not verifiable here. |
| V-30 | Implemented for project entry docs | Root README setup, commands, environment-variable names, current test totals, security follow-up, and available security documents are being aligned. `.gitignore` continues to ignore general Markdown/docs and allows only this follow-up document. |

## Verification record

### Baseline before changes

| Module | Command | Result |
|---|---|---|
| Backend | `npm.cmd test` | Exit 0; 350 passed, 0 failed, 0 skipped; 47 test files. One provider-profile case logged a Mongoose buffering timeout while the test itself passed. |
| Web | `npm.cmd run typecheck` | Exit 0. |
| Mobile | `npm.cmd test` | Exit 0; 19 passed, 0 failed. |
| Mobile | `npm.cmd run typecheck` | Exit 0. |

### Dependency audit

| Package | Command | Result |
|---|---|---|
| Backend | `npm.cmd audit --json` | Exit 1; 2 moderate, development dependency findings. |
| Web | `npm.cmd audit --json` | Exit 1; 2 low and 4 moderate, development toolchain findings. |
| Mobile | `npm.cmd audit --json` | Exit 1; 4 moderate findings, including Expo's dependency chain. |

### Final regression verification

| Module | Command | Result |
|---|---|---|
| Backend | `npm.cmd test` | Exit 0; 358 passed, 0 failed, 0 skipped across 51 test files. One existing provider-profile test logged a Mongoose buffering timeout and returned an expected test pass; MongoDB Memory Server integration cases passed. |
| Web | `npm.cmd run typecheck` | Exit 0. |
| Mobile | `npm.cmd test` | Exit 0; 19 passed, 0 failed. |
| Mobile | `npm.cmd run typecheck` | Exit 0. |

All verification ran in the local development environment. The earlier dependency audit results remain unresolved as detailed above; production deployment, external SMTP delivery, backup configuration, and restore were not verified.

## Overall assessment

The authentication, profile, and request-input controls in this follow-up are stronger and have regression tests. The system is **not fully verified for production security**: refresh-token architecture, shared rate-limit storage, external monitoring, production backup/restore, and compatible dependency upgrades remain open. Deployment configuration and third-party email delivery were not exercised.
