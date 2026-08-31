# Good Rapido

Good Rapido is a full-stack capstone project for a transparent ride-booking platform. The product idea is simple: riders should understand why a fare changed, why a route was selected, why a driver was matched, and how trust or safety decisions are made.

Current status: demo-ready full-stack MVP. The backend modular foundation is strong, the rider, driver, and ops frontend apps are wired around the main booking lifecycle, and the core demo flow is verified from rider booking to driver completion through API smoke testing and a Playwright browser E2E smoke flow. Demo seed data is now deterministic for users, known locations, assigned ride requests, completed rides, payments, fraud/dispute examples, notifications, support tickets, and driver earnings visibility. Rider live ride status and driver GPS movement can auto-update through the ride lifecycle realtime stream with polling fallback. Rider pickup/dropoff search uses a backend location-search endpoint with optional Google Places autocomplete/details and polished local supported-location fallback when no API key is configured. Frontend auth uses session-scoped storage, proactive access-token refresh, retry-on-expired-token handling, stale token cleanup, and route guards across rider, driver, and ops apps. Real payment gateway code is ready with mock, Razorpay, and Stripe provider paths; live credentials and webhook deployment verification are still pending. Production integrations such as real Google Maps billing setup, dedicated WebSocket transport, and SMS/push/email providers are still pending.

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
- `support`

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

- Authentication/session structure with restore, refresh, stale-token cleanup, friendly expired-session/rate-limit messages, route guard notices, and logout.
- Booking home screen with address-only pickup/dropoff fields, hidden internal coordinates, professional fallback location suggestions, clean unknown-location validation, disabled estimate state until both locations are resolved, and backend-backed vehicle pricing comparison.
- Fare estimate screen with breakdown, confidence, surge transparency, and quote-derived fare context.
- Confirm ride flow using pricing, matching, and lifecycle concepts.
- Live ride status and driver GPS tracking stream with periodic refresh fallback.
- Ride history with auto-loaded receipt transparency and profile transparency screens.
- Safety and notification screens.
- Safety/help creates backend support tickets and shows support ticket history.
- Dispute center creates completed-ride disputes, adds evidence notes, tracks status, and can cancel open disputes.
- API-facing services for rider flows.

Driver app current state:

- React Vite TypeScript setup.
- App shell, routing, and feature folder structure.
- Real private driver authentication: register, login, session restore, refresh, logout, friendly auth errors, and protected routes.
- Driver onboarding, availability, ride requests, active ride lifecycle, earnings, trust, alerts, profile, and support flows.
- Active ride GPS watch publishes driver movement into the backend ride lifecycle tracking stream.
- Seeded driver accounts can receive real rider bookings in the request queue and complete the ride lifecycle.

Ops dashboard current state:

- React Vite TypeScript setup.
- Admin/ops private auth flow with protected routes, session restore, refresh, logout, and clean unauthorized-session messaging.
- Backend-aligned app shell and routing.
- Overview, ride operations, pricing/surge, trust-safety, fraud-disputes, communications, admin users, and analytics flows.
- API client methods for private admin, analytics, pricing, surge, fraud, admin auth, ops auth, and ride operations.
- Final admin-action QA for pricing rules, surge rules, fraud cases, disputes, notifications, and admin user permissions/status controls.

## Real Data Status

Real backend data is currently active for:

- Public and private auth APIs.
- Session refresh and logout APIs for rider, driver, admin, and ops sessions.
- MongoDB-backed rider, driver, admin, and ops users.
- Frontend auth UX now converts expired tokens, failed refreshes, unauthorized routes, stale saved sessions, logout completion, and backend rate-limit responses into clear user-facing messages.
- Public location search API with optional Google Places provider and local known-place fallback.
- Rider pricing comparison, fare estimate, driver search, booking creation, live status stream, current ride status, ride history, receipt transparency, and profile data in the verified demo flow.
- Public payments can create provider-backed UPI/card payment sessions, confirm success, mark failures, and process provider-aware refund requests.
- Driver login, request visibility, accept ride, arrived, start ride, complete ride, and earnings update in the verified demo flow.
- Driver active ride GPS updates are stored on the ride document and streamed back to the rider live tracking screen.
- Driver dashboard real-data summaries for earnings, trust, profile/document readiness, notifications, and assigned request status.
- Driver active ride state resolves backend assigned active rides first and only uses demo ride fallback when explicitly enabled.
- Driver notifications support private driver-scoped list/detail/mark-read access.
- Driver support creates private support tickets and shows driver-scoped ticket history.
- Ops private auth, ride queue visibility, dashboard data, pricing/surge, trust-safety, fraud-dispute, communications, admin users, and analytics module structure.
- Ops communications uses private support summary and ticket records, while fraud-disputes shows dispute evidence, refund, evidence-request, resolve, and reject states from backend records.
- Ops admin-action flows verified through frontend typecheck, shared API client typecheck, and focused backend route tests for pricing, surge, fraud, disputes, notifications, and admin users.
- Stable demo seed data for rider, driver, admin, ops, known locations, pending ride request, completed rides, payments, fraud/dispute cases, notifications, support tickets, and earnings-ready ride history.
- Backend API modules, Jest tests, API smoke demo, and Playwright browser E2E demo smoke flow.

