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

- Real payment provider.
- Real Google Maps/Mapbox moving vehicle tracking.
- Real SMS, push, and email providers.
- Production monitoring and log aggregation.
- Production httpOnly cookie auth.

## 2. Backend Environment

Use `.env.example` or `server/.env.example` as the template.

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
```

Why these matter:

- `MONGO_URL` tells backend where MongoDB is.
- `CORS_ORIGIN` tells backend which frontend URLs can call it.
- `ACCESS_SECRET_TOKEN` signs short-lived access tokens.
- `REFRESH_SECRET_TOKEN` signs refresh tokens.

Do not commit real secrets.

## 3. Frontend Environment

Each frontend app needs the backend URL.

```text
VITE_API_BASE_URL=https://your-backend-api.com
```

Local examples are available at:

```text
frontend/apps/rider-app/.env.example
frontend/apps/driver-app/.env.example
frontend/apps/ops-dashboard/.env.example
```

Why this matters:

Vite reads `VITE_API_BASE_URL` at build time. If this value points to localhost during production build, the deployed frontend will try to call localhost instead of the deployed backend.

## 4. Local Docker Backend

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

## 5. Local Full Demo

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

## 6. Production Build Commands

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

## 7. Suggested Cloud Deployment

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

## 8. Deployment Order

Use this order:

```text
1. Create MongoDB database.
2. Deploy backend API with production env variables.
3. Check backend /health.
4. Build rider app using deployed backend URL.
5. Build driver app using deployed backend URL.
6. Build ops dashboard using deployed backend URL.
7. Update backend CORS_ORIGIN with deployed frontend URLs.
8. Seed demo data only if this is a demo environment.
9. Run smoke test against the deployed backend if network access allows.
```

## 9. Demo Credentials

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

## 10. Deployment Checklist

Before sharing a deployed link:

```text
Backend /health works.
MongoDB connection works.
CORS_ORIGIN contains every frontend URL.
Frontend VITE_API_BASE_URL points to deployed backend.
Rider app opens.
Driver app opens.
Ops dashboard opens.
Rider login works.
Driver login works.
Ops login works.
Smoke flow passes in demo environment.
Real secrets are not committed.
```
