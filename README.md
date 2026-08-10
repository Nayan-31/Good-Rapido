# Good Rapido

Good Rapido is a full-stack capstone project for a transparent ride-booking platform. The product idea is simple: riders should understand why a fare changed, why a route was selected, why a driver was matched, and how trust or safety decisions are made.

Current status: demo-ready full-stack MVP. The backend modular foundation is strong, the rider, driver, and ops frontend apps are wired around the main booking lifecycle, and the core demo flow is verified from rider booking to driver completion. Rider live ride status and driver GPS movement can auto-update through the ride lifecycle realtime stream with polling fallback. Frontend auth now uses session-scoped storage, proactive access-token refresh, retry-on-expired-token handling, stale token cleanup, and route guards across rider, driver, and ops apps. Real payment gateway code is ready with mock, Razorpay, and Stripe provider paths; live credentials and webhook deployment verification are still pending. Ops final admin-action QA is verified for pricing, surge, fraud, disputes, notifications, and admin users. Production integrations such as real map provider, dedicated WebSocket transport, and SMS/push/email providers are still pending.

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Zod, Jest
- Frontend: React, Vite, TypeScript, CSS Modules
- Frontend workspace: rider app, driver app, ops dashboard, shared UI package, shared API client
- Architecture: modular monolith with public, private, and core module layers

## What The Project Solves

- Transparent fare estimate with base, distance, time, surge, tax, and confidence signals.
- Driver trust visibility through cancellation risk, route fairness, reliability, and profile readiness.
- Route fairness checks through expected route vs actual route comparison.
- Fraud and abuse detection for suspicious rides, payment issues, fake trips, and promo misuse.
- Safety, notification, dispute, payment, and support workflows around the ride lifecycle.

## Current Implementation

### Backend

The backend lives in `server/` and is organized by access layer.

```text
server/src/modules/
+-- public/
+-- private/
+-- core/
```

Implemented public modules:

- `auth`
- `profile`
- `fare`
- `ride-booking`
- `rides`
- `drivers`
- `payments`
- `promos`
- `ratings`
- `disputes`
- `notifications`
- `support`

Implemented private modules:

- `auth`
- `admin`
- `analytics`
- `driver`
- `driver-availability`
- `driver-documents`
- `vehicle`
- `ride-ops`
- `pricing`
- `surge`
- `trust`
- `fraud`
- `earnings`
- `disputes`
- `notifications`

Implemented core modules:

- `identity`
- `ride-lifecycle`
- `pricing-engine`
- `matching-engine`
- `route-engine`
- `trust-engine`
- `fraud-engine`
- `payment-engine`
- `notification-engine`

### Frontend

The frontend lives in `frontend/` and uses npm workspaces.

```text
frontend/
+-- apps/
|   +-- rider-app/
|   +-- driver-app/
|   +-- ops-dashboard/
+-- packages/
    +-- api-client/
    +-- ui/
```

Rider app current state:

- Authentication/session structure with restore, refresh, stale-token cleanup, and logout.
- Booking home screen with backend-backed vehicle pricing comparison.
- Fare estimate screen with breakdown, confidence, surge transparency, and quote-derived fare context.
- Confirm ride flow using pricing, matching, and lifecycle concepts.
- Live ride status and driver GPS tracking stream with periodic refresh fallback.
- Ride history with auto-loaded receipt transparency and profile transparency screens.
- Safety and notification screens.
- API-facing services for rider flows.

Driver app current state:

- React Vite TypeScript setup.
- App shell, routing, and feature folder structure.
- Real private driver authentication: register, login, session restore, refresh, logout, and protected routes.
- Driver onboarding, availability, ride requests, active ride lifecycle, earnings, trust, alerts, profile, and support flows.
- Active ride GPS watch publishes driver movement into the backend ride lifecycle tracking stream.
- Seeded driver accounts can receive real rider bookings in the request queue and complete the ride lifecycle.

Ops dashboard current state:

- React Vite TypeScript setup.
- Admin/ops private auth flow with protected routes, session restore, refresh, and logout.
- Backend-aligned app shell and routing.
- Overview, ride operations, pricing/surge, trust-safety, fraud-disputes, communications, admin users, and analytics flows.
- API client methods for private admin, analytics, pricing, surge, fraud, admin auth, ops auth, and ride operations.
- Final admin-action QA for pricing rules, surge rules, fraud cases, disputes, notifications, and admin user permissions/status controls.

## Real Data Status

Real backend data is currently active for:

