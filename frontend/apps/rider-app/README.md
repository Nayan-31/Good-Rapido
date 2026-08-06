# Good Rapido Rider App

The rider app is the customer-facing ride booking experience. It focuses on transparent pricing, booking confidence, driver trust, route fairness, safety, history, and profile transparency.

Current status: demo-ready rider MVP. The main rider screens and services are implemented for booking, fare transparency, confirm ride, live ride status, safety, notifications, history, and profile. The seeded demo flow verifies booking through completed ride history.

## Current Screens And Flows

- Auth/session structure.
- Booking home.
- Fare estimate.
- Confirm ride.
- Live ride status stream.
- Safety center.
- Notifications.
- Ride history.
- Profile dashboard.

## Structure

```text
rider-app/
+-- src/
    +-- app/
    +-- components/
    +-- features/
    |   +-- auth/
    |   +-- booking/
    |   +-- identity/
    |   +-- pricing/
    |   +-- matching/
    |   +-- ride-lifecycle/
    |   +-- safety/
    |   +-- notifications/
    |   +-- history/
    |   +-- profile/
    +-- layouts/
    +-- routes/
    +-- services/
    +-- styles/
    +-- types/
```

## Feature Responsibilities

### auth

- Rider login/session structure.
- Session-storage based auth session.
- Legacy localStorage token cleanup during migration/logout.
- Auth gate.

Backend modules:

```text
public/auth
```

### booking

- Pickup and dropoff inputs.
- Ride type selection.
- Estimate CTA.
- Local ride flow handoff.

Backend modules:

```text
public/ride-booking
core/pricing-engine
core/matching-engine
```

### pricing

- Fare estimate.
- Fare breakdown.
- Fare confidence.
- Surge transparency.

Backend modules:

```text
public/fare
core/pricing-engine
```

### ride-lifecycle

- Confirm ride flow.
- Matched driver summary.
- Locked fare summary.
- Booking confirmation path.
- Streamed lifecycle status updates after driver actions.
- Periodic refresh fallback when streaming is unavailable.

Backend modules:

```text
public/ride-booking
core/ride-lifecycle
core/matching-engine
```

### safety

- Safety center.
- Safety status.
- Emergency and support entry points.
- Fraud/reporting placeholders.

Backend modules:

```text
public/support
public/disputes
core/fraud-engine
```

### notifications

- Rider notification screen.
- Ride, fare, safety, and payment update structure.

Backend modules:

```text
public/notifications
core/notification-engine
```

### history

- Ride history.
- Fare and trust transparency cards.
- Receipt transparency summary.

Backend modules:

```text
public/rides
public/payments
core/route-engine
core/trust-engine
```

### profile

- Rider profile dashboard.
- Saved addresses.
- Emergency contacts.
- Trust transparency cards.

Backend modules:

```text
public/profile
core/identity
```

## Run Locally

From the frontend workspace:

```bash
npm run dev:rider
```

If the backend is running on a custom port, run this from `frontend/apps/rider-app`:

```bash
VITE_API_BASE_URL=http://localhost:3000 npm run dev -- --host 0.0.0.0
```

## Verify

```bash
npm run typecheck
npm run build
```

From the frontend workspace:

```bash
npm run typecheck:rider
npm run build:rider
```

## Next Work

- Complete end-to-end persisted ride booking.
- Connect live route and route fairness data.
- Connect real payment and refund data.
- Connect fraud report submission.
- Polish loading, empty, and error states.
