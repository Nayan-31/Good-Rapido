# Next Generation Ride Booking Platform

## Core Vision
This platform is not just another ride-booking app. It is designed to prioritize transparency, fair pricing, and accountability for both users and drivers. While market leaders like Uber, Ola, and Rapido exist, they suffer from significant trust issues and loopholes. Our goal is to build an ecosystem where the reason behind every fare, route, and driver decision is crystal clear.

## The Problems We Solve

### 1. Pricing Transparency
**Current Issue:** Users don't understand the logic behind high or fluctuating fares.
**Our Solution:**
- Real-time fare breakdown (Base + Distance + Time + Surge).
- Fare confidence meter.
- Historical fare graph.
- Alternative pickup suggestions (e.g., "Move 300m away and save ₹40").

### 2. Driver Fare Transparency
**Current Issue:** Users only see the nearest driver but cannot evaluate their reliability or fairness.
**Our Solution:** Driver profiles include:
- Average fare per km.
- Route fairness score.
- Detour percentage & On-time arrival score.
- Cancellation ratio & User trust score.

### 3. Surge Pricing Manipulation
**Current Issue:** Users cross zones or repeatedly re-book to avoid surge.
**Our Solution:**
- Intelligent pricing lock & short-duration fare reservation.
- Transparent surge explanation & Demand heatmap.
- Dynamic but predictable pricing model.

### 4. Promo Abuse Prevention
**Current Issue:** Exploitation of first-ride discounts via multiple accounts.
**Our Solution:**
- Device fingerprinting & Identity verification layers.
- Referral fraud detection & Behavioral anomaly detection.

### 5. Driver Cancellation Abuse
**Current Issue:** Drivers accept rides and force passengers to cancel for higher fares.
**Our Solution:**
- Cancellation behavior tracking & trust scores.
- Automatic penalties for repeated abuse.
- AI-based fraud detection.

### 6. Fake Trips & Ghost Rides
**Current Issue:** Rides are marked complete without actual travel.
**Our Solution:**
- Start ride verification & Location consistency checks.
- Route authenticity validation & Rider confirmation checkpoints.

### 7. Route Fairness Engine
**Current Issue:** Drivers take unnecessarily long routes.
**Our Solution:**
- Route comparison engine (Expected vs. Actual).
- Live detour alerts & Fair route score.
- Automated explanations if extra distance was due to traffic vs. unnecessary detours.

### 8. Waiting Charge Protection
**Current Issue:** Misuse of waiting charges by drivers.
**Our Solution:**
- Accurate arrival verification via GPS + timestamp validation.
- Transparent waiting timer & User dispute resolution system.

### 9. Trust-Based UX
**Current Issue:** Traditional apps focus purely on booking.
**Our Solution:** Our UI focuses heavily on trust-building, showing:
- Fair Price Score, Driver Reliability Score, Route Accuracy Score, Cancellation Risk Score.

---

## Architecture Overview (Module-Based)

The platform is built using a feature-driven, module-based architecture (Modular Monolith) split by access level (`public` vs `private`) to ensure real-time data processing, scalability, and transparency.

### Directory Structure
```
src/
├── config/             # DB, Redis, Logger, Env variables
├── modules/            # Feature-based domains
│   ├── private/        # Internal, Admin, & Driver APIs (admin, driver, fraud, trust)
│   └── public/         # Rider & Public-facing APIs (auth, ride-booking, fare)
├── seed/               # Database seed scripts
├── shared/             # Common utils, middlewares, constants
├── sockets/            # WebSocket logic (live tracking, real-time fare)
├── app.js              # Express app & global middleware
└── server.js           # Server entry point & service initialization
```

### 1. Presentation Layer (Client Interfaces)
- **Rider App (iOS/Android/Web):** Smart Fare Comparison UI, Driver Transparency Dashboard, Route Analytics.
- **Driver App (iOS/Android):** Earnings Dashboard, Fair Route Navigation, Cancellation Alerts.
- **Admin/Ops Dashboard (Web):** Fraud monitoring, Dispute resolution.

### 2. API Gateway / Edge Layer
- Request Routing & Load Balancing.
- Device Fingerprinting (Promo abuse prevention).
- Rate Limiting & Authentication.