- Public and private auth APIs.
- Session refresh and logout APIs for rider, driver, admin, and ops sessions.
- MongoDB-backed rider, driver, admin, and ops users.
- Rider pricing comparison, fare estimate, driver search, booking creation, live status stream, current ride status, ride history, receipt transparency, and profile data in the verified demo flow.
- Public payments can create provider-backed UPI/card payment sessions, confirm success, mark failures, and process provider-aware refund requests.
- Driver login, request visibility, accept ride, arrived, start ride, complete ride, and earnings update in the verified demo flow.
- Driver active ride GPS updates are stored on the ride document and streamed back to the rider live tracking screen.
- Driver dashboard real-data summaries for earnings, trust, profile/document readiness, notifications, and assigned request status.
- Driver active ride state resolves backend assigned active rides first and only uses demo ride fallback when explicitly enabled.
- Driver notifications support private driver-scoped list/detail/mark-read access.
- Ops private auth, ride queue visibility, dashboard data, pricing/surge, trust-safety, fraud-dispute, communications, admin users, and analytics module structure.
- Ops admin-action flows verified through frontend typecheck, shared API client typecheck, and focused backend route tests for pricing, surge, fraud, disputes, notifications, and admin users.
- Backend API modules, Jest tests, and full smoke demo.

Partially integrated or UI-first areas:

- Support and provider-backed secondary cards still have a few UI-first placeholders until live support/provider records exist.
- Real map provider, dedicated WebSocket transport, SMS/push/email delivery, production payment webhooks, and production deployment are pending.

## Local Setup

Install backend dependencies:

```bash
cd server
npm install
```

Start MongoDB locally, or use the provided compose file:

```bash
docker compose up -d mongodb
```

Start backend:

```bash
npm run dev
```

Seed local demo data:

```bash
npm run seed:demo
```

Default local credentials:

```text
Rider: rider@goodrapido.test / Password@123
Admin: admin@goodrapido.test / Password@123
Ops: ops@goodrapido.test / Password@123

Drivers:
arjun.singh.driver@goodrapido.test / Password@123
sahil.khan.driver@goodrapido.test / Password@123
imran.ali.driver@goodrapido.test / Password@123
rajesh.kumar.driver@goodrapido.test / Password@123
neha.das.driver@goodrapido.test / Password@123
amit.das.driver@goodrapido.test / Password@123
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Run rider app:

```bash
npm run dev:rider
```

Run driver app:

```bash
npm run dev:driver
```

Run ops dashboard:

```bash
npm run dev:ops
```

Useful environment variables:

```text
PORT=3000
MONGO_URL=mongodb://localhost:27017/rapido
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5176
ACCESS_SECRET_TOKEN=local-access-secret-change-me
REFRESH_SECRET_TOKEN=local-refresh-secret-change-me
VITE_API_BASE_URL=http://localhost:3000
```

## Verification

Backend tests:

```bash
npm --prefix server test
```

Full demo smoke flow:

```bash
npm --prefix server run smoke:demo
```

Frontend checks:

```bash
npm --prefix frontend run typecheck:rider
npm --prefix frontend run typecheck:driver
npm --prefix frontend run typecheck:ops
npm --prefix frontend run typecheck:api-client
npm --prefix frontend run build:rider
npm --prefix frontend run build:driver
npm --prefix frontend run build:ops
```

## Wrap-Up Docs

- `FINAL_PROJECT_OVERVIEW.md` explains the project, architecture, flows, and why each major part exists.
- `DEMO_SCRIPT.md` gives a step-by-step demo and interview explanation script.
- `DEPLOYMENT_GUIDE.md` explains env setup, build outputs, Docker backend, and deploy order.

## Standard Backend Module Shape

```text
module/
+-- dto/
+-- interfaces/
+-- validators/
+-- module.constants.js
+-- module.controller.js
+-- module.dao.js
+-- module.model.js
+-- module.route.js
+-- module.service.js
+-- module.route.test.js
```

Standard request flow:

```text
route -> validator/middleware -> controller -> service -> dao -> model
```

## Next Work

- Polish remaining fallback/sample cards with live data where needed.
- Add live support records behind remaining driver support preview cards.
- Add deeper browser E2E tests for rider, driver, and ops auth flows.
- Add production-grade maps, live tracking, production payment webhooks, and notification provider.
- Move production auth from session-scoped browser storage to secure httpOnly cookie sessions when deployed publicly.
- Improve README screenshots and deployment notes after provider integrations are stable.
