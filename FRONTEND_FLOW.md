# Frontend Flow Structure

## Purpose

This document defines the frontend structure for the Good Rapido platform after the basic backend flow is ready.

The goal is not to build screens immediately. The goal is to create a clear frontend blueprint so the UI can be built in the same modular direction as the backend.

The frontend should make the product feel transparent, trustworthy, and operationally useful. Every major screen should answer one user question clearly:

- Why is this fare this amount?
- Why is this driver recommended?
- What is happening with my ride right now?
- Is this route fair?
- Is my payment safe and refundable?
- Can ops/admin understand and act on risk quickly?

---

## Frontend Product Surfaces

The frontend should be split into three product surfaces.

```text
frontend/
├── apps/
│   ├── rider-app/
│   ├── driver-app/
│   └── ops-dashboard/
│
├── packages/
│   ├── ui/
│   ├── api-client/
│   ├── auth/
│   ├── config/
│   ├── types/
│   └── utils/
│
└── docs/
```

## Recommended Frontend Direction

Use a modular frontend architecture matching the backend:

```text
route/page -> feature container -> service/api hook -> shared api client -> backend endpoint
```

Recommended stack:

- Web app: React or Next.js
- Mobile app later: React Native
- State: React Query for server state, Zustand or Redux Toolkit for client/session state
- Forms: React Hook Form + Zod
- UI: Shared design system package
- Maps: Mapbox or Google Maps
- Realtime later: Socket.IO or WebSocket client

---

# 1. Rider App Flow

The rider app is the main customer-facing experience.

## Rider App Route Structure

```text
rider-app/
├── auth/
│   ├── splash
│   ├── login
│   ├── register
│   ├── otp-verification
│   └── session-restore
│
├── home/
│   ├── pickup-selector
│   ├── dropoff-selector
│   ├── saved-addresses
│   └── recent-rides
│
├── fare/
│   ├── fare-estimate
│   ├── fare-breakdown
│   ├── fare-confidence
│   ├── surge-explanation
│   └── alternative-pickups
│
├── booking/
│   ├── vehicle-options
│   ├── driver-matches
│   ├── driver-trust-card
│   ├── booking-confirmation
│   └── cancellation-flow
│
├── ride/
│   ├── current-ride
│   ├── driver-arriving
│   ├── ride-started
│   ├── live-route
│   ├── route-fairness
│   └── ride-completed
│
├── payments/
│   ├── payment-methods
│   ├── wallet
│   ├── payment-preview
│   ├── payment-success
│   ├── payment-history
│   └── refund-request
│
├── promos/
│   ├── promo-list
│   ├── promo-apply
│   └── referral
│
├── ratings/
│   ├── rate-driver
│   ├── route-feedback
│   └── fare-feedback
│
├── disputes/
│   ├── create-dispute
│   ├── dispute-history
│   └── dispute-detail
│
├── notifications/
│   ├── inbox
│   ├── notification-detail
│   └── notification-preferences
│
├── support/
│   ├── help-center
│   ├── ticket-create
│   ├── ticket-detail
│   └── ticket-history
│
└── profile/
    ├── profile-detail
    ├── saved-addresses
    ├── emergency-contacts
    └── account-settings
```

## Rider Primary Journey

```text
Open app
-> restore session
-> select pickup/dropoff
-> fetch fare estimate
-> show transparent fare breakdown
-> show vehicle options
-> fetch driver matches
-> show driver trust/risk/fairness cards
-> create booking
-> confirm driver
-> ride live tracking
-> payment preview
-> payment capture
-> receipt
-> rating
-> optional dispute/support
```

## Rider Home Screen

Primary blocks:

- Current location and pickup selector
- Destination search
- Saved locations
- Recent rides
- Current active ride banner
- Wallet/payment quick status
- Notifications badge

Backend modules:

- `public/profile`
- `public/ride-booking`
- `public/rides`
- `public/notifications`

## Fare Estimate Screen

This screen is one of the most important product differentiators.

It should show:

- Total fare
- Base fare
- Distance fare
- Time fare
- Surge fare
- Platform fee
- Taxes
- Fare confidence score
- Surge reason
- Estimate validity
- Fare lock expiry
- Alternative pickup suggestions

