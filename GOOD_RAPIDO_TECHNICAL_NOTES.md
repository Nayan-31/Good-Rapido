# Good Rapido Technical Notes

These notes explain Good Rapido as a product, a frontend system, and a backend architecture. The goal is to help you confidently explain the app in interviews, project reviews, demos, and recruiter conversations.

## 1. One Line Pitch

Good Rapido is a full-stack transparent ride-booking platform where riders can book rides, understand fare changes, see why a driver was matched, track route fairness, and use safety, fraud, payments, driver, and ops workflows from one modular system.

## 2. Core Product Idea

Normal ride-booking apps usually show only the final fare and final driver. Good Rapido is built around transparency.

The platform tries to answer these questions:

- Why did my fare change?
- Why was this route selected?
- Why did the system match this driver?
- Is the driver reliable?
- Is the route fair?
- Is surge pricing justified?
- What happens if a ride, payment, safety, fraud, or dispute issue occurs?
- How can driver operations and admin teams monitor the platform?

## 3. High Level System Map

The app is split into frontend apps, shared frontend packages, backend modules, and MongoDB persistence.

```text
Rider App
Driver App
Ops Dashboard
    |
    v
Frontend feature screens
    |
    v
Frontend feature services
    |
    v
Shared API client package
    |
    v
Express API
    |
    v
Route -> Validator/Auth Guard -> Controller -> Service -> DAO -> Mongoose Model -> MongoDB
    |
    v
DTO/Response formatting
    |
    v
Frontend UI state
```

## 4. Main Project Folders

```text
server/
  src/
    app.js
    config/
    shared/
    modules/
      public/
      core/
      private/

frontend/
  apps/
    rider-app/
    driver-app/
    ops-dashboard/
  packages/
    api-client/
    ui/
```

### Server Folder

The `server` folder contains the Express backend. It owns APIs, business logic, validation, authentication, persistence, and module separation.

### Frontend Folder

The `frontend` folder contains three apps:

- `rider-app`: passenger booking and ride transparency experience.
- `driver-app`: driver onboarding, availability, ride handling, earnings, trust, profile, GPS, and active ride flow.
- `ops-dashboard`: admin/ops dashboard for monitoring rides, pricing, surge, fraud, disputes, trust, analytics, notifications, and platform health.

### Shared Frontend Packages

- `frontend/packages/api-client`: typed API wrapper used by all frontend apps.
- `frontend/packages/ui`: reusable design system components and tokens.

## 5. Backend Startup Flow

Backend startup begins from `server/server.js`.

```text
server/server.js
    |
    v
createApp() from server/src/app.js
    |
    v
connectDB() from server/src/config/db.js
    |
    v
mongoose.connect(env.MONGO_URL)
    |
    v
app.listen(env.PORT)
```

In simple words:

1. `server/server.js` imports the Express app.
2. It calls `connectDB()`.
3. `connectDB()` connects to MongoDB using `env.MONGO_URL`.
4. After MongoDB connects successfully, Express starts listening on the configured port.
5. If MongoDB connection fails, the logger records the startup error.

## 6. Express App Mounting Flow

`server/src/app.js` creates the Express app and mounts all modules.

First it applies shared middleware:

- `morgan` in development for request logging.
- `securityMiddlewares(app)` for CORS, cookies, helmet, HPP protection, compression, JSON body parsing, URL encoded parsing, and rate limiting.
- `/health` route for API health checks.

Then it mounts module routes:

```text
/api/v1/public/*
/api/v1/core/*
/api/v1/private/*
```

Finally it applies:

- `notFoundMiddleware` for unknown routes.
- `errorMiddleware` for consistent error responses.

## 7. Backend Layer Meaning

Good Rapido follows a clean request pipeline:

```text
Route -> Middleware -> Controller -> Service -> DAO -> Model -> MongoDB
```

### Route

The route file defines:

- API path.
- HTTP method.
- Validation middleware.
- Auth guard.
- Controller method.
- Dependency wiring.

Example:

```text
POST /api/v1/public/ride-booking/bookings
```

The route decides that this request must:

1. Pass public auth.
2. Pass Zod validation.
3. Call `rideBookingController.createBooking`.

### Middleware

Middleware handles cross-cutting concerns before the controller runs.

Examples:

- Auth guard verifies the access token.
- Role guard checks whether rider, driver, admin, or ops is allowed.
- Permission guard checks whether the user can perform that action.
- Zod validator checks request body, params, and query.
- Rate limiter prevents abuse.

### Controller

The controller is a thin HTTP adapter.

It should not contain business logic.

Its job is:

- Read `req.body`, `req.params`, `req.query`, and `req.auth`.
- Call the matching service method.
- Send the returned response.

Example mental model:

```text
controller.createBooking(req, res)
    -> service.createBooking(req.auth, req.body)
    -> sendHttpResponse(res, result)
```

### Service

The service is where business rules live.

It decides:

- Is the user allowed to do this?
- Is the fare estimate still valid?
- Is the booking expired?
- Which driver should be selected?
- Can a driver go online?
- Is a lifecycle transition allowed?
- Should a fraud case be escalated?
- What response should be returned?

The service can call:

- DAO for database reads/writes.
- Core engine functions for calculations.
- DTO functions for response shaping.
- Utility functions for success/error responses.

### DAO

DAO means Data Access Object.

DAO isolates database queries from business logic.

It knows:

- Which model to use.
- Which MongoDB query to run.
- Which filter protects user-owned data.
- Whether to use `findOne`, `findById`, `create`, `updateOne`, or `findOneAndUpdate`.

DAO does not decide product behavior. It only talks to MongoDB through Mongoose.

### Model

The model is the Mongoose schema.

It defines:

- Collection name.
- Required fields.
- Enums.
- Nested objects.
- Default values.
- Indexes.
- Unique constraints.
- Timestamps.

Example:

`PrivateAuthUser` maps to MongoDB collection `private_auth_users`.

### MongoDB

MongoDB stores the actual documents.

Examples:

- Public users.
- Private auth users.
- Fare estimates.
- Ride bookings.
- Driver profiles.
- Driver availability.
- Vehicles.
- Documents.
- Pricing rules.
- Surge rules.
- Trust profiles.
- Fraud cases.
- Disputes.
- Notifications.

## 8. Why This Architecture Is Good

This structure is useful because each layer has one job.

- Routes are easy to scan.
- Controllers stay simple.
- Services are testable.
- DAOs can be mocked in tests --> means replacing the real database-connected object with a fake, simulated version.
- Models protect database structure.
- DTOs prevent leaking raw database documents.
- Frontend services do not need to know backend internals.

This helps both users and developers:

- Users get predictable app behavior.
- Developers can add modules without breaking the whole app.
- Bugs are easier to locate because every request has a known path.
- Tests can focus on service behavior instead of full HTTP setup every time.

## 9. Backend Module Layers

The backend has three major module groups.

### Public Modules

Public modules are rider-facing APIs.

Mounted under:

```text
/api/v1/public
```

Main modules:

- `auth`: rider registration, login, refresh, logout, session restore.
- `profile`: rider profile, preferences, saved addresses, emergency contacts.
- `fare`: fare estimate, lock fare, fare history.
- `ride-booking`: search drivers, create booking, select driver, confirm booking, cancel booking.
- `rides`: current ride, ride history, receipt.
- `drivers`: public driver profiles, trust report, route fairness, cancellation risk.
- `payments`: methods, wallet, ride payment, refunds, payment history.
- `promos`: promo and referral flow.
- `ratings`: driver rating, route feedback, fare feedback.
- `disputes`: rider dispute creation and history.
- `notifications`: rider notification inbox and preferences.
- `support`: FAQs, tickets, contact support.

### Core Modules

Core modules are business engines.

Mounted under:

```text
/api/v1/core
```

Main modules:

- `identity`: identity verification flow.
- `ride-lifecycle`: ride state transitions and lifecycle timeline.
- `pricing-engine`: fare calculation, surge logic, confidence, simulation.
- `matching-engine`: driver ranking and transparency reasons.
- `trust-engine`: rider/driver trust scoring.
- `route-engine`: route planning, route quality, detour and route fairness signals.
- `fraud-engine`: fraud risk assessment.
- `payment-engine`: payment intent and refund preview logic.
- `notification-engine`: delivery planning and message composition.

### Private Modules

Private modules are driver, admin, and ops-facing APIs.

Mounted under:

```text
/api/v1/private
```

Main modules:

- `auth`: driver, admin, and ops login/session APIs.
- `admin`: admin dashboard and user management.
- `analytics`: platform analytics and forecasting.
- `driver`: driver profile, onboarding, account controls.
- `driver-availability`: online/offline status, live location, service zones.
- `driver-documents`: document upload and review.
- `vehicle`: vehicle profile and review.
- `ride-ops`: ride queue, ride detail, confirm, reassign, cancel, ops state.
- `earnings`: driver earnings, statements, payout preview.
- `pricing`: pricing rule CRUD and simulation.
- `surge`: surge rule CRUD and lifecycle actions.
- `trust`: trust queue, reviewer assignment, notes, resolution.
- `fraud`: fraud case queue, risk simulation, review actions.
- `disputes`: ops dispute queue, evidence, resolve/reject.
- `notifications`: create/send/retry/fail/cancel notifications.

## 10. Exact Request Lifecycle Example

Example: rider creates a fare estimate.

```text
Rider Home Screen
    |
    v
bookingService.createFareEstimate(form)
    |
    v
apiClient.public.fare.createEstimate(payload)
    |
    v
POST /api/v1/public/fare/estimate
    |
    v
fare.route.js
    |
    v
public auth guard + Zod validator
    |
    v
fare.controller.js
    |
    v
fare.service.js
    |
    v
pricing-engine.engine.js + route-engine.engine.js
    |
    v
fare.dao.js
    |
    v
fare.model.js
    |
    v
MongoDB fare estimate document
    |
    v
fare.dto.js
    |
    v
JSON response
    |
    v
Frontend estimate UI
```

This is the full flow from button click to database and back.

## 11. Rider Auth Flow

Purpose:

Riders need an account so fare estimates, bookings, ride history, profile data, payments, disputes, notifications, and support tickets belong to a real authenticated user.

Frontend flow:

```text
Identity/Auth UI
    |
    v
auth service
    |
    v
apiClient.public.auth
    |
    v
/api/v1/public/auth/riders/*
```

Backend flow:

```text
auth.route.js
    |
    v
validate login/register/refresh/logout payload
    |
    v
auth.controller.js
    |
    v
auth.service.js
    |
    v
password service + token service
    |
    v
auth.dao.js
    |
    v
auth.model.js
    |
    v
MongoDB public auth user
```

What the service handles:

- Normalizes phone/email/name.
- Checks duplicate accounts.
- Hashes password.
- Creates JWT access and refresh tokens.
- Stores refresh token hash.
- Restores session using refresh token.
- Logs out by clearing refresh token hash.

Interview explanation:

Public auth separates rider accounts from private driver/admin/ops accounts. This keeps permissions simple and avoids mixing customer access with internal platform access.

## 12. Driver/Admin/Ops Private Auth Flow

Purpose:

Drivers, admins, and ops users have different permissions from riders. They use the private auth module.

Routes:

```text
/api/v1/private/auth/drivers/register
/api/v1/private/auth/drivers/login
/api/v1/private/auth/drivers/refresh
/api/v1/private/auth/drivers/logout
/api/v1/private/auth/drivers/me

/api/v1/private/auth/admins/login
/api/v1/private/auth/admins/refresh
/api/v1/private/auth/admins/logout
/api/v1/private/auth/admins/me

/api/v1/private/auth/ops/login
/api/v1/private/auth/ops/refresh
/api/v1/private/auth/ops/logout
/api/v1/private/auth/ops/me
```

Code flow:

```text
private auth route
    |
    v
Zod validation
    |
    v
PrivateAuthController
    |
    v
PrivateAuthService
    |
    v
PasswordService + PrivateTokenService
    |
    v
PrivateAuthDao
    |
    v
PrivateAuthUser model
    |
    v
private_auth_users collection
```