### 3. Application / Service Layer (Core Business Logic)
- **Identity & Trust Service:** Profile management, Trust/Reliability/Cancellation Scores calculation.
- **Pricing & Fare Engine:** Real-time fare breakdown, Transparent Surge Logic, Fare Confidence Module.
- **Ride Lifecycle Service:** Driver matching based on trust, State management, Waiting Charge validation.
- **Location & Routing Engine:** Live GPS processing, Route Fairness Engine (Expected vs. Actual).
- **Fraud & Anomaly Detection Service:** Ghost ride detection, cancellation abuse monitoring, AI-based anomaly detection.

### 4. Event Bus / Messaging Layer (Async Communication)
- **Message Broker (Kafka/RabbitMQ):** Handles async events (e.g., `RideCompleted` triggers Trust Score updates and Billing).

### 5. Data Access / Infrastructure Layer
- **Relational Database (PostgreSQL):** Profiles, Transactions, Trust Scores.
- **In-Memory Cache (Redis):** Geospatial queries, session tokens, real-time surge locks.
- **Analytics Database (ClickHouse/MongoDB):** Telemetry data, historical fares, behavioral analytics.
- **External APIs:** Google Maps/Mapbox, Payment Gateways, SMS Providers.

---

**Final Goal:** To create the most transparent, trustworthy, and fair ride-booking ecosystem, replacing the "black-box" experience with clear, data-driven insights.

---

## Project Module Roadmap

This is the planned module direction, not the current implementation state.

Current implementation status:

- **Implemented now:** `src/modules/public/auth`, `src/modules/public/profile`, `src/modules/public/fare`, `src/modules/public/ride-booking`, `src/modules/public/rides`, `src/modules/public/drivers`, `src/modules/public/payments`, `src/modules/public/promos`
- **Reserved for upcoming work:** `src/modules/private`
- **Planned later:** `src/modules/core`

After public authentication, the platform should grow as a modular monolith with three clear module layers:

- **Public modules:** Rider and passenger-facing APIs.
- **Private modules:** Driver, admin, ops, and internal APIs.
- **Core modules:** Shared business engines used by both public and private APIs.

The goal is to keep the project DRY. Public and private modules can expose different route surfaces, but shared business logic should live in reusable services, DAOs, and core engines.

### Planned Directory Direction

```text
src/
├── modules/
│   ├── public/
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── fare/
│   │   ├── ride-booking/
│   │   ├── rides/
│   │   ├── drivers/
│   │   ├── payments/
│   │   ├── promos/
│   │   ├── ratings/
│   │   ├── disputes/
│   │   ├── notifications/
│   │   └── support/
│   │
│   ├── private/
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── driver/
│   │   ├── driver-availability/
│   │   ├── driver-documents/
│   │   ├── vehicle/
│   │   ├── ride-ops/
│   │   ├── pricing/
│   │   ├── surge/
│   │   ├── trust/
│   │   ├── fraud/
│   │   ├── earnings/
│   │   ├── disputes/
│   │   ├── analytics/
│   │   └── notifications/
│   │
│   └── core/
│       ├── identity/
│       ├── ride-lifecycle/
│       ├── pricing-engine/
│       ├── matching-engine/
│       ├── route-engine/
│       ├── trust-engine/
│       ├── fraud-engine/
│       ├── payment-engine/
│       └── notification-engine/
```

### Planned Public Modules

Public modules are for rider and passenger workflows.

- **auth:** Rider and passenger register, login, refresh, logout, and profile session.
- **profile:** Rider/passenger profile, saved addresses, emergency contacts, and preferences.
- **fare:** Fare estimate, fare breakdown, fare confidence meter, and alternate pickup suggestions.
- **ride-booking:** Ride search, booking creation, driver selection, and cancellation.
- **rides:** Current ride, ride history, ride details, and trip receipt.
- **drivers:** Public driver profile, trust score, route fairness score, and cancellation risk.
- **payments:** Payment methods, wallet, ride payment, invoices, and refunds.
- **promos:** Promo eligibility, referral code, and promo application.
- **ratings:** Driver rating, route feedback, fare feedback, and ride experience feedback.
- **disputes:** Waiting charge dispute, wrong route dispute, fake trip dispute, and refund request.
- **notifications:** User notifications, ride alerts, fare lock expiry, and payment updates.
- **support:** Help center, support tickets, FAQs, and contact support.

### Planned Private Modules

Private modules are for drivers, admins, ops users, and internal systems.

