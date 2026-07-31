# Good Rapido App Capabilities

Good Rapido is a full-stack ride-booking platform built around one main idea: every ride should be transparent, fair, and safe for riders, drivers, and operations teams.

The app is divided into three frontend applications and one modular backend.

```text
frontend/apps/rider-app       Passenger ride-booking app
frontend/apps/driver-app      Driver workflow app
frontend/apps/ops-dashboard   Internal admin and operations dashboard
server/                       Backend API and business modules
```

## What The Platform Can Do

Good Rapido can support the complete ride-booking journey:

- User authentication and session handling.
- Pickup and drop-off selection.
- Fare estimate with transparent price breakdown.
- Surge pricing explanation.
- Driver matching and ride confirmation flow.
- Live ride and route fairness flow.
- Safety, help, fraud reporting, and dispute handling.
- Payment and refund workflow structure.
- Rider history and profile transparency.
- Driver onboarding, availability, ride handling, earnings, trust, and profile workflows.
- Admin and ops dashboard for monitoring rides, pricing, surge, fraud, disputes, notifications, trust, and platform health.

## Rider App

The rider app is for passengers who want to book and track rides.

Riders can:

- Register, log in, and restore sessions.
- Select pickup and drop-off locations.
- Choose ride options such as bike, auto, economy cab, and premium cab.
- Get a fare estimate before booking.
- View fare breakdown including base fare, distance fare, time fare, surge, fees, and tax.
- Understand why surge pricing is applied.
- See fare confidence and price stability signals.
- Confirm a ride with matched driver details.
- Review driver trust signals before booking.
- View route fairness and route accuracy information.
- Access safety and help flows.
- Report ride issues or suspicious activity.
- View ride history with fare transparency cards.
- Manage rider profile, saved addresses, emergency contacts, and preferences.

## Driver App

The driver app is for drivers who accept and complete rides.

Drivers can:

- Register and log in with private driver authentication.
- Store access and refresh tokens locally.
- Restore session after page refresh.
- Log out safely.
- Complete onboarding flow structure.
- Fill profile setup information.
- Submit document upload details.
- Submit vehicle details.
- View approval status.
- Go online or offline.
- Share current location status.
- Select service zones.
- View availability warnings.
- Review incoming ride requests.
- See fare preview and pickup route summary.
- Accept or decline ride requests.
- Follow active ride lifecycle steps:
  - navigate to pickup
  - mark arrived
  - start ride
  - complete ride
- View route fairness and detour warnings.
- View earnings summary, ride earnings, incentives, penalties, and payout status.
- View trust score, reliability score, cancellation score, and improvement tips.
- View notifications and support flows.
- Manage profile, vehicle info, document status, account settings, and logout.

## Ops Dashboard

The ops dashboard is for internal admin and operations users.

Ops/admin users can:

- Log in as admin or ops user.
- Restore session with saved tokens.
- Refresh session.
- Log out.
- View platform overview and health cards.
- Monitor ride queues.
- Filter rides by status, priority, and issue state.
- Open ride detail drawer.
- Confirm rides.
- Reassign drivers.
- Cancel rides.
- Update ops state.
- Review lifecycle exceptions.
- Manage pricing rules.
- Manage surge rules.
- Activate, pause, end, or archive rules.
- Run pricing and surge simulations.
- Preview transparent fare impact.
- Review trust and safety queues.
- Review driver documents.
- Review vehicle submissions.
- Assign reviewers.
- Add notes.
- Resolve trust and safety reviews.
- Investigate fraud cases.
- Run fraud risk simulation.
- Confirm, dismiss, or resolve fraud cases.
- Review disputes.
- Request evidence.
- Resolve or reject disputes.
- Operate notification list and detail views.
- Create notifications.
- Send, retry, fail, or cancel notifications.
- View support ticket summary.
- Prepare incident broadcast messages.

Admin user management and advanced analytics are implemented in separate feature branches and should be merged into `develop` when ready.

## Backend Capabilities

The backend is a modular Express and MongoDB API.

It supports:

- Public rider APIs.
- Private driver/admin/ops APIs.
- Core business engines.
- MongoDB-backed authentication.
- JWT access and refresh token flow.
- Zod request validation.
- Controller, service, DAO, DTO, validator, route, and test structure.
- Route-level Jest tests.

Backend module layers:

```text
server/src/modules/public   Rider and customer-facing APIs
server/src/modules/private  Driver, admin, and ops APIs
server/src/modules/core     Shared business engines
```

Important backend modules:

- `identity`
- `ride-lifecycle`
- `pricing-engine`
- `matching-engine`
- `route-engine`
- `trust-engine`
- `fraud-engine`
- `payment-engine`
- `notification-engine`
- `auth`
- `profile`
- `fare`
- `ride-booking`
- `payments`
- `disputes`
- `support`
- `driver`
- `driver-availability`
- `driver-documents`
- `vehicle`
- `ride-ops`
- `pricing`
- `surge`
- `trust`
- `fraud`
- `earnings`
- `notifications`
- `admin`
- `analytics`

## Transparency Features

Good Rapido focuses heavily on transparency.

The app explains:

- Why the fare changed.
- Which fare components were added.
- Whether surge pricing is active.
- Why a driver was matched.
- Whether the route is fair.
- Whether the driver has strong trust signals.
- Whether there are cancellation or fraud risks.
- Whether a payment, refund, or dispute needs review.

## Safety And Trust Features

The platform includes safety and trust workflows for riders, drivers, and ops teams.

It supports:

- Driver trust profile.
- Cancellation risk indicators.
- Route fairness checks.
- Fraud case review.
- Dispute review.
- Safety and help center flow.
- Emergency contact structure.
- Support ticket flow.
- Notification and incident broadcast structure.