Backend modules:

- `public/fare`
- `core/pricing-engine`
- `core/route-engine`

## Driver Match Screen

Show drivers as trust-first options, not only nearest options.

Each driver card should show:

- Driver name
- Vehicle details
- Rating
- Distance/ETA
- Trust score
- Reliability score
- Route fairness score
- Cancellation risk
- Completed rides
- Recommended badge

Backend modules:

- `public/drivers`
- `core/matching-engine`
- `core/trust-engine`

## Booking Flow

```text
Fare estimate selected
-> vehicle selected
-> driver option selected
-> booking created
-> booking confirmation
-> driver assigned
-> ride moves through lifecycle states
```

Ride lifecycle states to support:

- requested
- driver_assigned
- accepted
- arrived
- started
- completed
- cancelled

Backend modules:

- `public/ride-booking`
- `public/rides`
- `core/ride-lifecycle`

## Live Ride Screen

Must show:

- Driver location
- Pickup/dropoff
- ETA
- Route line
- Ride status
- Driver contact/actions
- Emergency action
- Route fairness indicator
- Detour warning
- Fare lock/payment status

Backend modules:

- `public/rides`
- `core/route-engine`
- `core/ride-lifecycle`
- `core/trust-engine`

## Payment Flow

```text
Ride completed or confirmed payment step
-> payment intent preview
-> choose wallet/UPI/card/cash
-> show wallet balance impact
-> capture payment
-> receipt
-> refund window visible
```

Payment screens should show:

- Payment method
- Final amount
- Wallet before/after
- Refund eligibility
- Payment status
- Receipt
- Refund action

Backend modules:

- `public/payments`
- `core/payment-engine`

## Dispute Flow

Dispute categories:

- wrong route
- waiting charge
- fare issue
- payment/refund issue
- driver cancellation
- safety issue

Flow:

```text
Ride/payment selected
-> choose dispute type
-> add note/evidence
-> submit
-> track status
-> receive notification
```

Backend modules:

- `public/disputes`
- `private/disputes`
- `core/notification-engine`

---

# 2. Driver App Flow

The driver app should focus on earning clarity, availability, compliance, and ride execution.

## Driver App Route Structure

```text
driver-app/
├── auth/
│   ├── login
│   ├── register
│   └── session-restore
│
├── onboarding/
│   ├── profile-setup
│   ├── document-upload
│   ├── vehicle-details
│   └── approval-status
│
├── availability/
│   ├── online-toggle
│   ├── location-sharing
│   └── service-zone
│
├── ride-requests/
│   ├── incoming-request
│   ├── fare-preview
│   ├── pickup-route
│   └── accept-decline
│
├── active-ride/
│   ├── navigation
│   ├── arrival-confirmation
│   ├── start-ride
│   ├── complete-ride
│   └── route-fairness
│
├── earnings/
│   ├── earnings-summary
│   ├── ride-earnings
│   ├── incentives
│   ├── penalties
│   └── payout-status
│
├── trust/
│   ├── trust-score
│   ├── cancellation-score
│   ├── route-fairness-score
│   └── improvement-tips
│
├── notifications/
│   ├── inbox
│   └── notification-detail
│
└── profile/
    ├── driver-profile
    ├── vehicle
    ├── documents
    └── account-settings
```

## Driver Primary Journey

```text
Login
-> complete onboarding
-> upload documents
-> approval pending/approved
-> go online
-> receive ride request
-> accept ride
-> navigate to pickup
-> mark arrived
-> start ride
-> complete ride
-> view earnings
```

## Driver Dashboard

Must show:

- Online/offline status
- Current location status
- Today's earnings
- Active ride/request
- Document status
- Trust score
- Cancellation warning
- Notifications

Backend modules:

- `private/driver`
- `private/driver-availability`
- `private/driver-documents`
- `private/earnings`
- `core/trust-engine`

---

# 3. Admin/Ops Dashboard Flow

The ops dashboard should feel dense, useful, and operational. Avoid marketing-style UI here.

## Ops Dashboard Route Structure

