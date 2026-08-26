# Good Rapido Demo Script

This file is a step-by-step script for explaining and testing Good Rapido.

Use this when you need to show the project to a mentor, interviewer, recruiter, or friend.

## 1. Demo Goal

The goal of the demo is not to show every screen.

The goal is to prove the main story:

```text
A rider can book a transparent ride.
A matched driver can accept and complete it.
The rider can see lifecycle updates.
Driver earnings update after completion.
Ops dashboard can see the completed ride.
```

If this story works, the project feels real.

## 2. What To Say Before Starting

Say this:

```text
Good Rapido is a full-stack ride-booking MVP focused on transparency. The project has a Node.js, Express, MongoDB backend and three React TypeScript frontend apps: rider app, driver app, and ops dashboard.

The main idea is that riders should understand fare changes, surge, driver matching, route fairness, and safety signals instead of seeing hidden decisions.
```

Then say:

```text
I will show the complete flow from rider booking to driver completion, and then verify that rider history, driver earnings, and ops dashboard are updated.
```

## 3. Demo Setup Commands

Open terminal at project root.

For a fresh machine, check `DEPLOYMENT_GUIDE.md` and copy the relevant `.env.example` files before starting the apps.

### Install backend dependencies

```bash
npm --prefix server install
```

Why:

Backend needs Express, Mongoose, JWT, Zod, Jest, and other packages.

### Install frontend dependencies

```bash
npm --prefix frontend install
```

Why:

Frontend needs React, Vite, TypeScript, shared UI package, and shared API client.

### Start MongoDB

```bash
cd server
docker compose up -d mongodb
```

Why:

MongoDB stores users, driver profiles, fare estimates, ride bookings, trust profiles, and other data.

If MongoDB is already running locally, this may not be needed.

### Seed demo data

From repo root:

```bash
npm --prefix server run seed:demo
```

Why:

This cleans previous demo operational records, then creates known demo accounts, approved online drivers, known locations, ride records, payments, notifications, fraud/dispute examples, support tickets, and earnings-ready completed rides.

Without this, you may face:

- Too many registrations.
- Unknown passwords.
- Drivers not approved.
- Drivers not online.
- Driver request screen showing empty data because no stable assigned ride exists.
- Rider, driver, and ops screens depending on random/manual data.

Seeded password:

```text
Password@123
```

Seeded accounts:

```text
Rider: rider@goodrapido.test
Ops: ops@goodrapido.test
Admin: admin@goodrapido.test
Driver: arjun.singh.driver@goodrapido.test
Driver: sahil.khan.driver@goodrapido.test
Driver: imran.ali.driver@goodrapido.test
Driver: rajesh.kumar.driver@goodrapido.test
Driver: neha.das.driver@goodrapido.test
Driver: amit.das.driver@goodrapido.test
```

Seeded known locations:

```text
Muri
Silli
Ranchi
Howrah Bridge
Park Street
Connaught Place
India Gate
Noida
Mumbai
```

Seeded rides:

```text
GR-DEMO-PENDING-MURI-SILLI
Muri -> Silli
Assigned driver: Arjun Singh
Use this for rider-to-driver request handoff.

GR-DEMO-COMPLETE-KOL-001
Howrah Bridge -> Park Street
Assigned driver: Imran Ali
Use this for rider history, payment receipt, and driver earnings.

GR-DEMO-DISPUTE-NCR-001
Connaught Place -> Noida
Assigned driver: Rajesh Kumar
Use this for fraud, dispute, support, and ops review.
```

Seeded operational records:

```text
Payments: 2
Disputes: 1
Fraud cases: 1
Notifications: 4
Support tickets: 1
```

Important demo flags:

```text
VITE_USE_DEMO_RIDE_REQUESTS=false
VITE_USE_DEMO_DRIVER_DATA=false
```

Keep both disabled for the real backend demo. Enable them only when you intentionally want screenshot fallback data.

### Start backend

From repo root:

```bash
npm --prefix server run dev
```