Important model details:

- Collection: `private_auth_users`.
- Fields: role, fullName, email, phone, employeeCode, department, serviceZone, permissions, accountStatus, passwordHash, refreshTokenHash, lastLoginAt.
- Unique indexes:
  - role + phone.
  - role + email.
  - role + employeeCode.
- Password hash and refresh token hash are hidden by default using `select: false`.

What the service handles:

- Driver self-registration is allowed.
- Admin and ops self-registration is disabled.
- Login can identify user by email, phone, or employee code.
- Default permissions are assigned from role constants.
- Refresh token is verified and hash-matched.
- Logout clears stored refresh token hash.

Pitch line:

Private auth gives drivers, admins, and ops users role-based access without exposing internal APIs to normal riders.

## 13. Fare Estimate And Pricing Flow

Purpose:

Before booking, rider should know total fare and why that fare exists.

Frontend:

```text
BookingHomeScreen
    |
    v
booking.service.ts
    |
    v
apiClient.public.fare.createEstimate
```

Backend:

```text
POST /api/v1/public/fare/estimate
    |
    v
FareController.createEstimate
    |
    v
FareService.createEstimate
    |
    v
buildPricingQuote()
    |
    v
buildRoutePlan()
    |
    v
FareDao.create()
    |
    v
FareEstimate model
    |
    v
MongoDB
```

What `FareService` does:

- Confirms authenticated rider context.
- Normalizes pickup and drop-off.
- Normalizes requested time.
- Calls the pricing engine.
- Stores estimate in MongoDB.
- Returns a public DTO.

What `pricing-engine` does:

- Uses pickup, drop-off, vehicle type, service zone, and requested time.
- Calls route engine to estimate route distance and duration.
- Applies base fare, per km fare, per minute fare, minimum fare, platform fee, tax, and surge.
- Creates confidence score.
- Creates alternative pickup suggestions.
- Creates validity window and lock window.

What riders see:

- Estimated total.
- Base fare.
- Distance fare.
- Time fare.
- Surge fare.
- Platform fee.
- Tax.
- Fare confidence.
- Smart saving tip.
- Fare lock state.

How to explain:

The final fare is not just a random number. It is calculated from route distance, expected duration, vehicle pricing rule, tax, platform fee, and surge multiplier. The app exposes each part to the rider.

## 14. Surge Transparency Flow

Purpose:

Rider should know why surge is applied.

Backend source:

```text
pricing-engine.engine.js
    |
    v
calculatePricingSurge()
```

Current surge logic:

- Morning peak can increase price.
- Evening peak can increase price.
- Late night can increase price because availability is lower.
- Surge is capped by rule max multiplier.
- Surge level can be normal, moderate, or high.

Frontend shows:

- Surge amount in fare breakdown.
- Surge reason.
- Higher-than-usual indicator.
- Price stability/confidence.
- Alternative pickup tip when available.

Pitch line:

Good Rapido does not hide surge inside the total fare. It separates surge as its own line item and explains the reason behind it.

## 15. Ride Search And Driver Matching Flow

Purpose:

After fare estimate, rider searches for drivers. The app should explain why a driver is matched.

Frontend:

```text
ConfirmRideScreen / Matching UI
    |
    v
matching service
    |
    v
apiClient.public.rideBooking.search
```

Backend:

```text
POST /api/v1/public/ride-booking/search
    |
    v
RideBookingController.search
    |
    v
RideBookingService.search
    |
    v
FareDao.findByIdForUser()
    |
    v
buildDriverMatches()
    |
    v
buildRideTrustSummary()
    |
    v
Ride search DTO
```

What `RideBookingService.search` does:

- Checks rider auth.
- Finds the fare estimate belonging to that rider.
- Rejects expired fare estimates.
- Calls matching engine.
- Builds trust summary for the driver options.
- Returns driver options to the frontend.

What `matching-engine` checks:

- Vehicle type match.
- Driver availability status.
- Service zone.
- Pickup proximity.
- ETA.
- Trust score.
- Reliability score.
- Route fairness score.
- Cancellation risk.
- Driver distance from pickup.

How driver ranking works:

The matching engine calculates a match score using weighted signals:

- Trust.
- Reliability.
- Route fairness.
- Cancellation behavior.
- ETA.
- Proximity.

The best match appears first.

What riders see:

- Driver name.
- Vehicle details.
- ETA.
- Rating.
- Reliability.
- Cancellation risk.
- Route fairness.
- Match/trust badges.

Pitch line:

The driver match is explainable because the system ranks drivers using trust, reliability, route fairness, cancellation behavior, ETA, and pickup distance instead of only showing the nearest driver.

## 16. Ride Booking Flow

Purpose:

Once rider selects a driver, booking should preserve fare, driver snapshot, trust signals, and booking state.

Routes:

```text
POST /api/v1/public/ride-booking/bookings
GET /api/v1/public/ride-booking/bookings/:bookingId
PATCH /api/v1/public/ride-booking/bookings/:bookingId/driver
POST /api/v1/public/ride-booking/bookings/:bookingId/confirm
POST /api/v1/public/ride-booking/bookings/:bookingId/cancel
```

Create booking flow:

```text
Rider confirms selected driver
    |
    v
apiClient.public.rideBooking.createBooking()
    |
    v
ride-booking.route.js
    |
    v
auth guard + Zod validation
    |
    v
RideBookingController.createBooking
    |
    v
RideBookingService.createBooking
    |
    v
FareDao.findByIdForUser
    |
    v
Matching engine resolves driver
    |
    v
Trust engine builds trust signals
    |
    v
RideBookingDao.create
    |
    v
RideBooking model
    |
    v
MongoDB ride booking document
```

What is stored in booking:

- Booking code.
- Rider auth user id.
- Rider role.
- Fare estimate id.
- Booking status.
- Pickup.
- Drop-off.
- Vehicle type.
- Selected driver snapshot.
- Fare snapshot.
- Trust signals.
- Payment method.
- Rider note.
- Expiry time.
- Lifecycle fields.
- Cancellation fields when cancelled.