## Current Status

Current stable status:

- Backend module coverage is strong.
- Backend tests are passing.
- Rider app has MVP booking, fare, ride, safety, history, and profile flows.
- Driver app has real authentication and complete UI-first workflow coverage.
- Ops dashboard has auth, overview, ride operations, pricing/surge, trust-safety, fraud-disputes, and communications connected.
- Shared API client and UI package are available.

Still pending for production readiness:

- Live map provider integration.
- Payment gateway integration.
- Real SMS, push, and email providers.
- WebSocket-based live ride tracking.
- Final real-data binding for some rider and driver screens.
- Deployment setup and production environment hardening.

## How To Test The Whole App

Use this flow to test the full Good Rapido project locally.

### 1. Start MongoDB

From the repo root:

```bash
cd server
docker compose up -d mongodb
```

If MongoDB is already running locally, make sure the backend can connect to:

```text
mongodb://localhost:27017/rapido
```

### 2. Install Dependencies

Backend:

```bash
cd server
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 3. Configure Environment

Backend `.env` should include:

```text
PORT=3000
MONGO_URL=mongodb://localhost:27017/rapido
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5176
ACCESS_SECRET_TOKEN=local-access-secret-change-me
REFRESH_SECRET_TOKEN=local-refresh-secret-change-me
```

Frontend app `.env.local` files should include:

```text
VITE_API_BASE_URL=http://localhost:3000
```

### 4. Start Backend

From `server/`:

```bash
npm run dev
```

Check backend health:

```bash
curl http://localhost:3000/health
```

### 5. Seed Private Users

From the repo root:

```bash
npm --prefix server run seed:private-auth
```

Default local credentials:

```text
Admin: admin@goodrapido.test / Password@123
Ops: ops@goodrapido.test / Password@123

Driver test accounts:
arjun.driver@goodrapido.test / Password@123
sahil.driver@goodrapido.test / Password@123
imran.driver@goodrapido.test / Password@123
rajesh.driver@goodrapido.test / Password@123
neha.driver@goodrapido.test / Password@123
amit.driver@goodrapido.test / Password@123
```

### 6. Start Frontend Apps

Run each app in a separate terminal.

Rider app:

```bash
cd frontend
npm run dev:rider
```

Default URL:

```text
http://localhost:5173
```

Driver app:

```bash
cd frontend
npm run dev:driver
```

Default URL:

```text
http://localhost:5174
```

Ops dashboard:

```bash
cd frontend
npm run dev:ops
```

Default URL:

```text
http://localhost:5176
```

### 7. Manual Rider App Test

Open the rider app and test:

- Register or log in.
- Select pickup and drop-off.
- Choose a ride type.
- Generate fare estimate.
- Review fare breakdown and surge transparency.
- Continue to confirm ride flow.
- Check route fairness, safety, history, notification, and profile screens.

Expected result:

- UI should load without blank screens.
- Auth/session should work where backend integration is complete.
- Fare, safety, history, and profile screens should show the expected flow.

### 8. Manual Driver App Test

Open the driver app and test:

- Register a driver account.
- Log in as driver.
- Refresh the browser and confirm session restore.
- Log out and log back in.
- Open onboarding, availability, ride requests, active ride, earnings, trust, alerts, profile, and support routes.
- To see actual incoming requests, create a rider booking for a ride type, then log in as the matched seeded driver shown on the rider confirm screen.

Expected result:

- Driver auth should use real backend and MongoDB.
- Token storage and session restore should work.
- Workflow screens should load and show the planned driver flow.

### 9. Manual Ops Dashboard Test

Open the ops dashboard and test:

- Log in as admin or ops user.
- Refresh the browser and confirm session restore.
- Check overview dashboard.
- Check ride operations queue and ride detail flow.
- Test pricing and surge screens.
- Review trust-safety, fraud-disputes, and communications screens.
- Log out.

Expected result:

- Admin/ops auth should work with seeded users.
- Protected routes should redirect to login when logged out.
- Connected ops modules should load backend data or show clear loading/error states.

### 10. Automated Backend Test

From the repo root:

```bash
npm --prefix server test
```

Expected result:

```text
All backend Jest tests should pass.
```

### 11. Automated Frontend Typecheck

From the repo root:

```bash
npm --prefix frontend run typecheck:rider
npm --prefix frontend run typecheck:driver
npm --prefix frontend run typecheck:ops
npm --prefix frontend run typecheck:api-client
```

Expected result:

```text
All TypeScript checks should pass.
```

### 12. Automated Frontend Build

From the repo root:

```bash
npm --prefix frontend run build:rider
npm --prefix frontend run build:driver
npm --prefix frontend run build:ops
```

Expected result:

```text
All frontend apps should create production builds successfully.
```

### 13. Final Smoke Checklist

Before sharing the project, confirm:

- Backend health endpoint works.
- MongoDB is connected.
- Rider app opens.
- Driver app opens.
- Ops dashboard opens.
- Driver registration works.
- Driver login works.
- Admin/ops login works after seeding.
- Browser refresh keeps valid sessions.
- Logout clears sessions.
- Backend tests pass.
- Frontend typechecks pass.
- Frontend builds pass.

## Verification Status

Latest local checks passed:

- Rider frontend typecheck.
- Driver frontend typecheck.
- Ops dashboard typecheck.
- Shared API client typecheck.
- Rider frontend production build.
- Driver frontend production build.
- Ops dashboard production build.
- Full backend Jest test suite.

Backend test coverage currently passes with:

```text
36 test suites
356 tests
```