- **auth:** Driver, admin, and ops authentication with role-aware permissions.
- **admin:** Admin users, roles, permissions, and internal dashboard APIs.
- **driver:** Driver profile, onboarding status, approval status, and account controls.
- **driver-availability:** Online/offline status, current location, and active service zones.
- **driver-documents:** License, identity verification, KYC documents, and approval workflow.
- **vehicle:** Vehicle details, registration certificate, insurance, and pollution certificate.
- **ride-ops:** Internal ride monitoring, manual ride review, force cancel, and driver reassignment.
- **pricing:** Base fare configuration, city pricing, distance pricing, time pricing, and commission rules.
- **surge:** Surge zones, demand heatmap, supply rules, and fare lock management.
- **trust:** Rider trust score, driver trust score, cancellation score, and route fairness score.
- **fraud:** Promo abuse detection, ghost ride detection, suspicious cancellations, and device fingerprint review.
- **earnings:** Driver earnings, commission, payout, penalties, incentives, and settlement status.
- **disputes:** Ops/admin dispute review, evidence tracking, resolution, and refunds.
- **analytics:** Historical fares, cancellation trends, demand heatmaps, and driver behavior analytics.
- **notifications:** Driver/admin alerts, operational events, and dispute updates.

### Planned Core Modules

Core modules hold reusable business logic. Public and private APIs should call these engines instead of duplicating business rules.

- **identity:** Shared profile, role, account status, and identity verification rules.
- **ride-lifecycle:** Ride states such as requested, accepted, arrived, started, completed, and cancelled.
- **pricing-engine:** Base fare, distance fare, time fare, surge fare, fare lock, and transparent fare breakdown.
- **matching-engine:** Driver matching based on location, availability, trust score, cancellation risk, and vehicle type.
- **route-engine:** Expected route, actual route, route comparison, detour percentage, and waiting validation.
- **trust-engine:** Rider reliability, driver reliability, route fairness, cancellation behavior, and dispute impact.
- **fraud-engine:** Promo abuse, fake trips, ghost rides, device anomalies, and suspicious behavior.
- **payment-engine:** Payment capture, refunds, wallet, invoices, commission, and driver settlement.
- **notification-engine:** Reusable notification orchestration for push, SMS, email, and in-app alerts.

### Standard Module Shape

Each feature module should follow the same layered structure:

```text
module/
├── dto/
├── interfaces/
├── session/              # only when the module needs auth/session helpers
├── validators/
├── module.constants.js
├── module.controller.js
├── module.dao.js
├── module.model.js
├── module.route.js
├── module.service.js
└── module.route.test.js
```

Standard request flow:

```text
route -> validator/middleware -> controller -> service -> dao -> model
```

Controllers should stay thin. Business logic belongs in services. Database logic belongs in DAOs. Response shaping belongs in DTOs. Validation belongs in validators.

### Recommended Build Order

1. Private auth for driver, admin, and ops users.
2. Private profile modules for driver, admin, and ops users.
3. Driver onboarding with documents, vehicle, and KYC verification.
4. Driver availability and live location.
5. Fare estimate and pricing engine.
6. Ride booking and ride lifecycle.
7. Matching engine.
8. Live ride sockets.
9. Payments, wallet, invoices, and refunds.
10. Ratings and disputes.
11. Trust engine.
12. Fraud engine.
13. Analytics and admin dashboard APIs.

The next practical module after public auth and public profile should be **private auth**, followed by **driver onboarding**, because ride booking depends on verified drivers, vehicles, availability, and location.

---

## Implemented Module: Public Drivers

The public drivers module exposes rider-facing driver transparency APIs. It helps users compare drivers before or during booking using trust score, route fairness, cancellation risk, ETA, rating, vehicle details, and completed ride history.

### Problem It Solves

Traditional ride-booking apps often show only the nearest or cheapest driver. Users cannot easily understand whether a driver is reliable, likely to cancel, or known for fair routing. This module turns driver selection into a transparent decision by exposing safety and trust signals in a structured API response.

### Module Hierarchy

