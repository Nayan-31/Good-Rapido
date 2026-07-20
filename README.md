# Good Rapido

Good Rapido is a full-stack capstone project for a transparent ride-booking platform. The product idea is simple: riders should understand why a fare changed, why a route was selected, why a driver was matched, and how trust or safety decisions are made.

Current status: in progress. The backend modular foundation is strong, the rider frontend has MVP flows and screen-level services, and the driver frontend has a real authentication flow connected to MongoDB. Some frontend screens still use hardcoded UI values while their backend integration is being completed.

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

- Authentication/session structure.
- Booking home screen.
- Fare estimate screen with breakdown, confidence, and surge transparency.
- Confirm ride flow using pricing, matching, and lifecycle concepts.
- Ride history and profile transparency screens.
- Safety and notification screens.
- API-facing services for rider flows.

Driver app current state:

- React Vite TypeScript setup.
- App shell, routing, and feature folder structure.
- Real private driver authentication: register, login, token storage, session restore, and logout.
- Availability, ride request, active ride, earnings, trust, alerts, profile, onboarding, and support screens are currently UI-first with hardcoded values.

Ops dashboard current state:

- React Vite TypeScript setup.
- Admin/ops private auth shell with token storage structure.
- Backend-aligned app shell and routing.
- Skeleton screens for overview, ride operations, pricing/surge, trust-safety, fraud-disputes, communications, admin users, and analytics.
- API client methods for private admin, analytics, pricing, surge, fraud, admin auth, and ops auth.

## Real Data Status

Real backend data is currently active for:

- Public and private auth APIs.
- Driver register/login/session restore/logout.
- MongoDB-backed driver auth users.
- Backend API modules and tests.
- Ops dashboard private auth endpoints are wired, but admin/ops users must exist in MongoDB before login can succeed.

Partially integrated or UI-first areas:

- Rider screens have services and API clients, but some dashboard values still need final backend binding and end-to-end data polishing.
- Driver availability, ride requests, active ride, earnings, trust, profile, notifications, and support still need full real backend wiring.
- Payment gateway, live maps, WebSocket tracking, push notifications, and production deployment are pending.

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

- Complete real backend binding for driver availability.
- Connect driver ride request and active ride lifecycle flows.
- Connect driver earnings, trust, notifications, and profile screens.
- Complete ops dashboard real backend binding for admin, analytics, ride ops, pricing, surge, fraud, trust, disputes, and notifications.
- Polish rider end-to-end booking flow with real persisted rides.
- Add production-grade maps, live tracking, payment provider, and notification provider.
- Improve README screenshots and deployment notes after the MVP is stable.