Expected backend URL:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "success": true,
  "message": "Good Rapido API is healthy"
}
```

Why:

This proves the API server is running.

### Start rider app

Open another terminal:

```bash
npm --prefix frontend run dev:rider
```

Expected URL:

```text
http://localhost:5173
```

### Start driver app

Open another terminal:

```bash
npm --prefix frontend run dev:driver
```

Expected URL:

```text
http://localhost:5174
```

### Start ops dashboard

Open another terminal:

```bash
npm --prefix frontend run dev:ops
```

Expected URL:

```text
http://localhost:5176
```

## 4. Automated Demo Check

Before manual demo, run the backend API smoke flow:

```bash
npm --prefix server run smoke:demo
```

Why:

This automatically checks the most important backend journey.

It verifies:

```text
health
rider login
fare estimate
driver search
booking create
driver request visibility
driver accept
rider sees driver_en_route
driver arrived
ride started
ride completed
rider current ride closes
rider history updates
driver earnings updates
ops completed ride visibility
```

If this passes, your core demo story is working.

Then run the browser E2E demo smoke flow:

```bash
npm --prefix frontend run e2e:demo
```

Why:

This checks the same story through real browser screens, not only direct API calls.

It uses Playwright to start isolated local demo servers:

```text
API: http://127.0.0.1:3100
Rider app: http://127.0.0.1:5273
Driver app: http://127.0.0.1:5274
Ops dashboard: http://127.0.0.1:5275
```

It verifies:

```text
rider register screen is reachable
rider seeded login works
rider selects pickup Muri
rider selects dropoff Silli
rider gets fare estimate
rider confirms booking with Arjun Singh
driver seeded login works
driver sees the same booking code and same Muri -> Silli request
driver accepts request
rider live status changes to driver_en_route
driver marks arrived
driver starts ride
driver completes ride
rider history shows Muri to Silli as completed
driver earnings show the completed booking
ops ride operations shows the completed ride
```

If you want to watch the browser while it runs:

```bash
npm --prefix frontend run e2e:demo:headed
```

## 5. Manual Demo Flow

Use this exact flow.

### Step 1: Open Rider App

Open:

```text
http://localhost:5173
```

Login with:

```text
rider@goodrapido.test
Password@123
```

What to say:

```text
This is the rider-facing app. Riders can select pickup and dropoff, choose vehicle type, view transparent fare estimates, and confirm a ride.
```

Why this matters:

Rider app proves the customer journey.

### Step 2: Select Pickup And Dropoff

Use simple values:

```text
Pickup: Howrah Bridge
Dropoff: Park Street
Vehicle: Bike
```

What to say:

```text
The rider gives pickup, dropoff, and ride type. This data goes to the fare estimate flow.
```

Backend idea:

```text
pickup/dropoff/vehicle type -> fare estimate API -> pricing engine
```

### Step 3: Get Fare Estimate

Click fare estimate CTA.

Show:

- Total fare.
- Base fare.
- Distance fare.
- Time fare.
- Surge fare.
- Platform fee.
- Tax.
- Confidence score.
- Surge explanation.

What to say:

```text
The fare estimate is transparent. The rider can see not only the total fare, but also why the fare was calculated.
```

Why this matters:

Most ride apps show only final price.

Good Rapido shows the reason behind the price.

Backend flow:

```text
POST /api/v1/public/fare/estimate
-> fare route
-> validator
-> controller
-> service
-> pricing engine
-> DAO
-> MongoDB
-> response DTO
```

### Step 4: Continue To Confirm Ride

Open confirm ride flow.

Show:

- Matched driver.
- Driver rating.
- Vehicle details.
- Trust signals.
- Route fairness.
- Fare lock/booking summary.

What to say:

```text
Driver matching is not random. The matching engine ranks drivers using trust, ETA, reliability, route fairness, cancellation risk, and pickup distance.
```

Why this matters:

Rider should know why a specific driver was selected.

Backend flow:

```text
POST /api/v1/public/ride-booking/search
-> ride booking service
-> fare DAO checks estimate
-> matching engine ranks drivers
-> trust engine builds trust summary
-> response returns driver options
```

### Step 5: Confirm Booking

Click confirm booking.

What to say:

```text
At this point, the booking is created and saved in MongoDB with pickup, dropoff, fare snapshot, selected driver, and trust signals.
```

Why fare snapshot matters:

If fare changes later, we still know what rider accepted at booking time.

Backend flow:

```text
POST /api/v1/public/ride-booking/bookings
-> booking service
-> creates bookingCode
-> saves selectedDriver
-> saves fareSnapshot
-> saves trustSignals
-> MongoDB public_ride_bookings
```

Expected status:

```text
driver_selected
```

This means:

```text
Rider selected a driver, but driver has not accepted yet.
```

### Step 6: Open Driver App

Open:

```text
http://localhost:5174
```

Login with the matched driver shown on rider screen.

For bike demo, usually:

```text
arjun.singh.driver@goodrapido.test
Password@123
```

If the rider selected Bike and used Muri -> Silli, Arjun Singh is the expected seeded driver.

What to say:

```text
This is the driver app. The driver can see assigned incoming ride requests, fare preview, pickup/dropoff, route summary, and rider trust signals.
```

Why this matters:

The driver should see real rider booking data or the seeded pending Muri -> Silli request, not fake fallback data.

Expected:

```text
Pickup should match rider pickup.
Dropoff should match rider dropoff.
```

### Step 7: Driver Accepts Ride

Click accept ride.

What to say:

```text
Driver acceptance changes the booking status from driver_selected to confirmed.
```

Backend flow:

```text
POST /api/v1/private/ride-ops/rides/:rideId/confirm
-> private auth guard
-> ride ops controller
-> ride ops service
-> ride ops DAO
-> MongoDB booking status confirmed
```

Expected rider status:

```text
driver_en_route
```

The rider live ride screen first tries the backend lifecycle stream. If the stream is connected, this status can update automatically after the driver accepts. If streaming is unavailable, periodic refresh fallback still updates the ride.

Why this matters:

This proves rider and driver apps are connected through backend data.

### Step 8: Driver Active Ride

Go to active ride screen.

Show:

- Pickup.
- Dropoff.
- Lifecycle status.
- Route fairness.
- Detour warning.
- Next driver action.

What to say:

```text
The active ride screen guides the driver step by step. It does not let the flow jump randomly.
```

Why:

Ride lifecycle must be controlled.

Bad flow example:

```text
Complete ride before starting ride
```

Good flow:

```text
driver_en_route -> driver_arrived -> in_progress -> completed
```

### Step 9: Mark Arrived

Click mark arrived.

Expected status:

```text
driver_arrived
```

What to say:

```text
This means driver reached pickup. The lifecycle event is saved in MongoDB.
```

Backend flow:

```text
POST /api/v1/core/ride-lifecycle/rides/:rideId/events
event: driver_arrived
```

### Step 10: Start Ride

Click start ride.

Expected status:

```text
in_progress
```

What to say:

```text
This means rider boarded and trip has started. Route fairness and ride tracking can now be monitored.
```

Backend event:

```text
ride_started
```

### Step 11: Complete Ride

Click complete ride.

Expected status:

```text
completed
```

What to say:

```text
This closes the lifecycle. The completed event is saved and downstream screens like rider history, driver earnings, and ops dashboard can reflect the completed ride.
```

Backend event:

```text
ride_completed
```

## 6. After Completion Checks

### Check Rider Current Ride

After completion:

```text
Rider current ride should close.
```

Meaning:

```text
GET /api/v1/public/rides/current
returns ride: null
```

Why:

Completed ride is not active anymore.

### Check Rider History

Open rider history.

Expected:

```text
Completed ride should appear in history.
```

Why:

Rider should be able to review fare and trust transparency after trip.

### Check Driver Earnings

Open driver earnings.

Expected:

```text
Completed ride should appear in earnings.
```

What to say:

```text
Driver earnings are calculated from the completed ride fare snapshot. The backend calculates gross fare, platform fee, driver fare, incentives, deductions, and net earning.
```

Why:

Driver needs clear earning transparency.

### Check Ops Dashboard

Open:

```text
http://localhost:5176
```

Login:

```text
ops@goodrapido.test
Password@123
```

Expected:

```text
Completed ride should be visible in ops ride queue/dashboard.
```

What to say:

```text
Ops dashboard helps internal teams monitor ride state, risk, pricing, trust, fraud, and operational issues.
```

## 7. Backend Explanation During Demo

If someone asks how backend works, say:

```text
The backend follows a route-controller-service-DAO-model structure.
```

Then explain with simple example:

```text
Route is the entry point.
Controller receives request.
Service contains business logic.
DAO talks to database.
Model defines MongoDB shape.
DTO returns clean response.
```

For fare:

```text
fare route -> fare controller -> fare service -> pricing engine -> fare DAO -> fare model -> MongoDB
```

For booking:

```text
ride-booking route -> controller -> service -> DAO -> booking model -> MongoDB
```

For lifecycle:

```text
ride-lifecycle route -> controller -> service -> lifecycle engine -> DAO -> booking model -> MongoDB
```

For earnings:

```text
earnings route -> controller -> service -> DAO -> ride booking/payment models -> MongoDB
```

## 8. Important Things To Mention

Mention these confidently:

```text
The backend has public, private, and core modules.
```

Explain:

```text
Public modules are for riders.
Private modules are for drivers/admin/ops.
Core modules are reusable business engines.
```

Mention:

```text
The project uses MongoDB with Mongoose models.
```

Explain:

```text
Mongoose models define how data is stored, and DAOs use those models to read/write data.
```

Mention:

```text
I added seed data and smoke testing.
```

Explain:

```text
Seed data makes demo accounts predictable. Smoke testing verifies the most important real API journey from booking to completed ride.
```

## 9. If Someone Asks What Is Real And What Is Pending

Say this:

```text
The core backend modules, authentication, fare estimate, booking, driver request, ride lifecycle, earnings, and ops visibility are implemented and verified through tests and smoke flow.
```

Then say:

```text
For production, live payment credentials and webhook verification, Google Maps billing/API activation, dedicated WebSocket infrastructure, push/SMS/email providers, and final deployment hardening are still pending.
```

This answer is honest and professional.

Do not say:

```text
Everything is production ready.
```

Say:

```text
It is a full-stack MVP with production-style architecture and verified core flows.
```

## 10. Common Interview Questions

### What problem does Good Rapido solve?

Answer:

```text
It solves transparency problems in ride booking. Riders can see why fare changed, why surge applied, why a driver was matched, and how route/trust signals affect the ride.
```

### Why did you use separate rider, driver, and ops apps?

Answer:

```text
Each user has a different job. Rider books rides, driver completes rides, and ops monitors the platform. Separate apps keep each flow simple and focused.
```

### Why did you use core engines?

Answer:

```text
Core engines keep reusable business logic separate from API workflow. Pricing, matching, lifecycle, trust, fraud, payment, and notification logic can be reused by multiple modules.
```

### What is your strongest implemented flow?

Answer:

```text
The strongest verified flow is rider booking to completed ride. It covers rider login, fare estimate, driver matching, booking, driver acceptance, lifecycle transitions, rider history, driver earnings, and ops dashboard visibility.
```

### How do you know the flow works?

Answer:

```text
I added two smoke checks. The backend API smoke test verifies the complete journey through real HTTP APIs. The Playwright browser smoke test verifies the same journey through actual rider, driver, and ops screens.
```

### What was a bug you fixed?

Answer:

```text
One issue was driver identity mismatch. Rider booking stored driver ids like drv_bike_arjun, while private driver profiles could use codes like DRV-BIKE-ARJUN. I fixed earnings and ride-related lookup logic by normalizing driver identifiers and also allowing driver name matching.
```

### What is still pending?

Answer:

```text
Production integrations are pending: live payment credentials and webhook verification, Google Maps billing/API activation, dedicated WebSocket infrastructure, push/SMS/email providers, deployment hardening, and broader browser E2E coverage for edge cases.
```

## 11. Final Demo Checklist

Before showing the project, run:

```bash
npm --prefix server run seed:demo
npm --prefix server test
npm --prefix frontend run typecheck:rider
npm --prefix frontend run typecheck:driver
npm --prefix frontend run typecheck:ops
npm --prefix frontend run typecheck:api-client
npm --prefix frontend run build:rider
npm --prefix frontend run build:driver
npm --prefix frontend run build:ops
```

Then start backend:

```bash
npm --prefix server run dev
```

Then run smoke:

```bash
npm --prefix server run smoke:demo
npm --prefix frontend run e2e:demo
```

Expected:

```text
Demo smoke flow passed.
1 browser demo smoke test passed.
```

Then start frontend apps:

```bash
npm --prefix frontend run dev:rider
npm --prefix frontend run dev:driver
npm --prefix frontend run dev:ops
```

## 12. Final Confidence Notes

You do not need to explain every file.

You need to explain the system clearly.

Remember this:

```text
Rider wants transparency.
Driver wants clear workflow and earnings.
Ops wants monitoring and control.
Backend modules connect everything.
Core engines hold reusable business rules.
Smoke test proves the main flow.
```

That is enough to pitch the project confidently.