```text
src/modules/public/drivers/
├── dto/
│   └── drivers.dto.js              # Shapes public driver API responses
├── validators/
│   └── drivers.validator.js        # Validates filters and driver route params
├── drivers.constants.js            # Sort options and trust/fairness labels
├── drivers.controller.js           # Handles HTTP request/response flow
├── drivers.dao.js                  # Reads and filters driver catalog data
├── drivers.model.js                # Public driver catalog model source
├── drivers.route.js                # Authenticated public driver routes
├── drivers.service.js              # Driver trust, route, and risk business logic
└── drivers.route.test.js           # Route coverage for list/profile/insight APIs
```

### API Usage

All drivers endpoints require a bearer access token from the auth module.

```http
Authorization: Bearer <access_token>
```

Available endpoints:

```text
GET /api/v1/public/drivers
GET /api/v1/public/drivers?vehicleType=cab_economy&sortBy=route_fairness&limit=5
GET /api/v1/public/drivers/:driverId
GET /api/v1/public/drivers/:driverId/trust
GET /api/v1/public/drivers/:driverId/route-fairness
GET /api/v1/public/drivers/:driverId/cancellation-risk
```

Supported list filters:

```text
vehicleType: bike | auto | cab_economy | cab_premium
riskLevel: low | medium | high
sortBy: trust_score | eta | rating | route_fairness | cancellation_risk
limit: 1-30
```

Users can use this module to:

- Compare available drivers by trust score, ETA, rating, and cancellation risk.
- Open a driver profile before selecting a ride.
- Check whether a driver usually follows fair routes.
- Review cancellation-risk guidance for time-sensitive rides.
- Build a transparent driver selection UI in the rider app.

---

## Implemented Module: Public Payments

The public payments module exposes rider-facing payment APIs for supported payment methods, wallet balance, ride payment capture, payment history, payment details, and refund requests.

Current payment behavior is dummy/local simulated. The module does not call a real payment gateway yet, and no payment keys are required in `.env` for the current implementation. Payment references are generated locally, and wallet balance uses module constants.

When a real gateway is integrated later, add gateway keys to `.env` and wire them through `src/config/env.js` and the payments service:

```env
PAYMENT_GATEWAY=razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

### Problem It Solves

Ride payments often become a black box after booking: users do not know which amount was captured, whether wallet balance changed correctly, whether a ride has already been paid, or how to request a refund. This module creates a transparent ride-linked payment ledger so every payment can be traced back to a ride, method, fare amount, wallet movement, and refund status.

### Module Hierarchy

```text
src/modules/public/payments/
├── dto/
│   └── payments.dto.js             # Shapes public payment, wallet, method, and refund responses
├── validators/
│   └── payments.validator.js       # Validates payment query, ride payment body, and refund body
├── payments.constants.js           # Payment methods, statuses, refund reasons, and wallet defaults
├── payments.controller.js          # Handles HTTP request/response flow
├── payments.dao.js                 # Reads and writes payment records
├── payments.model.js               # Mongo payment transaction schema
├── payments.route.js               # Authenticated public payment routes
├── payments.service.js             # Payment capture, duplicate guard, wallet, and refund logic
└── payments.route.test.js          # Route coverage for methods, wallet, payment, history, and refunds
```

### API Usage

All payments endpoints require a bearer access token from the auth module.

```http
Authorization: Bearer <access_token>
```

Available endpoints:

```text
GET /api/v1/public/payments/methods
GET /api/v1/public/payments/wallet
GET /api/v1/public/payments/history
GET /api/v1/public/payments/history?status=succeeded&limit=5
POST /api/v1/public/payments/rides/:rideId/pay
GET /api/v1/public/payments/:paymentId
POST /api/v1/public/payments/:paymentId/refund
```

Supported payment methods:

```text
personal_wallet
upi
card
cash
```

Users can use this module to:

- See available payment methods before paying for a ride.
- Check wallet balance and wallet movement after payment.
- Pay for a confirmed ride with wallet, UPI, card, or cash.
- Prevent duplicate successful payment for the same ride.
- View payment history and individual ride-linked receipts.
- Request a refund with a clear reason and optional amount.

---

## Docker & Local Development

This project uses **Docker Compose** to manage the local development environment seamlessly.

## Current API Surface

The currently implemented public modules are authentication, profile management, fare estimates, ride booking, rides, driver transparency, and payments. They follow the layered flow described above:

`routes -> validators/middlewares -> controller -> service -> dao -> Mongo model`

Controllers only hand off request data and send service responses. Services own business rules, database access is isolated in DAOs, and response shaping is handled through DTOs.

### Auth Routes

Base path: `/api/v1/public/auth`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/riders/register` | Register a rider account |
| POST | `/riders/login` | Login a rider account |
| POST | `/riders/refresh` | Rotate rider access and refresh tokens |
| POST | `/riders/logout` | Logout a rider session |
| GET | `/riders/me` | Fetch the authenticated rider profile |
| POST | `/passengers/register` | Register a passenger account |
| POST | `/passengers/login` | Login a passenger account |
| POST | `/passengers/refresh` | Rotate passenger access and refresh tokens |
| POST | `/passengers/logout` | Logout a passenger session |
| GET | `/passengers/me` | Fetch the authenticated passenger profile |