```text
ops-dashboard/
├── auth/
│   ├── login
│   └── session-restore
│
├── dashboard/
│   ├── overview
│   ├── live-rides
│   ├── risk-alerts
│   └── operational-health
│
├── users/
│   ├── user-list
│   ├── user-detail
│   └── account-controls
│
├── drivers/
│   ├── driver-list
│   ├── driver-detail
│   ├── document-review
│   └── vehicle-review
│
├── rides/
│   ├── ride-monitoring
│   ├── ride-detail
│   ├── lifecycle-control
│   └── route-review
│
├── pricing/
│   ├── pricing-rules
│   ├── surge-zones
│   ├── fare-simulation
│   └── pricing-audit
│
├── trust/
│   ├── trust-dashboard
│   ├── profile-review
│   └── restriction-controls
│
├── fraud/
│   ├── fraud-dashboard
│   ├── case-list
│   ├── case-detail
│   ├── fraud-simulation
│   └── action-controls
│
├── disputes/
│   ├── dispute-dashboard
│   ├── dispute-list
│   ├── dispute-detail
│   └── resolution-flow
│
├── payments/
│   ├── payment-search
│   ├── refund-review
│   ├── wallet-ledger-later
│   └── settlement-monitoring
│
├── analytics/
│   ├── demand
│   ├── cancellations
│   ├── revenue
│   ├── fraud-risk
│   └── driver-quality
│
└── notifications/
    ├── notification-dashboard
    ├── compose-notification
    ├── delivery-status
    └── retry-failed
```

## Ops Dashboard Home

Must show:

- Live active rides
- High risk rides
- Fraud cases
- Dispute queue
- Driver document review queue
- Surge/pricing alerts
- Failed notification deliveries
- Payment/refund issues

Backend modules:

- `private/admin`
- `private/analytics`
- `private/ride-ops`
- `private/fraud`
- `private/disputes`
- `private/notifications`

## Fraud Review Flow

```text
Open fraud dashboard
-> filter high/critical risk
-> open fraud case
-> review signals/evidence
-> simulate risk score
-> assign reviewer
-> confirm/dismiss/resolve
-> apply controls
```

Backend modules:

- `private/fraud`
- `core/fraud-engine`
- `core/trust-engine`

## Dispute Resolution Flow

```text
Open dispute queue
-> inspect ride/payment/evidence
-> compare route/fare/payment data
-> add internal note
-> resolve/refund/reject
-> notify user
```

Backend modules:

- `private/disputes`
- `public/disputes`
- `core/route-engine`
- `core/payment-engine`
- `core/notification-engine`

## Notification Ops Flow

```text
Open notification dashboard
-> compose notification
-> preview delivery plan
-> check channel/category/quiet-hour rules
-> send/schedule
-> monitor delivery
-> retry failed delivery
```

Backend modules:

- `private/notifications`
- `core/notification-engine`

---

# 4. Shared Frontend Architecture

## Suggested Monorepo Structure

```text
frontend/
├── apps/
│   ├── rider-app/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   ├── routes/
│   │   │   └── main.tsx
│   │   └── package.json
│   │
│   ├── driver-app/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   ├── routes/
│   │   │   └── main.tsx
│   │   └── package.json
│   │
│   └── ops-dashboard/
│       ├── src/
│       │   ├── app/
│       │   ├── features/
│       │   ├── routes/
│       │   └── main.tsx
│       └── package.json
│
├── packages/
│   ├── api-client/
│   ├── auth/
│   ├── config/
│   ├── ui/
│   ├── types/
│   └── utils/
│
└── package.json
```

## Feature Folder Shape

Each frontend feature should follow this pattern:

```text
feature-name/
├── api/
│   ├── feature.api.ts
│   └── feature.keys.ts
├── components/
├── hooks/
├── pages/
├── schemas/
├── store/
├── types/
└── index.ts
```

Example:

```text
features/payments/
├── api/
│   ├── payments.api.ts
│   └── payments.keys.ts
├── components/
│   ├── PaymentMethodList.tsx
│   ├── WalletSummary.tsx
│   └── RefundPreview.tsx
├── hooks/
│   ├── usePaymentMethods.ts
│   ├── useWallet.ts
│   └── usePayRide.ts
├── pages/
│   ├── PaymentMethodsPage.tsx
│   ├── PaymentHistoryPage.tsx
│   └── RefundRequestPage.tsx
├── schemas/
├── types/
└── index.ts
```

