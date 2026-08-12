# Good Rapido Rider App

The rider app is the customer-facing ride booking experience. It focuses on transparent pricing, booking confidence, driver trust, route fairness, safety, history, and profile transparency.

Current status: demo-ready rider MVP. The main rider screens and services are implemented for booking, fare transparency, confirm ride, live ride status, live driver GPS tracking, safety, notifications, history, payments, and profile. Vehicle option prices on the home screen are backed by the pricing comparison API, the fare context chart is derived from quote values, ride history auto-loads the selected receipt, and profile fallbacks use authenticated rider/recent ride data where possible. The seeded demo flow verifies booking through completed ride history.

## Current Screens And Flows

- Auth/session structure.
- Booking home.
- Fare estimate.
- Confirm ride.
- Live ride status stream.
- Live driver GPS tracking panel.
- Safety center.
- Notifications.
- Payment gateway API methods for pay, success, failure, refund, history, and detail flows.
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
- Proactive access-token refresh before protected API calls.
- Retry-on-expired-token handling through the shared API client.
- Legacy localStorage token cleanup during migration/logout.
- Logout and failed-refresh cleanup.
- Auth gate.

Backend modules:

```text
public/auth
```

### booking

- Address-only pickup and dropoff inputs.
- Known-place resolver for MVP demo locations such as Muri, Silli, Ranchi, Howrah Bridge, Park Street, Noida, and Mumbai.
- Clean unknown-location validation with "Please select a valid location".
- Internal latitude/longitude payload generation for backend fare and booking APIs without exposing coordinates in the rider UI.
- Ride type selection with backend-backed pricing comparison for visible fare and ETA cards.
- Estimate CTA.
- Local ride flow handoff.

The backend still receives coordinates because fare, matching, route, and lifecycle services need exact locations. The rider experience hides those technical fields. A production geocoder such as Google Places, Mapbox, or another location provider should replace the current known-place resolver later.

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
- Fare context chart derived from current quote, surge, and alternative pickup data.

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
- Streamed driver GPS tracking updates from `core/ride-lifecycle`.
- Lightweight route preview that moves the driver marker without requiring a real map provider.
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
- Receipt transparency summary that auto-loads for the selected ride.

Backend modules:

```text
public/rides
public/payments
core/route-engine
core/trust-engine
```

### payments

- Payment method list and wallet summary.
- Ride payment creation.
- Gateway success callback.
- Gateway failure callback.
- Refund request.
- Payment detail and history support.

Backend modules:

```text
public/payments
core/payment-engine
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
- Add provider checkout UI once Razorpay/Stripe frontend credentials are configured.
- Connect fraud report submission.
- Polish loading, empty, and error states.