Partially integrated or UI-first areas:

- Rider location search supports Google Places when `GOOGLE_MAPS_API_KEY` is configured. Without it, the app uses the MVP known-place resolver and clean unknown-location validation.
- Demo fallback cards only appear when explicit frontend demo flags are enabled.
- Real Google Maps billing/API activation, dedicated WebSocket transport, SMS/push/email delivery, production payment webhooks, and production deployment are pending.

## Location Search Plan

The rider sees pickup/dropoff address inputs and suggestions, while the frontend resolves selected places into coordinates internally before calling backend APIs.

Current behavior:

- Rider types in pickup/dropoff.
- Frontend calls `GET /api/v1/public/location-search/search`.
- Backend calls Google Places Autocomplete when `GOOGLE_MAPS_API_KEY` is configured.
- Backend resolves selected Google suggestions through Place Details to get latitude/longitude.
- Backend returns local known-place suggestions when Google is not configured or unavailable.
- Rider sees professional fallback copy such as "Local supported locations" instead of demo wording when Google is unavailable.
- Rider selects a human-readable suggestion with area/city context.
- Frontend stores the selected address plus internal latitude/longitude.
- Unknown typed locations show a clear "Please select a valid location" validation message.
- Fare estimate stays disabled until pickup and dropoff are resolved to valid internal coordinates.
- Backend contract stays unchanged because pricing, matching, route fairness, and ride lifecycle modules still need coordinates.

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

The seed is designed to be predictable on every run. It cleans previous demo operational records for seeded demo users, then creates:

```text
Known locations: Muri, Silli, Ranchi, Howrah Bridge, Park Street, Connaught Place, India Gate, Noida, Mumbai
Pending request: GR-DEMO-PENDING-MURI-SILLI, Muri -> Silli, assigned to Arjun Singh
Completed ride: GR-DEMO-COMPLETE-KOL-001, Howrah Bridge -> Park Street, assigned to Imran Ali
Dispute ride: GR-DEMO-DISPUTE-NCR-001, Connaught Place -> Noida, assigned to Rajesh Kumar
Operational examples: 2 payments, 1 dispute, 1 fraud case, 4 notifications, 1 support ticket
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
GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT=https://places.googleapis.com/v1/places:autocomplete
GOOGLE_PLACES_DETAILS_ENDPOINT=https://places.googleapis.com/v1/places
GOOGLE_MAPS_SEARCH_COUNTRY=IN
PAYMENT_GATEWAY_PROVIDER=mock
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_DEMO_RIDE_REQUESTS=false
VITE_USE_DEMO_DRIVER_DATA=false
VITE_GOOGLE_MAPS_API_KEY=
```

Only set `VITE_USE_DEMO_RIDE_REQUESTS=true` or `VITE_USE_DEMO_DRIVER_DATA=true` when you intentionally want screenshot/demo fallback cards. Normal testing should keep both disabled so rider, driver, and ops screens use backend data or honest empty states.

## Deployment Readiness

- Use `server/.env.example` for backend variables and each frontend app `.env.example` for build-time frontend variables.
- MongoDB must be running before API start, seeding, or smoke tests.
- Production `CORS_ORIGIN` must include every deployed frontend URL.
- Keep payment provider as `mock` until Razorpay or Stripe credentials are ready.
- Google Places works only when backend `GOOGLE_MAPS_API_KEY` is configured; otherwise the known-place fallback is used.
- Driver Google Maps screens need `VITE_GOOGLE_MAPS_API_KEY` at frontend build time.
- Full deploy steps are documented in `DEPLOYMENT_GUIDE.md`.

## Verification

Backend tests:

```bash
npm --prefix server test
```

Full demo smoke flow:

```bash
npm --prefix server run smoke:demo
```

Browser E2E demo smoke flow:

```bash
npm --prefix frontend exec -- playwright install chromium
npm --prefix frontend run e2e:demo
```

Headed browser mode:

```bash
npm --prefix frontend run e2e:demo:headed
```

The Playwright smoke flow reseeds demo data, builds the frontend apps, starts isolated local preview servers, and verifies the complete browser journey:

```text
API: http://127.0.0.1:3100
Rider: http://127.0.0.1:5273
Driver: http://127.0.0.1:5274
Ops: http://127.0.0.1:5275
MongoDB: mongodb://127.0.0.1:27017/rapido
```

It checks rider login/register UI, pickup/dropoff suggestion selection, fare estimate, booking confirmation, driver request acceptance, arrived/start/complete lifecycle actions, rider live status update, rider history, driver earnings, and ops completed ride visibility.

To point the browser smoke flow at another test database, set `GOOD_RAPIDO_E2E_MONGO_URL`.

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

- Polish remaining provider-backed preview cards with live data where needed.
- Expand browser E2E coverage beyond the main demo smoke path, including edge cases and responsive checks.
- Add production-grade maps, WebSocket live tracking, production payment webhooks, and notification provider.
- Move production auth from session-scoped browser storage to secure httpOnly cookie sessions when deployed publicly.
- Improve README screenshots and deployment notes after provider integrations are stable.