---

# 5. API Client Structure

## Shared API Client

```text
packages/api-client/
├── src/
│   ├── client.ts
│   ├── errors.ts
│   ├── interceptors.ts
│   ├── public/
│   ├── private/
│   └── core/
└── package.json
```

## API Groups

```text
api-client/src/public/
├── auth.api.ts
├── profile.api.ts
├── fare.api.ts
├── ride-booking.api.ts
├── rides.api.ts
├── drivers.api.ts
├── payments.api.ts
├── promos.api.ts
├── ratings.api.ts
├── disputes.api.ts
├── notifications.api.ts
└── support.api.ts

api-client/src/private/
├── auth.api.ts
├── admin.api.ts
├── driver.api.ts
├── driver-availability.api.ts
├── driver-documents.api.ts
├── vehicle.api.ts
├── ride-ops.api.ts
├── pricing.api.ts
├── surge.api.ts
├── trust.api.ts
├── fraud.api.ts
├── earnings.api.ts
├── disputes.api.ts
├── analytics.api.ts
└── notifications.api.ts

api-client/src/core/
├── identity.api.ts
├── ride-lifecycle.api.ts
├── pricing-engine.api.ts
├── matching-engine.api.ts
├── route-engine.api.ts
├── trust-engine.api.ts
├── fraud-engine.api.ts
├── payment-engine.api.ts
└── notification-engine.api.ts
```

## Auth Handling

Frontend auth should keep these separately:

- Public access token
- Public refresh token
- Private access token
- Private refresh token
- User role
- Session scope: public/private

Rules:

- Rider/passenger app uses public auth.
- Driver app can use private driver auth.
- Ops dashboard uses private admin/ops auth.
- Core APIs may accept public or private tokens depending on module.

---

# 6. Shared UI System

## UI Package Structure

```text
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Tabs.tsx
│   │   ├── Table.tsx
│   │   ├── Badge.tsx
│   │   ├── Drawer.tsx
│   │   ├── Toast.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── domain/
│   │   ├── FareBreakdown.tsx
│   │   ├── TrustScoreBadge.tsx
│   │   ├── RiskLevelBadge.tsx
│   │   ├── RideStatusBadge.tsx
│   │   ├── PaymentStatusBadge.tsx
│   │   └── NotificationPriorityBadge.tsx
│   │
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── BottomNav.tsx
│   │
│   └── tokens/
│       ├── colors.ts
│       ├── spacing.ts
│       └── typography.ts
```

## Design Rules

- Rider app: simple, transparent, trust-first.
- Driver app: action-first, earnings-first, low distraction.
- Ops dashboard: dense, data-heavy, fast filtering, tables and side panels.
- Avoid unnecessary marketing pages inside the actual app.
- Use clear labels for risk, trust, fare, route, and payment states.
- Every status should have a badge and a short explanation.

---

# 7. State Management

## Server State

Use React Query for:

- fare estimates
- driver matches
- ride status
- payment history
- notifications
- disputes
- ops dashboards

## Client State

Use Zustand or Redux Toolkit for:

- auth session
- selected pickup/dropoff
- current booking draft
- selected vehicle
- selected driver
- UI filters
- map state
- dashboard layout preferences

## Example State Split

```text
server state:
GET /api/v1/public/rides/current
GET /api/v1/public/payments/history
GET /api/v1/private/fraud/dashboard

client state:
selectedPickup
selectedDropoff
selectedVehicleType
selectedPaymentMethod
activeDashboardFilters
```

---

# 8. Backend Integration Priority

Build frontend in this order.

## Phase 1: Rider Core

```text
auth
profile
fare estimate
driver matching
booking
current ride
payments
notifications
```

## Phase 2: Driver App

```text
private auth
driver profile
document upload/review status
availability
ride request
active ride
earnings
notifications
```

## Phase 3: Ops Dashboard

```text
private auth
dashboard overview
ride ops
driver review
pricing/surge
fraud
trust
disputes
analytics
notifications
```

## Phase 4: Trust and Transparency Polish

```text
fare confidence visuals
route fairness visuals
trust score explanations
fraud/risk warnings
payment/refund clarity
notification preference clarity
```

---

# 9. End-to-End Frontend Flows

