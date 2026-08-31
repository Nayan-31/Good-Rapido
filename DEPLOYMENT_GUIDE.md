# Good Rapido Deployment Guide

This guide explains how to prepare Good Rapido for local demo deployment and cloud deployment.

Good Rapido has four deployable parts:

```text
server/                       Backend API
frontend/apps/rider-app       Rider frontend
frontend/apps/driver-app      Driver frontend
frontend/apps/ops-dashboard   Ops/admin frontend
```

MongoDB is required by the backend.

## 1. What Is Deployable Now

The demo-ready MVP can deploy with:

- Node.js backend API.
- MongoDB database.
- Static frontend builds for rider, driver, and ops apps.
- Demo seed data for known rider, driver, admin, and ops accounts.
- Smoke test for rider booking to driver completion and ops visibility.

Still pending for production:

- Live Razorpay/Stripe credentials and payment-provider verification.
- Live Google billing/API-key verification for Places and driver maps.
- Real SMS, push, and email providers.
- Production monitoring and log aggregation.
- Production httpOnly cookie auth.

## 2. Backend Environment

Use `.env.example` or `server/.env.example` as the template.

Environment priority is:

```text
1. Shell/CI/hosting platform variables
2. server/.env
3. root .env
4. code defaults
```

This means a cloud provider or test runner can safely override local `.env` values such as `PORT` and `MONGO_URL`.

Important backend variables:

```text
PORT=3000
MONGO_URL=mongodb://localhost:27017/rapido
NODE_ENV=production
LOGGER_LEVEL=info
CORS_ORIGIN=https://your-rider-app.com,https://your-driver-app.com,https://your-ops-dashboard.com
ACCESS_SECRET_TOKEN=replace-with-a-long-random-access-secret
REFRESH_SECRET_TOKEN=replace-with-a-long-random-refresh-secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
PAYMENT_GATEWAY_PROVIDER=mock
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT=https://places.googleapis.com/v1/places:autocomplete
GOOGLE_PLACES_DETAILS_ENDPOINT=https://places.googleapis.com/v1/places
GOOGLE_MAPS_SEARCH_COUNTRY=IN
```

Why these matter:

- `MONGO_URL` tells backend where MongoDB is.
- `CORS_ORIGIN` tells backend which frontend URLs can call it.
- `ACCESS_SECRET_TOKEN` signs short-lived access tokens.
- `REFRESH_SECRET_TOKEN` signs refresh tokens.
- `PAYMENT_GATEWAY_PROVIDER` controls `mock`, `razorpay`, or `stripe` payment behavior.
- `GOOGLE_MAPS_API_KEY` enables Google Places location search on the backend. If it is empty, known demo locations are still supported.

Local backend config:

```text
NODE_ENV=development
MONGO_URL=mongodb://localhost:27017/rapido
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5176
PAYMENT_GATEWAY_PROVIDER=mock
```

Production backend config:

```text
NODE_ENV=production
MONGO_URL=<hosted MongoDB connection string>
CORS_ORIGIN=<rider URL>,<driver URL>,<ops URL>
ACCESS_SECRET_TOKEN=<long random secret>
REFRESH_SECRET_TOKEN=<long random secret>
```

Do not commit real secrets.

## 3. Frontend Environment

Each frontend app needs the backend URL.

```text
VITE_API_BASE_URL=https://your-backend-api.com
```

Driver app optional map variable:

```text
VITE_GOOGLE_MAPS_API_KEY=
```

Driver demo fallback variables:

```text
VITE_USE_DEMO_RIDE_REQUESTS=false
VITE_USE_DEMO_DRIVER_DATA=false
```

Local examples are available at:

```text
frontend/apps/rider-app/.env.example
frontend/apps/driver-app/.env.example
frontend/apps/ops-dashboard/.env.example
```

Why this matters:

Vite reads `VITE_API_BASE_URL` at build time. If this value points to localhost during production build, the deployed frontend will try to call localhost instead of the deployed backend.

Use this local setup:

```text
Rider VITE_API_BASE_URL=http://localhost:3000
Driver VITE_API_BASE_URL=http://localhost:3000
Ops VITE_API_BASE_URL=http://localhost:3000
```

Use this production setup:

```text
Rider VITE_API_BASE_URL=https://your-api.example.com
Driver VITE_API_BASE_URL=https://your-api.example.com
Ops VITE_API_BASE_URL=https://your-api.example.com
```

Keep demo fallback variables disabled in production.

## 4. CORS Setup

Backend CORS is controlled by `CORS_ORIGIN`.

Local:

```text
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5176
```

Production:

```text
CORS_ORIGIN=https://your-rider-app.com,https://your-driver-app.com,https://your-ops-dashboard.com
```

After frontend deployment, update `CORS_ORIGIN` with the final deployed URLs and restart the backend. Avoid `*` in production because the apps use credentialed requests and bearer tokens.

## 5. Local Docker Backend

From `server/`:

```bash
docker compose up --build
```

This starts:

- `api` on `http://localhost:3000`
- `mongodb` on `mongodb://localhost:27017/rapido`

Health check:

```bash
curl http://localhost:3000/health
```

The API container uses `npm start`, not `npm run dev`, so it does not depend on `nodemon`.

## 6. Local Full Demo

From repo root:

```bash
npm --prefix server install
npm --prefix frontend install
npm --prefix server run seed:demo
npm --prefix server run smoke:demo
```

Frontend dev servers:

```bash
npm --prefix frontend run dev:rider
npm --prefix frontend run dev:driver
npm --prefix frontend run dev:ops
```

Default local URLs:

```text
Backend: http://localhost:3000
Rider:   http://localhost:5173
Driver:  http://localhost:5174
Ops:     http://localhost:5176
```

## 7. Test And Smoke Commands

Backend tests:

```bash
npm --prefix server test
```

Backend demo smoke flow:

```bash
npm --prefix server run smoke:demo
```

Frontend typechecks:

```bash
npm --prefix frontend run typecheck:rider
npm --prefix frontend run typecheck:driver
npm --prefix frontend run typecheck:ops
npm --prefix frontend run typecheck:api-client
```

Frontend browser E2E demo smoke:

```bash
npm --prefix frontend exec -- playwright install chromium
npm --prefix frontend run e2e:demo
```

Headed browser E2E:

```bash
npm --prefix frontend run e2e:demo:headed
```

## 8. Production Build Commands

Backend:

```bash
npm --prefix server install
npm --prefix server start
```

Rider app:

```bash
npm --prefix frontend run build:rider
```

Build output:

```text
frontend/apps/rider-app/dist
```

Driver app:

```bash
npm --prefix frontend run build:driver
```

Build output:

```text
frontend/apps/driver-app/dist
```

Ops dashboard:

```bash
npm --prefix frontend run build:ops
```

Build output:

```text
frontend/apps/ops-dashboard/dist
```

## 9. Provider Credential Checklist

MongoDB:

- Create a MongoDB Atlas, Railway MongoDB, or self-hosted MongoDB database.
- Put the connection string in `MONGO_URL`.
- Run the backend health check after deployment.

JWT/auth:

- Generate long random values for `ACCESS_SECRET_TOKEN` and `REFRESH_SECRET_TOKEN`.
- Do not reuse local demo secrets in production.

Payments:

- Use `PAYMENT_GATEWAY_PROVIDER=mock` for demo environments.
- Use `razorpay` only after `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are ready.
- Use `stripe` only after `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are ready.
- Verify payment success, failure, history, and refund flows before showing payment as production-ready.

Google:

- Backend Places search needs `GOOGLE_MAPS_API_KEY`.
- Driver map UI needs `VITE_GOOGLE_MAPS_API_KEY` during frontend build.
- Keep key restrictions enabled in Google Cloud and allow the exact local/deployed origins you use.

Notifications:

- Current app has notification APIs and UI.
- Real SMS, push, WhatsApp, or email provider credentials are still future production work.

## 10. Suggested Cloud Deployment

Backend can be deployed on:

- Render
- Railway
- Fly.io
- Any Node.js server

Frontend apps can be deployed on:

- Vercel
- Netlify
- Cloudflare Pages
- Static hosting behind Nginx

MongoDB can be deployed on:

- MongoDB Atlas
- Railway MongoDB
- Self-hosted MongoDB

## 11. Deployment Order

Use this order:

```text
1. Create MongoDB database.
2. Add production backend env variables.
3. Deploy backend API.
4. Check backend `/health`.
5. Run backend tests or smoke flow against a staging/demo database.
6. Set each frontend `VITE_API_BASE_URL` to the deployed backend URL.
7. Add driver `VITE_GOOGLE_MAPS_API_KEY` only if driver Google Maps is ready.
8. Build rider app.
9. Build driver app.
10. Build ops dashboard.
11. Deploy frontend static builds.
12. Update backend `CORS_ORIGIN` with final deployed frontend URLs.
13. Restart backend.
14. Seed demo data only if this is a demo environment.
15. Run browser smoke flow or manual demo checklist.
```

## 12. Demo Credentials

After running:

```bash
npm --prefix server run seed:demo
```

Default password:

```text
Password@123
```

Accounts:

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

Do not use demo credentials in a real production environment.

## 13. Deployment Checklist

Before sharing a deployed link:

```text
Backend /health works.
MongoDB connection works.
CORS_ORIGIN contains every frontend URL.
Frontend VITE_API_BASE_URL points to deployed backend.
Production frontend builds were created after env variables were set.
Rider app opens.
Driver app opens.
Ops dashboard opens.
Rider login works.
Driver login works.
Ops login works.
Pickup/dropoff search works with Google Places or known-place fallback.
Payment provider is either intentionally mock or live credentials are verified.
Smoke flow passes in demo environment.
Real secrets are not committed.
```
