# Good Rapido Driver App

The driver app is the operational app for drivers. It focuses on authentication, onboarding, availability, ride execution, earnings clarity, trust improvement, and support.

Current status: demo-ready driver MVP. The app shell, routing, auth flow, onboarding, availability, ride request, active ride, live GPS tracking, earnings, trust, profile, notifications, and support flows are implemented. The seeded demo flow verifies real rider-to-driver request handoff and ride lifecycle actions.

## What Is Real Now

- Driver registration.
- Driver login.
- Friendly driver auth messages for failed login/register, too many requests, expired sessions, refresh failure, unauthorized routes, stale saved sessions, and logout success.
- JWT access and refresh token flow.
- Session-storage based frontend auth session.
- Proactive access-token refresh before protected driver API calls.
- Retry-on-expired-token handling through the shared API client.
- Legacy localStorage token cleanup during migration/logout.
- Session restore.
- Logout and failed-refresh cleanup.
- User-friendly rate-limit and stale-session messages through shared API error handling.
- Route protection based on auth state.
- Header initials from the authenticated driver name.
- Real seeded ride request visibility for the matched driver.
- Accept, arrived, start, and complete ride actions through backend lifecycle APIs.
- Active ride browser GPS watch publishes ride-specific driver coordinates to `core/ride-lifecycle`.
- GPS updates are also mirrored to driver availability as a best-effort location freshness signal.
- Earnings update after completed demo rides.
- Driver dashboard cards read earnings, trust, document, notification, and request summaries from the same services used by the detail screens.
- Active ride state loads backend assigned active rides first, local accepted-ride continuity second, and demo data only when `VITE_USE_DEMO_RIDE_REQUESTS=true`.
- Driver earnings, trust, profile, and notification screens default to honest empty states when the backend has no live records.
- Driver notifications can be listed and marked read through private driver-scoped notification APIs.

Primary backend modules used now:

```text
server/src/modules/private/auth
server/src/modules/private/driver
server/src/modules/private/driver-availability
server/src/modules/private/driver-documents
server/src/modules/private/vehicle
server/src/modules/private/ride-ops
server/src/modules/private/earnings
server/src/modules/private/trust
server/src/modules/private/notifications
server/src/modules/private/support
server/src/modules/core/ride-lifecycle
```

MongoDB collection used now:

```text
private_auth_users
public_notifications
public_support_tickets
```

## What Still Uses Fallbacks When No Live Records Exist

- Some empty-state helper cards.
- Demo-only driver ride, earnings, trust, profile, and notification data can be enabled for screenshots with explicit demo environment flags.
- Support ticket creation and history use private support APIs and show clean empty states when no records exist.

These fallbacks keep the demo readable only when intentionally enabled. The main auth, booking handoff, active ride lifecycle, driver notifications, and earnings smoke flow are backend-verified.

## Structure

```text
driver-app/
+-- src/
    +-- app/
    +-- components/
    +-- features/
    |   +-- auth/
    |   +-- onboarding/
    |   +-- availability/
    |   +-- ride-requests/
    |   +-- active-ride/
    |   +-- earnings/
    |   +-- trust/
    |   +-- notifications/
    |   +-- profile/
    |   +-- support/
    +-- layouts/
    +-- routes/
    +-- services/
    +-- styles/
    +-- types/
```

## Primary Driver Journey

```text
Login or register
-> restore session
-> complete onboarding
-> upload documents
-> add vehicle details
-> wait for approval
-> go online
-> receive ride request
-> accept or decline
-> navigate to pickup
-> mark arrived
-> start ride
-> complete ride
-> review earnings
```

## Feature Responsibilities

### auth

- Driver login.
- Driver registration.
- Session restore.
- Session-scoped token storage.
- Proactive token refresh and retry-on-expired-token handling.
- Logout and stale-session cleanup.
- Route guard redirects with a clear login-required message.

Backend module:

```text
private/auth
```

### onboarding

- Driver profile setup.
- Document upload.
- Vehicle details.
- Approval status.
- Compliance blockers.

Backend modules to connect:

```text
private/driver
private/driver-documents
private/vehicle
```

### availability

- Online/offline toggle.
- GPS location sharing state.
- Real map provider support with Google Maps when `VITE_GOOGLE_MAPS_API_KEY` is configured.
- Active service zone.
- Availability warnings.

Backend module to connect:

```text
private/driver-availability
```

### ride-requests

- Incoming ride request.
- Fare preview.
- Pickup route summary.
- Trust and cancellation guidance.
- Accept or decline actions.

Backend modules to connect:

```text
private/ride-ops
core/matching-engine
core/trust-engine
```

### active-ride

- Current ride state.
- Navigate to pickup.
- Mark arrived.
- Start ride.
- Complete ride.
- Live bike movement data published to the rider tracking stream.
- Lightweight route preview for demo tracking while the production map provider remains optional.
- Route fairness and detour indicators.

Backend modules to connect:

```text
private/ride-ops
core/ride-lifecycle
core/route-engine
```

### earnings

- Today's earnings.
- Ride earnings breakdown.
- Incentives.
- Deductions or penalties.
- Payout status.

Backend module to connect:

```text
private/earnings
```

### trust

- Driver trust score.
- Cancellation score.
- Route fairness score.
- Improvement tips.

Backend modules to connect:

```text
private/trust
core/trust-engine
```

### notifications

- Driver inbox.
- Ride alerts.
- Document approval alerts.
- Earnings and payout alerts.
- Mark notification as read.
- Private driver-scoped read access; ops/admin notification creation and delivery actions remain protected.

Backend modules to connect:

```text
private/notifications
core/notification-engine
```

### profile

- Driver profile.
- Vehicle summary.
- Document status.
- Account settings.

Backend modules to connect:

```text
private/driver
private/vehicle
private/driver-documents
```

### support

- Driver help center.
- Create support request.
- Track support tickets.
- Backend-backed ticket history for the logged-in driver.
- Explicit empty state when no support tickets exist.

Backend modules to connect:

```text
private/support
```

## Run Locally

From the frontend workspace:

```bash
npm run dev:driver
```

If the backend is running on a custom port, run this from `frontend/apps/driver-app`:

```bash
VITE_API_BASE_URL=http://localhost:3000 npm run dev -- --host 0.0.0.0 --port 5174
```

To use Google Maps in the driver app, add this in `frontend/apps/driver-app/.env.local`:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

The key must have Google Maps JavaScript API enabled. Without this key, the app uses Leaflet/OpenStreetMap fallback.

Optional demo fallbacks:

```bash
VITE_USE_DEMO_RIDE_REQUESTS=true
VITE_USE_DEMO_DRIVER_DATA=true
```

Keep these unset for real-data testing so empty backend states stay honest.

## Verify

```bash
npm run typecheck
npm run build
```

From the frontend workspace:

```bash
npm run typecheck:driver
npm run build:driver
```

## Next Work

- Add deeper browser E2E coverage for auth to completed ride.
- Add production map/GPS provider keys for real deployment.
- Add production SMS/push/email provider integrations for notification delivery.