Register body:

```json
{
  "fullName": "Nayan Mahato",
  "email": "nayan@example.com",
  "phone": "+919999999999",
  "password": "password123"
}
```

Login body:

```json
{
  "identifier": "+919999999999",
  "password": "password123"
}
```

Use the returned access token as `Authorization: Bearer <accessToken>` for `/me`. Use the returned refresh token in the `refreshToken` body field for `/refresh` and `/logout`.

### Profile Routes

Base path: `/api/v1/public/profile`

All profile routes require `Authorization: Bearer <accessToken>`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/me` | Fetch or create the authenticated user's public profile |
| PATCH | `/me` | Update editable profile fields |
| PATCH | `/preferences` | Update profile preferences |
| POST | `/saved-addresses` | Add a saved address |
| PATCH | `/saved-addresses/:addressId` | Update a saved address |
| DELETE | `/saved-addresses/:addressId` | Remove a saved address |
| POST | `/emergency-contacts` | Add an emergency contact |
| PATCH | `/emergency-contacts/:contactId` | Update an emergency contact |
| DELETE | `/emergency-contacts/:contactId` | Remove an emergency contact |

Update profile body:

```json
{
  "displayName": "Nayan Mahato",
  "avatarUrl": "https://example.com/avatar.png",
  "dateOfBirth": "2000-01-01",
  "gender": "male"
}
```

Update preferences body:

```json
{
  "language": "en",
  "notifications": {
    "sms": true,
    "email": true,
    "push": true
  }
}
```

Saved address body:

```json
{
  "label": "Home",
  "addressLine": "221B Baker Street",
  "city": "Kolkata",
  "state": "West Bengal",
  "country": "India",
  "pincode": "700001",
  "location": {
    "latitude": 22.5726,
    "longitude": 88.3639
  },
  "isDefault": true
}
```

Emergency contact body:

```json
{
  "name": "Emergency Person",
  "phone": "+919876543210",
  "relationship": "Friend"
}
```

### Fare Module

Base path: `/api/v1/public/fare`

All fare routes require `Authorization: Bearer <accessToken>`.

#### GitHub Description

The public fare module adds transparent ride pricing for riders and passengers. It creates a fare estimate before booking, stores the estimate snapshot, explains the full price breakdown, shows surge reasons, gives a confidence signal, suggests cheaper nearby pickup points, and allows users to lock a quoted fare for a short time.

#### How This Helps Users

- Users can see the complete fare before booking instead of guessing from a single total.
- The fare explains base fare, distance, time, surge, platform fee, tax, and final amount separately.
- Surge is shown with a reason, so price increases feel understandable instead of random.
- The confidence meter tells users whether the estimate is stable or likely to change.
- Alternate pickup suggestions can help users move a short distance and save money.
- Fare lock gives users a short window where the quoted price is protected.
- Fare history helps users compare recent estimates and notice unusual pricing.

#### What This Module Provides

- Fare estimate creation for supported vehicle types.
- Transparent pricing breakdown with currency, base fare, distance fare, time fare, surge fare, fees, taxes, and total fare.
- Demand-aware surge level and explanation.
- Fare confidence score with human-readable factors.
- Alternate pickup suggestions with walking distance and estimated savings.
- Short-duration fare lock for valid estimates.
- Recent fare history for the authenticated user.

#### API Routes

| Method | Path | Description |
| --- | --- | --- |
| POST | `/estimate` | Create a fare estimate with breakdown, confidence, surge, and alternate pickups |
| GET | `/estimates/:estimateId` | Fetch a saved fare estimate |
| POST | `/estimates/:estimateId/lock` | Lock a valid estimate for a short pricing window |
| GET | `/history` | Fetch recent fare totals for the authenticated user |

#### Fare Estimate Body

```json
{
  "pickup": {
    "address": "Park Street, Kolkata",
    "latitude": 22.5535,
    "longitude": 88.3526
  },
  "dropoff": {
    "address": "Howrah Station",
    "latitude": 22.585,
    "longitude": 88.3426
  },
  "vehicleType": "bike",
  "requestedAt": "2026-01-01T12:00:00.000Z"
}
```

#### Supported Vehicle Types

```text
bike
auto
cab_economy
cab_premium
```

#### Fare History Query Examples

```text
/api/v1/public/fare/history
/api/v1/public/fare/history?vehicleType=auto&limit=5
```

### Ride Booking Module

Base path: `/api/v1/public/ride-booking`

All ride booking routes require `Authorization: Bearer <accessToken>`.

#### GitHub Description

The public ride-booking module turns a transparent fare estimate into a booking flow. It helps users search trusted driver matches, create a ride booking, select or change a driver, confirm the ride, and cancel with a clear reason. The module keeps the fare snapshot, driver trust signals, route fairness score, cancellation risk, and locked quote timing visible throughout the booking process.

#### How This Helps Users

- Users can book from a known fare estimate instead of starting from a hidden price.
- Driver options are ranked with trust, route fairness, arrival reliability, and cancellation behavior.
- Users can see driver reliability before confirming the ride.
- The selected booking stores the fare snapshot, so the quoted price remains explainable.
- Cancellation uses explicit reasons, improving accountability and future trust scoring.
- Confirmation checks the booking quote window, helping avoid stale or misleading prices.

#### What This Module Provides

- Trusted driver search from a fare estimate.
- Ride booking creation with selected driver and fare snapshot.
- Driver selection or driver change before confirmation.
- Booking detail fetch for the authenticated user.
- Ride confirmation while the quote is still valid.
- Ride cancellation with reason and optional note.
- Trust signals including fair price score, route fairness, route accuracy, driver reliability, cancellation ratio, and cancellation risk.

#### API Routes

| Method | Path | Description |
| --- | --- | --- |
| POST | `/search` | Search trusted driver options for a fare estimate |
| POST | `/bookings` | Create a ride booking from a valid fare estimate |
| GET | `/bookings/:bookingId` | Fetch a ride booking |
| PATCH | `/bookings/:bookingId/driver` | Select or change the driver before confirmation |
| POST | `/bookings/:bookingId/confirm` | Confirm a ride booking while the quote is valid |
| POST | `/bookings/:bookingId/cancel` | Cancel a ride booking with a transparent reason |

#### Search Body

```json
{
  "fareEstimateId": "fare-estimate-id",
  "limit": 3
}
```

#### Create Booking Body

```json
{
  "fareEstimateId": "fare-estimate-id",
  "selectedDriverId": "drv_cab_rajesh",
  "paymentMethod": "personal_wallet",
  "riderNote": "Please call after reaching the pickup gate"
}
```

#### Select Driver Body

```json
{
  "driverId": "drv_cab_neha"
}
```

#### Cancel Booking Body

```json
{
  "reason": "changed_plans",
  "note": "No longer needed"
}
```

Supported cancellation reasons:

```text
driver_late
price_changed
changed_plans
safety_concern
wrong_pickup
other
```

### Drivers Module

Base path: `/api/v1/public/drivers`

All driver transparency routes require `Authorization: Bearer <accessToken>`.

#### GitHub Description

The public drivers module gives riders and passengers a transparent driver profile before or during booking. It exposes driver trust score, route fairness, cancellation risk, average fare per km, arrival reliability, detour history, completed rides, and vehicle identity.

#### How This Helps Users

- Users can compare drivers by trust instead of only distance.
- Driver fare behavior is visible through average fare per km.
- Route fairness and detour percentage make route behavior easier to understand.
- Cancellation risk is explicit before the user commits to a driver.
- Trust reports explain the dimensions behind the driver score.

#### API Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | List public driver transparency summaries |
| GET | `/:driverId` | Fetch a public driver profile |
| GET | `/:driverId/trust` | Fetch driver trust score details |
| GET | `/:driverId/route-fairness` | Fetch route fairness and detour signals |
| GET | `/:driverId/cancellation-risk` | Fetch cancellation risk and rider guidance |

#### Driver List Query Examples

```text
/api/v1/public/drivers
/api/v1/public/drivers?vehicleType=cab_economy&sortBy=route_fairness&limit=3
/api/v1/public/drivers?riskLevel=low&sortBy=cancellation_risk
```

Supported sort options:

```text
trust_score
eta
rating
route_fairness
cancellation_risk
```

### Payments Module

Base path: `/api/v1/public/payments`

All payments routes require `Authorization: Bearer <accessToken>`.

#### GitHub Description

The public payments module connects confirmed rides with transparent payment records. It supports payment method discovery, wallet summary, ride payment capture, payment history, payment detail lookup, and refund requests. Each payment stores the ride snapshot, fare amount, method, wallet balance movement, gateway reference, capture status, and refund status.

Current implementation note: payments are dummy/local simulated. No payment gateway request is made, no Razorpay or Stripe key is required in `.env`, and wallet balance is currently driven by module constants. For real gateway integration later, add keys such as:

```env
PAYMENT_GATEWAY=razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