Why snapshots matter:

Fare and driver details can change later. The booking stores a snapshot so the rider can later review what was promised at booking time.

Confirm booking flow:

```text
POST /bookings/:bookingId/confirm
    |
    v
RideBookingService.confirmBooking
    |
    v
getMutableBooking()
    |
    v
check not cancelled
    |
    v
check not already confirmed
    |
    v
check not expired
    |
    v
RideBookingDao.confirmBooking()
    |
    v
MongoDB status update
```

Cancel booking flow:

```text
POST /bookings/:bookingId/cancel
    |
    v
RideBookingService.cancelBooking
    |
    v
RideBookingDao.cancelBooking
    |
    v
MongoDB cancellation object saved
```

Pitch line:

Ride booking converts a temporary fare estimate into a durable ride record with locked fare snapshot, selected driver snapshot, trust signals, and lifecycle state.

## 17. Ride Lifecycle Flow

Purpose:

After a booking is confirmed, both rider and driver need to track the ride state.

Core route:

```text
GET /api/v1/core/ride-lifecycle/rides/:rideId
POST /api/v1/core/ride-lifecycle/rides/:rideId/events
```

Lifecycle flow:

```text
Driver active ride screen
    |
    v
activeRideService.transitionRide(event)
    |
    v
apiClient.core.rideLifecycle.transitionRide
    |
    v
ride-lifecycle.route.js
    |
    v
core lifecycle auth guard
    |
    v
RideLifecycleController.transitionRide
    |
    v
RideLifecycleService.transitionRide
    |
    v
RideLifecycleDao.findRideById
    |
    v
buildRideLifecycle()
    |
    v
assertTransitionAllowed()
    |
    v
RideLifecycleDao.updateRideById
    |
    v
RideBooking model
    |
    v
MongoDB
```

Important detail:

Ride lifecycle does not use a separate lifecycle collection. It updates the lifecycle section inside the ride booking document. This keeps booking and lifecycle connected.

Lifecycle service checks:

- Is the user authenticated?
- Is it a public rider or private driver/admin/ops token?
- If private driver, is this ride assigned to that driver?
- Is the current lifecycle status changeable?
- Is the requested event allowed from current status?
- Should cancellation also update booking status?
- Should transition log be appended?

Lifecycle statuses/events include:

- Driver en route.
- Driver arrived.
- Ride started.
- Ride completed.
- Ride cancelled.

Rider live status:

The rider live screen polls lifecycle data and updates automatically when the driver accepts or moves the ride forward.

Pitch line:

The lifecycle engine acts like the ride state machine. It prevents invalid transitions and creates an audit trail of ride events.

## 18. Driver Availability And GPS Flow

Purpose:

Drivers should be able to go online/offline, share current location, choose service zones, and receive warnings if they cannot accept rides.

Frontend:

```text
Driver Availability Screen
    |
    v
useDriverGps()
    |
    v
driverAvailabilityService.updateLocation()
    |
    v
apiClient.private.availability.updateLocation()
```

Backend routes:

```text
GET /api/v1/private/driver-availability/options
GET /api/v1/private/driver-availability/status
PATCH /api/v1/private/driver-availability/status
PATCH /api/v1/private/driver-availability/location
PATCH /api/v1/private/driver-availability/zones
```

Backend flow:

```text
driver-availability.route.js
    |
    v
private auth guard
    |
    v
permission guard
    |
    v
Zod validator
    |
    v
DriverAvailabilityController
    |
    v
DriverAvailabilityService
    |
    v
DriverAvailabilityDao
    |
    v
DriverProfile model
    |
    v
MongoDB driver profile document
```

What service checks before driver goes online:

- Driver account must be active.
- Driver approval must be approved.
- Driver onboarding must be approved.
- Ride requests must be enabled.
- Driver deactivation request must not be pending.
- Current location must be fresh.
- At least one service zone must be active.

Location normalization:

The service converts frontend latitude/longitude into GeoJSON-style MongoDB location:

```text
{
  type: "Point",
  coordinates: [longitude, latitude],
  accuracyMeters,
  headingDegrees,
  speedKmph,
  addressLabel,
  source,
  capturedAt
}
```

Why longitude comes first:

GeoJSON stores coordinates as `[longitude, latitude]`, not `[latitude, longitude]`.

Pitch line:

Driver availability is not just an online toggle. The backend validates approval, onboarding, service zone, ride request controls, and fresh GPS heartbeat before making a driver eligible.

## 19. Real Map And Live Driver Movement Flow

Purpose:

Driver and rider screens should show a live ride map instead of a static fake route.

Current implementation:

- Browser geolocation can capture driver GPS.
- Driver app can send location heartbeats to backend.
- Map layer supports Google Maps when API key is available.
- Leaflet/OpenStreetMap fallback can be used when Google Maps key is not available.
- Active ride map can display pickup, drop-off, route, and driver movement.

Flow:

```text
Browser GPS
    |
    v
useDriverGps()
    |
    v
Driver app location state
    |
    v
activeRideService.syncDriverLocation()
    |
    v
PATCH /api/v1/private/driver-availability/location
    |
    v
DriverAvailabilityService.updateLocation
    |
    v
DriverProfile availability.currentLocation
    |
    v
MongoDB
```

How this helps matching:

When driver availability has a live current location, matching engine can calculate pickup distance and ETA more realistically.

Production improvement:

For real Rapido-like live movement, the next step is WebSocket or Server-Sent Events so rider screen receives driver location updates instantly instead of polling.

## 20. Route Fairness Flow

Purpose:

Riders should know whether the route is reasonable and whether they are being charged fairly for route changes.

Backend:

```text
route-engine.engine.js
    |
    v
buildRoutePlan()
```

Route engine calculates:

- Straight-line distance.
- Route distance.
- Estimated duration.
- Traffic profile.
- Route quality.
- Route alternatives.
- Alternative pickup suggestions.
- Detour ratio.
- Route guidance.

Where riders see it:

- Fare estimate route context.
- Confirm ride trust transparency.
- Live ride route fairness screen.
- History transparency cards.

