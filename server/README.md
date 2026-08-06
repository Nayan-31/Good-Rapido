# Good Rapido Backend

The backend is a modular Express and MongoDB API for the Good Rapido ride-booking platform. It is built as a modular monolith with separate public, private, and core module layers.

Current status: in progress. The backend has broad module coverage and route tests across public, private, and core domains. Ride lifecycle status streaming is available for live rider updates. Production integrations such as real payment providers, maps, SMS/push providers, and GPS/WebSocket movement tracking are still pending.

## Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Zod
- Jest
- Docker Compose for local MongoDB

## Structure

```text
server/
+-- src/
|   +-- app.js
|   +-- config/
|   +-- modules/
|   |   +-- public/
|   |   +-- private/
|   |   +-- core/
|   +-- shared/
+-- docker-compose.yml
+-- package.json
+-- server.js
```

## Module Layers

### Public Modules

Rider and customer-facing APIs:

- `auth`
- `profile`
- `fare`
- `ride-booking`
- `rides`
- `drivers`
- `payments`
- `promos`
- `ratings`
- `disputes`
- `notifications`
- `support`

### Private Modules

Driver, admin, ops, and internal APIs:

- `auth`
- `admin`
- `analytics`
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
- `disputes`
- `notifications`

### Core Modules

Reusable business engines shared by public and private workflows:

- `identity`
- `ride-lifecycle`
- `pricing-engine`
- `matching-engine`
- `route-engine`
- `trust-engine`
- `fraud-engine`
- `payment-engine`
- `notification-engine`

## Standard Request Flow

```text
route -> validator/middleware -> controller -> service -> dao -> model
```

## Standard Module Shape

```text
module/
+-- dto/
+-- interfaces/
+-- validators/
+-- module.constants.js
+-- module.controller.js
+-- module.dao.js
+-- module.model.js
+-- module.route.js
+-- module.service.js
+-- module.route.test.js
```

Some modules do not need every file, for example modules without persistence may not have a model.

## Environment

Common local environment variables:

```text
PORT=3000
MONGO_URL=mongodb://localhost:27017/rapido
NODE_ENV=development
LOGGER_LEVEL=info
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5176
ACCESS_SECRET_TOKEN=local-access-secret-change-me
REFRESH_SECRET_TOKEN=local-refresh-secret-change-me
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

Copy `server/.env.example` when preparing a new local or deployment environment.

Do not commit real secrets.

## Run Locally

Install dependencies:

```bash
npm install
```

Start MongoDB:

```bash
docker compose up -d mongodb
```

Start API:

```bash
npm run dev
```

If `nodemon` is unavailable, use:

```bash
npm start
```

Health check:

```bash
curl http://localhost:3000/health
```

Seed local demo accounts and approved online drivers:

```bash
npm run seed:demo
```

Default demo password:

```text
Password@123
```

Seeded accounts:

```text
Rider: rider@goodrapido.test
Admin: admin@goodrapido.test
Ops: ops@goodrapido.test
Driver: arjun.singh.driver@goodrapido.test
Driver: sahil.khan.driver@goodrapido.test
Driver: imran.ali.driver@goodrapido.test
Driver: rajesh.kumar.driver@goodrapido.test
Driver: neha.das.driver@goodrapido.test
Driver: amit.das.driver@goodrapido.test
```

Existing seeded users are reset to the default password by default so local demo credentials stay predictable. To keep existing passwords unchanged, run:

```bash
GOOD_RAPIDO_DEMO_RESET_PASSWORDS=false npm run seed:demo
```

With the API server running, verify the complete demo handoff:

```bash
npm run smoke:demo
```

The smoke command checks health, rider login, fare estimate, driver search, booking creation, driver request visibility, driver acceptance, rider live lifecycle status, driver arrived/start/complete transitions, rider history, driver earnings, and ops completed ride visibility.

## Tests

Run all backend tests:

```bash
npm test
```

Run a focused module test:

```bash
npm test -- private/auth
```

## Docker And Deployment

Run local API + MongoDB through Docker Compose:

```bash
docker compose up --build
```

The API container uses `npm start` so it does not require `nodemon`.

Full deployment notes are in:

```text
../DEPLOYMENT_GUIDE.md
```

## Current Real Data Notes

- Public auth and private auth are MongoDB-backed.
- Driver auth supports registration, login, refresh, logout, and session profile.
- Core engines expose reusable logic for pricing, matching, ride lifecycle, route fairness, trust, fraud, payment, notification, and identity workflows.
- Some business flows use deterministic engine outputs and mock-like defaults until live providers and production data sources are added.

## Next Work

- Add live map provider integration.
- Add payment gateway integration.
- Add GPS/WebSocket-based vehicle movement tracking.
- Add production notification providers.
- Complete frontend-to-backend binding for remaining rider and driver screens.
