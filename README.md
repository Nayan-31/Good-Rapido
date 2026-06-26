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

## Docker & Local Development

This project uses **Docker Compose** to manage the local development environment seamlessly.

## Current API Surface

The first implemented module is public authentication. It follows the layered flow described above:

`routes -> validators/middlewares -> controller -> service -> dao -> Mongo model`

Controllers only hand off request data and send service responses. The reusable auth service is mounted for both rider and passenger roles, and database access is isolated in the DAO.

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