#### How This Helps Users

- Users can see supported payment options before paying.
- Wallet balance is visible before payment, and wallet balance after payment is returned.
- Duplicate successful payment for the same ride is blocked.
- Every transaction is linked to a ride booking code and driver snapshot.
- Payment history gives users a simple ledger for past ride payments.
- Refund requests are captured with a reason, note, amount, and review status.

#### API Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/methods` | Fetch supported payment methods and wallet balance |
| GET | `/wallet` | Fetch wallet summary |
| GET | `/history` | Fetch payment history for the authenticated user |
| POST | `/rides/:rideId/pay` | Pay for a confirmed ride |
| GET | `/:paymentId` | Fetch a payment record |
| POST | `/:paymentId/refund` | Request a refund for a successful payment |

#### Ride Payment Body

```json
{
  "paymentMethod": "personal_wallet",
  "tipAmount": 0,
  "discountAmount": 0,
  "idempotencyKey": "ride-pay-0001"
}
```

Supported payment methods:

```text
personal_wallet
upi
card
cash
```

Supported payment history statuses:

```text
pending
succeeded
failed
refund_requested
refunded
```

#### Refund Body

```json
{
  "reason": "overcharged",
  "note": "Fare was higher than expected",
  "amount": 120
}
```

Supported refund reasons:

```text
driver_cancelled
overcharged
wrong_route
duplicate_payment
other
```

#### Payment Query Examples

```text
/api/v1/public/payments/methods
/api/v1/public/payments/wallet
/api/v1/public/payments/history?status=succeeded&limit=5
/api/v1/public/payments/rides/<rideId>/pay
```

### Quick Start Commands

- **Start the environment:**
  ```bash
  docker compose up --build -d
  ```
  *This builds the Node.js API image, downloads the MongoDB database, links them together in a secure network, and runs them in the background.*

- **View only the API Logs (Live):**
  ```bash
  docker compose logs -f api
  ```
  *This shows you the live console output of just your Node server (ignoring database spam). Press `Ctrl + C` to stop watching.*

- **Stop the environment:**
  ```bash
  docker compose down
  ```
  *This safely stops and removes the running containers to save RAM. Your code and database records are permanently saved and will be right there when you start it up again.*

### Why Docker Compose instead of Manual Commands?

If you were to run this architecture manually, you would have to run:
1. `docker build -t good-rapido-api .` (To build the Node app)
2. `docker run mongo:latest` (To start the database)
3. `docker run -p 3000:3000 good-rapido-api` (To start the app)

We handle all of this automatically inside `docker-compose.yml` for several critical reasons:
1. **Automated Networking:** Manual `docker run` commands place containers in isolated networks, meaning Node cannot talk to MongoDB easily. Docker Compose automatically creates a private Bridge Network so Node can connect securely using `mongodb://mongodb:27017/rapido`.
2. **Volume Mounting (Live Reloading):** Compose mounts your local codebase into the container (`.:/app`). When you hit "Save" on a file in VS Code, `nodemon` instantly restarts the server inside Docker without having to rebuild the image.
3. **Persistent Database:** We map a volume (`mongo-data:/data/db`) so that running `docker compose down` doesn't wipe your hard-earned database records.
4. **Log Suppression:** We pass `--quiet` to the MongoDB container natively in the YAML file to prevent massive blocks of WiredTiger boot-logs from polluting the terminal.