Pitch line:

Route fairness makes route decisions explainable by comparing estimated route distance, detour ratio, traffic, duration, and route quality instead of only showing a line on a map.

## 21. Trust Engine Flow

Purpose:

Trust engine explains rider and driver reliability.

Backend:

```text
trust-engine.engine.js
    |
    v
buildTrustAssessment()
buildDriverTrustInsights()
buildRideTrustSignals()
buildRideTrustSummary()
```

Trust signals include:

- Overall trust score.
- Safety score.
- Reliability score.
- Payment score.
- Cancellation score.
- Fraud score.
- Driver route fairness score.
- Driver cancellation risk.
- Route accuracy.
- Fair price score.

Driver trust display:

- Trust score.
- Cancellation score.
- Route fairness score.
- Reliability score.
- Improvement tips.

Rider booking display:

- Driver trust score.
- Route fairness.
- Cancellation risk.
- On-time arrival.
- Driver reliability.

Ops display:

- Trust review queue.
- Assign reviewer.
- Add notes.
- Resolve review.
- Compliance cards.

Pitch line:

Trust is treated as a first-class product signal. It is calculated, stored, displayed to users, and reviewed by ops/admin teams.

## 22. Fraud, Safety, And Dispute Flow

Purpose:

Ride platforms need protection against wrong routes, fake trips, payment abuse, suspicious activity, and rider/driver complaints.

Main modules:

```text
core/fraud-engine
private/fraud
public/disputes
private/disputes
public/support
private/notifications
```

Flow:

```text
User reports issue or system flags risk
    |
    v
Fraud/dispute/support API
    |
    v
Controller
    |
    v
Service applies risk/review rules
    |
    v
DAO saves case/ticket/dispute
    |
    v
MongoDB
    |
    v
Ops dashboard queue
```

Rider side:

- Safety/help screen.
- Report issue.
- Fraud/suspicious activity report.
- Dispute history.
- Support tickets.

Driver side:

- Support ticket create.
- Ticket history.
- Notifications.

Ops side:

- Fraud case queue.
- Risk simulation.
- Assign reviewer.
- Confirm/dismiss/resolve case.
- Dispute queue.
- Request evidence.
- Resolve/reject dispute.

Pitch line:

The app does not end at booking. It includes post-ride safety, fraud, dispute, and support workflows so trust issues can be handled operationally.

## 23. Payment And Refund Flow

Purpose:

Rider should understand payments and refunds clearly.

Modules:

```text
public/payments
core/payment-engine
private/earnings
```

Payment engine handles:

- Payment intent preview.
- Refund preview.
- Breakdown of charge/refund impact.

Public payments handle:

- Payment methods.
- Wallet.
- Ride payment.
- Payment history.
- Refund request.

Driver earnings handle:

- Today earnings.
- Weekly summary.
- Ride earnings breakdown.
- Incentives.
- Penalties.
- Payout status.

Pitch line:

Payments are connected to fare transparency, rider receipts, refund workflows, and driver earnings so both sides can understand money movement.

## 24. Notification Flow

Purpose:

System events should reach the correct user through a structured notification workflow.

Modules:

```text
public/notifications
private/notifications
core/notification-engine
```

Notification engine handles:

- Message composition.
- Delivery planning.
- Channel decisions.

Private notifications handle:

- Create notification.
- Send.
- Retry.
- Fail.
- Cancel.
- Dashboard summary.

Public notifications handle:

- Rider inbox.
- Mark read.
- Archive.
- Preferences.
- Device registration.

Driver notifications handle:

- Inbox.
- Notification detail.
- Mark read.
- Support/ride updates.

Pitch line:

Notifications are modeled as a platform workflow, not just frontend alerts. Ops can create, send, retry, fail, or cancel notifications.

## 25. Ops Dashboard Flow

Purpose:

Ops dashboard lets internal users monitor and control the system.

Main areas:

- Overview.
- Ride operations.
- Pricing and surge.
- Trust and safety.
- Fraud and disputes.
- Communications.
- Admin users.
- Analytics.

Auth flow:

```text
Ops/Admin login
    |
    v
apiClient.private.auth.admins or apiClient.private.auth.ops
    |
    v
private auth backend
    |
    v
protected route guard
    |
    v
dashboard screens
```

Ride operations:

```text
Ops dashboard ride queue
    |
    v
private ride-ops APIs
    |
    v
ride ops service
    |
    v
RideBooking model
    |
    v
MongoDB
```

Pricing/surge:

```text
Ops pricing screen
    |
    v
private pricing/surge APIs
    |
    v
pricing/surge services
    |
    v
pricing/surge models
    |
    v
MongoDB
    |
    v
pricing engine simulation
```

Trust/safety:

```text
Ops trust queue
    |
    v
private trust APIs
    |
    v
trust service
    |
    v
trust profile model
    |
    v
MongoDB
```

Fraud/disputes:

```text
Ops fraud/dispute queue
    |
    v
private fraud/dispute APIs
    |
    v
fraud/dispute services
    |
    v
MongoDB
```

Pitch line:

Ops dashboard turns the backend modules into a control panel so internal teams can monitor rides, pricing, trust, fraud, disputes, analytics, and communications.

## 26. Frontend Architecture

Each frontend app follows this pattern:

```text
src/
  app/
  routes/
  layouts/
  services/
  features/
  styles/
  types/
```

Feature folders usually contain:

```text
FeatureScreen.tsx
FeatureScreen.module.css
feature.service.ts
feature.types.ts
useFeature.ts
index.ts
```

What each part does:

- `Screen.tsx`: UI and user interactions.
- `.module.css`: scoped styles.
- `service.ts`: API calls and response mapping.
- `types.ts`: TypeScript types.
- `useFeature.ts`: state management and side effects.
- `index.ts`: feature exports.

## 27. Shared API Client Flow

All frontend apps use `frontend/packages/api-client`.

HTTP client responsibilities:

- Build full URL.
- Add query params.
- Add JSON headers.
- Attach bearer token when available.
- Use `credentials: "include"`.
- Parse JSON response.
- Throw `ApiClientError` when backend returns non-2xx.

