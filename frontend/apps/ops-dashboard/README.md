# Good Rapido Ops Dashboard

The ops dashboard is the internal web app for admin and operations teams. It is separate from the passenger-facing rider app and the driver app.

Current status: skeleton ready. The app has React, Vite, TypeScript, routing, protected admin/ops auth wiring, a reusable operations screen pattern, and backend-aligned feature screens. The screens currently show structured placeholder metrics so the product flow is visible before full API binding.

## What This App Does

- Gives admins and ops users one command center for platform health.
- Tracks ride queues, lifecycle exceptions, driver reassignment, and cancellations.
- Manages pricing rules, surge rules, and fare simulations.
- Reviews trust, safety, driver documents, and vehicle compliance.
- Investigates fraud cases and dispute escalations.
- Operates notifications, retries, cancellations, and support handoffs.
- Manages admin and ops users, statuses, and permissions.
- Exposes analytics for rides, revenue, drivers, trust-safety, and forecasts.

## Backend Modules Used

```text
private/auth/admins
private/auth/ops
private/admin
private/analytics
private/ride-ops
private/pricing
private/surge
private/trust
private/fraud
private/disputes
private/notifications
private/driver-documents
private/vehicle
core/ride-lifecycle
core/matching-engine
core/pricing-engine
core/trust-engine
core/fraud-engine
core/notification-engine
public/support
```

## Current Screens

```text
ops-dashboard/
+-- auth
+-- overview
+-- ride-ops
+-- pricing
+-- trust-safety
+-- fraud-disputes
+-- communications
+-- admin-users
+-- analytics
```

## Run

From `frontend/`:

```bash
npm run dev:ops
```

Default URL:

```text
http://localhost:5176
```

Typecheck:

```bash
npm run typecheck:ops
```

Build:

```bash
npm run build:ops
```

## Environment

The ops dashboard reads the backend URL from:

```text
VITE_API_BASE_URL
```

Default fallback:

```text
http://localhost:3000
```

Backend CORS must include:

```text
http://localhost:5176
http://127.0.0.1:5176
```

## Important Auth Note

Driver registration is public inside private auth, but admin and ops registration is intentionally disabled in the backend route layer. Admin and ops accounts must be created through backend seed data, database setup, or the private admin users API after an admin session exists.
