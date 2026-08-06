# Good Rapido Driver App

The driver app is the operational app for drivers. It focuses on authentication, onboarding, availability, ride execution, earnings clarity, trust improvement, and support.

Current status: demo-ready driver MVP. The app shell, routing, auth flow, onboarding, availability, ride request, active ride, earnings, trust, profile, notifications, and support flows are implemented. The seeded demo flow verifies real rider-to-driver request handoff and ride lifecycle actions.

## What Is Real Now

- Driver registration.
- Driver login.
- JWT access and refresh token flow.
- Session-storage based frontend auth session.
- Proactive access-token refresh before protected driver API calls.
- Retry-on-expired-token handling through the shared API client.
- Legacy localStorage token cleanup during migration/logout.
- Session restore.
- Logout and failed-refresh cleanup.
- Route protection based on auth state.
- Header initials from the authenticated driver name.
- Real seeded ride request visibility for the matched driver.
- Accept, arrived, start, and complete ride actions through backend lifecycle APIs.
- Earnings update after completed demo rides.

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
server/src/modules/public/support
server/src/modules/core/ride-lifecycle
```

MongoDB collection used now:

```text
private_auth_users
```

## What Still Uses Fallbacks When No Live Records Exist

- Some secondary dashboard metrics.
- Some empty-state helper cards.
- Some notification/support preview text.

These fallbacks keep the demo readable when the local database has no matching records yet. The main auth, booking handoff, active ride lifecycle, and earnings smoke flow are backend-verified.

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
- Live bike movement on a real map.
- Google Maps route view when `VITE_GOOGLE_MAPS_API_KEY` is configured.
- Leaflet/OpenStreetMap fallback when a Google Maps key is not available.
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

Backend modules to connect:

```text
public/support
private/disputes
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

- Connect availability API.
- Connect onboarding, documents, and vehicle APIs.
- Connect ride request accept/decline flow.
- Connect active ride lifecycle actions.
- Connect earnings and trust dashboards.
- Replace hardcoded UI metrics with backend data.