API modules:

- `publicApi.ts` maps rider/public backend routes.
- `privateApi.ts` maps driver/admin/ops backend routes.
- `coreApi.ts` maps core engine backend routes.

Example:

```text
apiClient.public.rideBooking.confirmBooking(bookingId)
    |
    v
POST /api/v1/public/ride-booking/bookings/:bookingId/confirm
```

Why this is useful:

Screens do not hardcode URLs everywhere. If backend path changes, developers update one API client method instead of many screens.

## 28. Rider App Flow

Rider app is for passengers.

Main flow:

```text
Register/Login
    |
    v
Home booking form
    |
    v
Fare estimate
    |
    v
Driver matching
    |
    v
Confirm booking
    |
    v
Live ride status
    |
    v
Ride history/receipt/transparency
```

Rider can:

- Register/login/restore session.
- Select pickup and drop-off.
- Choose bike, auto, economy cab, or premium cab.
- Get fare estimate.
- See breakdown and surge.
- Lock fare.
- Search matched drivers.
- Confirm/cancel ride.
- Track lifecycle.
- View route fairness.
- Use safety/help.
- Report issues.
- View history.
- Manage profile, saved addresses, emergency contacts, and preferences.

## 29. Driver App Flow

Driver app is for drivers.

Main flow:

```text
Register/Login
    |
    v
Onboarding
    |
    v
Documents + vehicle details
    |
    v
Availability/GPS
    |
    v
Ride requests
    |
    v
Accept/decline
    |
    v
Active ride lifecycle
    |
    v
Earnings/trust/profile/support
```

Driver can:

- Register/login/restore session.
- Complete onboarding.
- Add profile details.
- Add documents.
- Add vehicle details.
- Go online/offline.
- Share GPS/location.
- Select service zones.
- View warnings.
- View ride requests.
- Accept/decline request.
- Navigate to pickup.
- Mark arrived.
- Start ride.
- Complete ride.
- View earnings.
- View trust profile.
- Manage account/profile.
- Use support and notifications.

## 30. Ops Dashboard Flow

Ops dashboard is for internal admin/ops users.

Main flow:

```text
Admin/Ops login
    |
    v
Protected dashboard
    |
    v
Overview
    |
    v
Ride ops / pricing / surge / trust / fraud / disputes / notifications / analytics
```

Ops/admin can:

- Login and restore session.
- View platform overview.
- Monitor ride queue.
- Inspect ride details.
- Confirm/cancel/reassign ride.
- Manage pricing rules.
- Manage surge rules.
- Run pricing simulations.
- Review trust profiles.
- Review driver documents and vehicles.
- Review fraud cases.
- Handle disputes.
- Send notifications.
- Manage admin users and permissions.
- View analytics.

## 31. Module Wise Backend Flow Summary

### Public Auth

```text
auth route -> auth controller -> auth service -> auth dao -> auth model -> MongoDB
```

Handles rider register/login/refresh/logout/me.

### Public Profile

```text
profile route -> profile controller -> profile service -> profile dao -> profile model -> MongoDB
```

Handles rider profile, preferences, saved addresses, and emergency contacts.

### Public Fare

```text
fare route -> fare controller -> fare service -> fare dao -> fare model -> MongoDB
                                          |
                                          v
                                  pricing engine
                                          |
                                          v
                                   route engine
```

Handles estimates, fare history, and fare lock.

### Public Ride Booking

```text
ride-booking route -> controller -> service -> dao -> RideBooking model -> MongoDB
                                      |
                                      v
                              matching engine
                                      |
                                      v
                                trust engine
```

Handles driver search, booking creation, driver selection, booking confirmation, and cancellation.

### Public Rides

```text
rides route -> rides controller -> rides service -> ride dao/model -> MongoDB
```

Handles current ride, ride history, individual ride, and receipt.

### Public Drivers

```text
drivers route -> drivers controller -> drivers service -> driver dao/model -> MongoDB
                                            |
                                            v
                                      trust engine
```

Handles driver public profile, trust report, route fairness, and cancellation risk.

### Public Payments

```text
payments route -> payments controller -> payments service -> payments dao/model -> MongoDB
                                                |
                                                v
                                           payment engine
```

Handles wallet, payment methods, pay ride, refunds, and payment history.

### Public Disputes

```text
disputes route -> disputes controller -> disputes service -> disputes dao/model -> MongoDB
```

Handles rider dispute creation, evidence, cancel, detail, and history.

### Public Notifications

```text
notifications route -> notifications controller -> notifications service -> notifications dao/model -> MongoDB
```

Handles rider inbox, preferences, read/archive, device registration, and summary.

### Public Support

```text
support route -> support controller -> support service -> support dao/model -> MongoDB
```

Handles FAQs, support tickets, ticket messages, close ticket, and contact.

### Core Pricing Engine

```text
pricing-engine route -> controller -> service/engine -> response
```

Handles quote, compare, and simulation style pricing logic.

### Core Matching Engine

```text
matching-engine route -> controller -> service/engine -> response
```

Handles driver ranking and match explanations.

### Core Route Engine

```text
route-engine route -> controller -> service/engine -> response
```

Handles route plan, distance, duration, traffic, detour, alternatives, and route guidance.

### Core Trust Engine

```text
trust-engine route -> controller -> service/engine -> response
```

Handles trust assessment and driver evaluation.

### Core Ride Lifecycle

```text
ride-lifecycle route -> controller -> service -> dao -> RideBooking model -> MongoDB
```

Handles lifecycle read and transition events.

### Core Fraud Engine

```text
fraud-engine route -> controller -> service/engine -> response
```

Handles risk assessment.

### Core Payment Engine

```text
payment-engine route -> controller -> service/engine -> response
```

Handles payment/refund previews.

### Core Notification Engine

```text
notification-engine route -> controller -> service/engine -> response
```

Handles delivery planning and composition.

### Private Driver

```text
driver route -> driver controller -> driver service -> driver dao -> DriverProfile model -> MongoDB
```