## Flow A: Normal Ride

```text
login
-> home
-> select pickup/dropoff
-> fare estimate
-> vehicle options
-> driver matches
-> create booking
-> confirm ride
-> live ride
-> complete ride
-> payment
-> receipt
-> rating
```

## Flow B: High Fare Transparency

```text
select route
-> fare estimate
-> surge detected
-> show surge reason
-> show alternative pickups
-> show fare confidence
-> user accepts or changes pickup
```

## Flow C: Driver Cancellation Risk

```text
driver matches
-> driver has medium/high cancellation risk
-> show warning
-> suggest safer driver
-> user chooses driver
```

## Flow D: Route Fairness Issue

```text
live ride
-> actual route drifts from expected route
-> show detour alert
-> explain traffic vs suspicious detour
-> allow dispute after ride
```

## Flow E: Refund Request

```text
payment history
-> select payment
-> refund preview
-> show eligibility
-> submit refund request
-> track dispute/refund status
-> notification update
```

## Flow F: Ops Fraud Case

```text
ops login
-> fraud dashboard
-> open high risk case
-> inspect signals/evidence
-> simulate fraud risk
-> confirm or dismiss
-> apply controls
-> notify user/driver
```

---

# 10. Screen-to-Backend Mapping

## Rider

| Screen | Main Backend |
|---|---|
| Login/Register | `public/auth` |
| Profile | `public/profile` |
| Fare Estimate | `public/fare`, `core/pricing-engine` |
| Driver Match | `public/drivers`, `core/matching-engine` |
| Booking | `public/ride-booking` |
| Current Ride | `public/rides`, `core/ride-lifecycle` |
| Live Route | `core/route-engine` |
| Payment | `public/payments`, `core/payment-engine` |
| Promo | `public/promos` |
| Rating | `public/ratings` |
| Dispute | `public/disputes` |
| Notifications | `public/notifications`, `core/notification-engine` |
| Support | `public/support` |

## Driver

| Screen | Main Backend |
|---|---|
| Driver Login | `private/auth` |
| Driver Profile | `private/driver` |
| Documents | `private/driver-documents` |
| Availability | `private/driver-availability` |
| Earnings | `private/earnings` |
| Trust | `private/trust`, `core/trust-engine` |
| Notifications | `private/notifications` |

## Ops

| Screen | Main Backend |
|---|---|
| Ops Login | `private/auth` |
| Admin Users | `private/admin` |
| Analytics | `private/analytics` |
| Ride Ops | `private/ride-ops`, `core/ride-lifecycle` |
| Pricing | `private/pricing`, `core/pricing-engine` |
| Surge | `private/surge` |
| Trust | `private/trust`, `core/trust-engine` |
| Fraud | `private/fraud`, `core/fraud-engine` |
| Disputes | `private/disputes` |
| Notifications | `private/notifications`, `core/notification-engine` |

---

# 11. MVP Frontend Scope

Do not build everything first. Start with the minimum flow that proves the product.

## Rider MVP

- Auth
- Home pickup/dropoff
- Fare estimate
- Driver match
- Booking create/confirm
- Current ride
- Payment
- Rating
- Notifications

## Driver MVP

- Private auth
- Driver profile
- Availability toggle
- Incoming request
- Active ride
- Earnings summary

## Ops MVP

- Private auth
- Dashboard overview
- Ride ops
- Driver document review
- Fraud dashboard
- Dispute dashboard
- Notification dashboard

---

# 12. Frontend Completion Milestones

## Milestone 1

Frontend project setup, routing, auth shell, API client, UI package.

## Milestone 2

Rider app core booking flow.

## Milestone 3

Payment, notification, rating, dispute flows.

## Milestone 4

Driver app onboarding and active ride flow.

## Milestone 5

Ops dashboard with ride ops, fraud, trust, disputes, notifications.

## Milestone 6

Realtime updates, maps polish, production readiness, E2E testing.

---

# Final Direction

The frontend should not be built as random pages. It should be built as a product system around three experiences:

- Rider experience: transparent booking and payment.
- Driver experience: clear work and earnings.
- Ops experience: fast monitoring and decision-making.

The backend is already modular. The frontend should now mirror that same modular discipline.
