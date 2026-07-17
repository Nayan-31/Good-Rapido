# Good Rapido Frontend

This workspace contains the frontend apps and shared frontend packages for Good Rapido.

Current status: in progress. Rider app has MVP screens and API-facing services. Driver app has real auth/session integration and UI-first screens for the remaining driver workflow.

## Workspace Structure

```text
frontend/
+-- apps/
|   +-- rider-app/
|   +-- driver-app/
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

- Auth/session structure.
- Booking home.
- Fare estimate with breakdown, confidence, and surge transparency.
- Confirm ride flow.
- Safety center.
- Notifications.
- Ride history.
- Profile dashboard.

### Driver App

Location:

```text
frontend/apps/driver-app
```

Current coverage:

- App shell and route flow.
- Driver login/register.
- Token storage.
- Session restore.
- Logout.
- UI-first screens for onboarding, availability, ride requests, active ride, earnings, trust, alerts, profile, and support.

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

Typecheck:

```bash
npm run typecheck:rider
npm run typecheck:driver
npm run typecheck:api-client
```

Build:

```bash
npm run build:rider
npm run build:driver
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

## Current Real Data Notes

- Driver auth uses real backend APIs and MongoDB-backed users.
- Rider and driver screens beyond auth are still being connected flow by flow.
- UI screens may show hardcoded operational metrics until their feature service is fully wired to backend data.