Handles profile, onboarding, account, account controls, and deactivation request.

### Private Driver Documents

```text
driver-documents route -> controller -> service -> dao -> DriverProfile/document model fields -> MongoDB
```

Handles document upsert, delete, submit, review queue, and review action.

### Private Vehicle

```text
vehicle route -> controller -> service -> dao -> DriverProfile/vehicle model fields -> MongoDB
```

Handles vehicle create, update, delete, set primary, submit, review queue, and review action.

### Private Driver Availability

```text
driver-availability route -> controller -> service -> dao -> DriverProfile model -> MongoDB
```

Handles online/offline, location, service zones, and availability blockers.

### Private Ride Ops

```text
ride-ops route -> controller -> service -> dao -> RideBooking model -> MongoDB
```

Handles ops dashboard ride queue, detail, confirm, reassign, cancel, and ops state.

### Private Earnings

```text
earnings route -> controller -> service -> dao -> RideBooking/payment data -> MongoDB
```

Handles driver earnings summary, rides, statements, and simulations.

### Private Pricing

```text
pricing route -> controller -> service -> dao -> PricingRule model -> MongoDB
                                      |
                                      v
                                pricing engine
```

Handles pricing rule CRUD, activate, archive, dashboard, and simulation.

### Private Surge

```text
surge route -> controller -> service -> dao -> SurgeRule model -> MongoDB
                                  |
                                  v
                            pricing engine
```

Handles surge rule CRUD, activate, pause, end, archive, dashboard, and simulation.

### Private Trust

```text
trust route -> controller -> service -> dao -> TrustProfile model -> MongoDB
                                |
                                v
                            trust engine
```

Handles trust queue, profile, reviewer assignment, notes, resolution, and simulation.

### Private Fraud

```text
fraud route -> controller -> service -> dao -> FraudCase model -> MongoDB
                                |
                                v
                            fraud engine
```

Handles fraud queue, case creation, simulation, assign, notes, confirm, dismiss, resolve.

### Private Disputes

```text
disputes route -> controller -> service -> dao -> Dispute model -> MongoDB
```

Handles dispute queue, assign, request evidence, notes, resolve, reject.

### Private Notifications

```text
notifications route -> controller -> service -> dao -> Notification model -> MongoDB
                                            |
                                            v
                                  notification engine
```

Handles notification create, send, retry, fail, cancel, and dashboard.

### Private Admin

```text
admin route -> controller -> service -> dao -> PrivateAuthUser model -> MongoDB
```

Handles admin dashboard, user directory, create user, update profile, update permissions, and update account status.

### Private Analytics

```text
analytics route -> controller -> service -> dao -> multiple models -> MongoDB
```

Handles rides, revenue, drivers, trust-safety breakdowns, forecast, and overview.

## 32. Validation Flow

Good Rapido uses Zod validators through shared middleware.

```text
validate(schema)
    |
    v
schema.parse({ body, params, query })
    |
    v
if invalid -> 400 Validation failed
if valid -> req.body / req.params / req.validatedQuery updated
```

Why this matters:

- Bad data is stopped before service logic.
- Controllers and services can trust payload shape.
- API behavior becomes predictable.

## 33. Error Handling Flow

Errors go through shared error middleware.

```text
route/controller/service throws error
    |
    v
asyncHandler catches async error
    |
    v
errorMiddleware
    |
    v
normalized JSON response
```

Handled examples:

- Invalid JWT -> 401.
- Expired JWT -> 401.
- Mongo duplicate key -> 409.
- Operational AppError -> matching status code.
- Unknown error -> 500 internal server error.

Why this matters:

Frontend receives consistent error messages and can show user-friendly states.

## 34. Security Flow

Shared security middleware handles:

- CORS with allowed origins.
- Cookies.
- Helmet security headers.
- HPP protection.
- Compression.
- JSON request size limit.
- URL encoded request parsing.
- Rate limiting.

Auth security:

- Passwords are hashed.
- Access tokens are short-lived.
- Refresh tokens are hashed in DB.
- Private users have role and permission checks.
- Sensitive fields like password hash and refresh token hash are hidden by default.

Important production note:

The frontend MVP now stores active auth sessions in `sessionStorage` and cleans old localStorage token keys during migration/logout. This is safer than long-lived localStorage tokens because the browser clears sessionStorage with the tab/session. For production, the next step should still be secure `httpOnly`, `SameSite`, `Secure` cookies with refresh rotation and CSRF protection.

## 35. Data Flow Pitch Example

Question:

"What happens when rider clicks Confirm Booking?"

Answer:

When rider clicks confirm booking, the frontend calls `apiClient.public.rideBooking.confirmBooking(bookingId)`. This sends a POST request to `/api/v1/public/ride-booking/bookings/:bookingId/confirm`. The route first verifies rider authentication and validates the booking id. The controller passes `req.auth` and `bookingId` to `RideBookingService.confirmBooking`. The service checks that the booking belongs to the rider, is not cancelled, is not already confirmed, and has not expired. Then the DAO updates the `RideBooking` document in MongoDB using `findOneAndUpdate`. The updated document is converted into a public DTO and returned to the frontend, where the rider sees the confirmed/live ride state.

## 36. Another Pitch Example

Question:

"How do you decide which driver to show?"

Answer:

The matching engine ranks available drivers using multiple signals: vehicle type, service zone, availability, pickup distance, ETA, trust score, route fairness, reliability, and cancellation risk. The service returns not only the selected driver but also match reasons and transparency signals, so the rider can understand why this driver was recommended.

## 37. Another Pitch Example

Question:

"How do you explain fare changes?"

Answer:

The pricing engine breaks the total fare into base fare, distance fare, time fare, minimum fare adjustment, surge, platform fee, and tax. Surge has its own reason such as morning peak, evening peak, or late-night driver availability. The frontend displays these line items and confidence/stability signals, so the rider can see why the final fare is different from a normal fare.

## 38. Another Pitch Example

Question:

"How does route fairness work?"

Answer:

The route engine calculates route distance, straight-line distance, detour ratio, duration, traffic profile, route quality, alternatives, and alternative pickups. These signals become route fairness cards on rider and driver screens. The goal is to make route choice explainable and reduce confusion around detours and fare changes.

## 39. Another Pitch Example

Question:

"Why did you separate public, private, and core modules?"

Answer:

Public modules are customer-facing rider APIs. Private modules are internal or driver/admin/ops APIs with stronger permissions. Core modules are reusable business engines like pricing, matching, route, trust, fraud, payment, notification, and ride lifecycle. This separation makes the system easier to scale because business engines can be reused by public and private workflows without mixing user access rules.

## 40. Current MVP Status And Honest Gaps

Completed or strongly structured:

- Modular Express backend.
- MongoDB and Mongoose models.
- Route/controller/service/DAO/model architecture.
- Public rider APIs.
- Core business engines.
- Private driver/admin/ops APIs.
- Rider app booking and transparency flows.
- Driver app auth, onboarding, availability, GPS, ride request, active ride, earnings, trust, profile, support, and notifications flows.
- Ops dashboard auth, overview, ride ops, pricing/surge, trust/safety, fraud/disputes, communications, admin users, and analytics flows.
- Shared API client package.
- Reusable UI package.
- Documentation and app capability notes.

Important MVP limitations:

- Some flows still use fallback/demo UI when backend permission or data is not available.
- Real-time ride updates currently depend on polling/local state patterns; production should use WebSocket or server events.
- Google Maps requires a billing-enabled API key; Leaflet/OpenStreetMap can be used as fallback.
- Token storage should be hardened for production.
- More integration tests and seed data are needed for full demo reliability.
- Background jobs would be useful for notifications, ride expiry, payouts, and fraud review automation.

## 41. How To Pitch The Architecture In 30 Seconds

Good Rapido is built as a modular full-stack ride-booking platform. The frontend has separate rider, driver, and ops apps sharing a common API client and UI system. The backend is split into public, private, and core modules. Every request follows a clean path: route, validation/auth, controller, service, DAO, Mongoose model, and MongoDB. Core engines handle pricing, matching, route fairness, trust, fraud, payment, notification, and ride lifecycle, so the app can explain fares, driver matches, route choices, trust, and safety decisions instead of hiding them.

## 42. How To Pitch The Architecture In 2 Minutes

Good Rapido is designed around transparency. In normal ride-booking apps, users see a final fare and driver but do not understand why decisions happened. In this app, fare, surge, route, driver matching, trust, safety, fraud, and dispute decisions are separated into clear modules.

On the backend, Express mounts three groups of APIs. Public APIs are for riders, private APIs are for drivers/admin/ops, and core APIs are reusable engines. Each backend module follows the same pattern: the route defines URL and middleware, the validator checks payload, the auth guard checks role/permission, the controller adapts HTTP to service calls, the service applies business rules, the DAO performs database operations, the Mongoose model validates persistence, and MongoDB stores the document.

On the frontend, there are three apps: rider app, driver app, and ops dashboard. They all use a shared API client package, so screens do not hardcode backend paths. Rider app covers booking, fare estimate, driver match, ride confirmation, live ride, safety, history, and profile. Driver app covers onboarding, availability, GPS, ride requests, active ride lifecycle, earnings, trust, profile, and support. Ops dashboard covers monitoring and controlling rides, pricing, surge, fraud, disputes, trust, notifications, analytics, and admin users.

The strongest part of the project is that product decisions are explainable. Fare breakdown explains price. Matching engine explains driver ranking. Route engine explains route fairness. Trust engine explains reliability. Fraud/dispute modules explain review workflows. This makes it more than just a CRUD app.

## 43. Interview Defense Points

If someone asks why controllers are thin:

Answer that controllers only adapt HTTP to application logic. Business logic belongs in services so it can be tested and reused.

If someone asks why DAOs exist:

Answer that DAOs isolate database queries from business rules. This makes service tests cleaner and allows query changes without touching controllers or frontend.

If someone asks why DTOs exist:

Answer that DTOs shape safe public responses and avoid leaking raw MongoDB documents or internal fields.

If someone asks why core engines exist:

Answer that pricing, matching, route, trust, fraud, payment, and notification logic should be reusable by rider, driver, and ops flows. Putting them in core avoids duplication.

If someone asks how MongoDB fits:

Answer that Mongoose models define schema, validation, indexes, unique constraints, and timestamps. DAOs use those models to read/write documents. Services decide when and why data should change.

If someone asks what makes this project unique:

Answer that Good Rapido focuses on explainability: transparent fare breakdown, surge reason, route fairness, driver match reasons, trust signals, and ops workflows for safety/fraud/disputes.

## 44. Simple End-To-End Story

Here is the complete story:

1. Rider registers and logs in.
2. Rider enters pickup/drop-off and selects a vehicle.
3. Rider app calls fare API.
4. Fare service calls pricing engine and route engine.
5. Fare estimate is saved in MongoDB.
6. Rider sees transparent fare breakdown.
7. Rider searches drivers.
8. Ride booking service calls matching engine and trust engine.
9. Rider sees matched driver and trust signals.
10. Rider confirms booking.
11. Booking is saved as a ride document.
12. Driver app shows request to matching driver.
13. Driver accepts and starts lifecycle.
14. Ride lifecycle service validates status transitions.
15. Rider live screen updates ride status.
16. Driver GPS updates availability/location.
17. Route engine explains route fairness.
18. Payment/refund and earnings modules handle money workflow.
19. Safety/fraud/dispute/support modules handle issues.
20. Ops dashboard monitors and controls the platform.

## 45. Best Final Pitch

Good Rapido is not only a ride-booking UI. It is a modular mobility platform prototype. The rider app focuses on transparent booking, fare explanation, driver trust, and safety. The driver app focuses on onboarding, availability, GPS, ride execution, earnings, and compliance. The ops dashboard focuses on ride operations, pricing, surge, trust, fraud, disputes, notifications, analytics, and admin controls. The backend uses a clean route-controller-service-DAO-model architecture with MongoDB, and the business logic is separated into reusable core engines. This makes the project scalable, explainable, and easy to extend.
