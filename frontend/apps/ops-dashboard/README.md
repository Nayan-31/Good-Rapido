# Good Rapido Ops Dashboard

The ops dashboard is the internal web app for admin and operations teams. It is separate from the passenger-facing rider app and the driver app.

Current status: ops foundation ready. The app has React, Vite, TypeScript, routing, protected admin/ops auth wiring, real overview data binding, real ride-ops queue binding, ride detail review, ops-state updates, ride confirmation, driver reassignment, cancellation actions, pricing rule controls, surge rule controls, fare impact simulation, trust-safety review workflows, fraud-dispute operations, communications workflows, admin user management, real analytics workbench data, and polished ops UI states. Final admin-action QA has been verified for pricing, surge, fraud, disputes, notifications, admin users, and analytics.

## What This App Does

- Gives admins and ops users one command center for platform health.
- Tracks ride queues, lifecycle exceptions, driver reassignment, confirmations, ops-state updates, and cancellations.
- Manages pricing rules, surge rules, and fare simulations.
- Reviews trust, safety, driver documents, and vehicle compliance.
- Investigates fraud cases and dispute escalations.
- Operates notifications, retries, cancellations, and support handoffs from private support records.
- Manages admin and ops users, statuses, and permissions.
- Exposes real analytics for rides, revenue, drivers, trust-safety, and forecasts.
- Shows professional loading, empty, error, success, disabled, filter, and confirmation states for ops actions.

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
private/support
private/driver-documents
private/vehicle
core/ride-lifecycle
core/matching-engine
core/pricing-engine
core/trust-engine
core/fraud-engine
core/notification-engine
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

## Completed Integration

- Admin/ops login, session-storage auth, session restore, proactive refresh, retry-on-expired-token handling, logout cleanup, and protected route guard.
- Demo seed command for rider, driver, admin, and ops users.
- Overview dashboard connected to private admin, private analytics, and private ride-ops.
- Overview health cards, alerts summary, partial error handling, and loading states.
- Ride operations dashboard connected to `private/ride-ops`.
- Ride queue table with status, priority, issue, and search filters.
- Ride detail drawer with route, fare, driver, lifecycle, and next-action context.
- Confirm ride, reassign driver, cancel ride, and update ops-state actions.
- Lifecycle exception view for pending confirmation, escalated, urgent, and high-risk rides.
- Pricing dashboard connected to `private/pricing`.
- Pricing rules list, create draft, update draft, activate, and archive actions.
- Surge dashboard connected to `private/surge`.
- Surge rules list, create, update editable rules, activate, pause, end, and archive actions.
- Pricing and surge simulation with transparent fare impact preview.
- Trust-safety dashboard connected to `private/trust`, `private/driver-documents`, and `private/vehicle`.
- Trust profile queue with reviewer assignment, notes, and review resolution.
- Driver document review queue with approve/reject actions.
- Vehicle review queue with approve/reject actions.
- Driver compliance cards for trust risk, restrictions, documents, and vehicles.
- Fraud dashboard connected to `private/fraud`.
- Fraud case queue with risk simulation, reviewer assignment, confirm, dismiss, and resolve actions.
- Dispute dashboard connected to `private/disputes`.
- Dispute queue with assign owner, request evidence, resolve, and reject actions.
- Dispute detail review with rider description, evidence count, requested refund amount, next action, and resolution state.
- Communications dashboard connected to `private/notifications` and `private/support`.
- Notification list, detail review, create notification, send, retry, fail, and cancel actions.
- Support ticket summary with open, resolved, closed, urgent, and recent ticket context from backend support records.
- Incident broadcast UI using multi-recipient urgent safety notification payloads.
- Admin users dashboard connected to `private/admin`.
- Admin user directory with role, status, search filters, create user, and profile update actions.
- Account status controls for active, pending, blocked, and suspended users.
- Permission matrix UI with grouped permissions and protected update flow.
- Pricing and surge screens now include rule search, status filters, clean empty states, loading rows, and confirmation before activate/pause/end/archive actions.
- Fraud and dispute screens now include status/severity/priority/search filters, clean queue empty states, loading rows, and confirmation before confirm/dismiss/resolve/reject/evidence actions.
- Communications screen now includes notification/support filters, form disabled states, clean empty states, loading rows, and confirmation before delivery/broadcast actions.
- Admin users screen now includes clearable filters, create form disabled states, table loading rows, empty states, and confirmation before account status or permission updates.
- Analytics screen now loads `private/analytics` overview, rides, revenue, drivers, trust-safety, and forecast data instead of placeholder content.
- Shared ops feedback components provide consistent banners, empty states, loading skeletons, and confirm-action controls across the dashboard.

## Final Admin-Action QA

The following ops/admin action flows have been checked from screen action to frontend service to shared API client to backend route coverage:

- Pricing rules: list, detail, create draft, update draft, activate, archive, and pricing simulation.
- Surge rules: list, detail, create, update, activate, pause, end, archive, and surge simulation.
- Fraud cases: queue, detail, assign reviewer, confirm, dismiss, resolve, and risk simulation.
- Disputes: queue, detail, assign owner, request evidence, resolve with refund amount, and reject.
- Notifications: list, detail, create, send, retry, fail, cancel, and incident broadcast payloads.
- Admin users: directory filters, user detail, create user, update profile, update status, and update permissions through the permission matrix.
- Analytics: date/grouping filters, overview metrics, ride trend chart, revenue breakdown, driver supply cards, trust-safety signals, and forecast form.

Latest QA commands run for this check:

```bash
npm --prefix frontend run typecheck:ops
npm --prefix frontend run typecheck:api-client
npm --prefix server test -- pricing.route.test.js surge.route.test.js fraud.route.test.js disputes.route.test.js notifications.route.test.js admin.route.test.js
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

Seed local demo users from the repo root:

```bash
npm --prefix server run seed:demo
```

Default local credentials:

```text
Rider: rider@goodrapido.test / Password@123
Admin: admin@goodrapido.test / Password@123
Ops: ops@goodrapido.test / Password@123
```

Driver demo accounts are also created by `seed:demo`, which helps ops verify real ride queue activity after rider booking and driver completion.

Override seed password:

```bash
PRIVATE_AUTH_SEED_PASSWORD="YourStrongPassword@123" npm --prefix server run seed:private-auth
```

Reset existing seeded passwords:

```bash
PRIVATE_AUTH_SEED_RESET_PASSWORDS=true npm --prefix server run seed:private-auth
```

Use the private auth seed only when you specifically need to recreate admin/ops/driver auth users without resetting the wider demo ride data.

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

Driver registration is public inside private auth, but admin and ops registration is intentionally disabled in the backend route layer. Admin and ops accounts must be created through the private auth seed script, database setup, or the private admin users API after an admin session exists.
