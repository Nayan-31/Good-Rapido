# Good Rapido Frontend

This workspace contains the frontend apps and shared frontend packages for Good Rapido.

Current status: demo-ready frontend MVP. Rider, driver, and ops apps are wired around the main booking lifecycle. The verified demo flow covers rider booking, backend location search with Google Places/local fallback, driver request handling, live driver GPS tracking, payment API wiring, ride completion, driver earnings, and ops visibility. Some secondary cards still use planned/sample fallback values when no live records exist.

## Workspace Structure

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

## Apps

### Rider App

Location:

```text
frontend/apps/rider-app
```

Current coverage:

- Auth/session structure with restore, proactive refresh, retry-on-expired-token handling, and logout cleanup.
- Booking home with address-only pickup/dropoff fields, hidden internal coordinates, backend location suggestions, and pricing comparison backed vehicle cards.
- Fare estimate with breakdown, confidence, surge transparency, and quote-derived fare context.
- Confirm ride flow.
- Live ride status stream with periodic refresh fallback.
- Live GPS tracking panel that moves the driver marker from backend `tracking.lastDriverLocation` updates.
- Payment API client methods for provider payment success, failure, refunds, history, and detail flows.
- Safety center with backend support ticket creation and ticket history.
- Rider dispute center with backend dispute history, evidence notes, status tracking, and cancellation.
- Notifications.
- Ride history with auto-loaded receipt transparency.
- Profile dashboard with authenticated rider and recent ride fallbacks.

Location search:

- Pickup/dropoff suggestions call the backend `public/location-search` API.
- Backend uses Google Places when `GOOGLE_MAPS_API_KEY` is configured.
- Backend returns local known-place suggestions when Google is not configured or unavailable.
- The rider types an address, picks a suggestion, and never sees raw coordinates.
- The frontend stores the selected place latitude/longitude internally before calling pricing, matching, booking, and route APIs.

### Driver App

Location:

```text
frontend/apps/driver-app
```

Current coverage:

- App shell and route flow.
- Driver login/register.
- Session-storage based auth session.
- Session restore, proactive token refresh, retry-on-expired-token handling, and logout cleanup.
- Protected route guard based on auth state.
- Onboarding, availability, ride requests, active ride, earnings, trust, alerts, profile, and backend-backed support flows.
- Real rider-to-driver booking handoff in the seeded demo flow.
- Active ride lifecycle actions for accept, arrived, start, and complete.
- Active ride browser GPS watch publishes ride-specific driver movement to the backend tracking endpoint.
- Driver home dashboard summary cards now use real earnings, trust, profile/document, notification, and request services.
- Driver active ride reads backend assigned active rides before local continuity storage and does not invent demo rides unless demo mode is enabled.
- Driver notifications use private driver-scoped list/detail/read endpoints.
- Driver support uses private driver-scoped support ticket create/history APIs and clean empty states.
- Driver earnings, trust, profile, and notifications show clean empty states when the database has no matching records.

### Ops Dashboard

Location:

```text
frontend/apps/ops-dashboard
```

Current coverage:

- React Vite TypeScript setup.
- Admin/ops auth, session storage, session restore, proactive refresh, retry-on-expired-token handling, logout cleanup, and protected route guard.
- App shell and backend-aligned route flow.
- Overview, ride operations, pricing/surge, trust-safety, fraud-disputes, communications, admin users, and analytics flows.
- API client method coverage for private admin, analytics, pricing, surge, fraud, auth admins, and auth ops.
- Final admin-action QA verified for pricing rule actions, surge rule actions, fraud case actions, dispute actions, notification delivery actions, and admin user account/permission actions.

## Shared Packages

### API Client

Location:

```text
frontend/packages/api-client
```

Responsibilities:

- Shared HTTP client.
- Public backend API methods.
- Private backend API methods.
- Core backend API methods.
- Central API response and payload types.
- Optional access-token provider, refresh-token provider, and unauthorized cleanup callback.

### UI Package

Location:

```text
frontend/packages/ui
```

Responsibilities:

- Shared UI components.
- Design tokens.
- CSS module typing.
- Base styles.

Available components include:

- Alert
- AppHeader
- Badge
- BottomNav
- Button
- Card
- MetricCard
- ProgressBar
- TextField

## TypeScript Setup

TypeScript is configured from:

```text
frontend/tsconfig.base.json
```

Important setup choices:

```text
target: ES2022
module: ESNext
moduleResolution: Bundler
jsx: react-jsx
strict: true
noEmit: true
```

App-level TypeScript configs use:

```json
"types": ["vite/client", "react", "react-dom"]
```

Both apps support `@/*` imports through their local `tsconfig` and `vite.config.ts` files.

## Commands

Install dependencies:

```bash
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

Seed local demo users from the repo root:

```bash
npm --prefix server run seed:demo
```

Typecheck:

```bash
npm run typecheck:rider
npm run typecheck:driver
npm run typecheck:ops
npm run typecheck:api-client
```

Build:

```bash
npm run build:rider
npm run build:driver
npm run build:ops
```

## Backend Connection

Frontend apps read the backend base URL from:

```text
VITE_API_BASE_URL
```

Example:

```text
VITE_API_BASE_URL=http://localhost:3000
```

When the backend runs on a different port during debugging, start the app with the matching value.

Environment examples are available in each app:

```text
frontend/apps/rider-app/.env.example
frontend/apps/driver-app/.env.example
frontend/apps/ops-dashboard/.env.example
```

Deployment notes are in:

```text
../DEPLOYMENT_GUIDE.md
```

## Current Real Data Notes

- Rider, driver, admin, and ops auth use real backend APIs and MongoDB-backed users.
- Frontend auth sessions use `sessionStorage`, and old localStorage token keys are cleaned during migration/logout.
- The shared API client retries one protected request after a 401 by asking the active app to refresh its access token.
- If refresh fails, the relevant app clears the session and the route guard returns the user to the auth screen.
- Rider, driver, and ops apps show clean messages for expired sessions, failed login/register, too many requests, failed refresh, logout success, unauthorized route access, and stale saved sessions.
- Rider home vehicle prices and ETAs are read from the pricing comparison API when locations are valid.
- Rider history auto-loads the first selected receipt so fare/trust details appear from real ride data.
- The seeded demo flow verifies rider booking, driver accept/complete actions, rider history, driver earnings, and ops dashboard visibility.
- Driver dashboard and detail screens avoid planned/sample values by default; demo fallbacks require explicit demo env flags.
- Rider safety/help and disputes show backend data or explicit empty states instead of UI-only placeholder records.
- Ops communications reads support summary and tickets from private support APIs, and ops fraud-disputes shows dispute evidence/refund/resolution detail.
- Ops dashboard pricing, surge, fraud, disputes, communications, admin users, and analytics screens include consistent loading, empty, error, success, filter, disabled, and confirmation states.
