# Driver App Skeleton

## Purpose

The driver app is the operational app for drivers. It should focus on availability, ride execution, earnings clarity, compliance, and trust improvement.

This folder currently contains the skeleton only. Screens and business logic should be added feature by feature after the rider MVP is stable.

## Physical Structure

```text
driver-app/
└── src/
    ├── app/
    ├── assets/
    ├── components/
    ├── config/
    ├── constants/
    ├── features/
    │   ├── auth/
    │   ├── onboarding/
    │   ├── availability/
    │   ├── ride-requests/
    │   ├── active-ride/
    │   ├── earnings/
    │   ├── trust/
    │   ├── notifications/
    │   ├── profile/
    │   └── support/
    ├── hooks/
    ├── layouts/
    ├── lib/
    ├── routes/
    ├── services/
    ├── store/
    ├── styles/
    ├── types/
    └── utils/
```

## Primary Driver Journey

```text
Login
-> restore session
-> complete onboarding
-> upload documents
-> add vehicle details
-> wait for approval
-> go online
-> receive ride request
-> accept or decline
-> navigate to pickup
-> mark arrived
-> start ride
-> complete ride
-> review earnings
```

## Feature Responsibilities

### auth

- Driver login
- Driver registration
- Session restore
- Token storage
- Logout

Backend modules:

- `private/auth`

### onboarding

- Driver profile setup
- Document upload
- Vehicle details
- Approval status
- Compliance blockers

Backend modules:

- `private/driver`
- `private/driver-documents`
- `private/vehicle`

### availability

- Online/offline toggle
- Location sharing state
- Active service zone
- Availability warnings

Backend modules:

- `private/driver-availability`

### ride-requests

- Incoming ride request
- Fare preview
- Pickup route summary
- Trust and cancellation guidance
- Accept or decline actions

Backend modules:

- `private/ride-ops`
- `core/matching-engine`
- `core/trust-engine`

### active-ride

- Current ride state
- Navigate to pickup
- Mark arrived
- Start ride
- Complete ride
- Route fairness and detour indicators

Backend modules:

- `private/ride-ops`
- `core/ride-lifecycle`
- `core/route-engine`

### earnings

- Today's earnings
- Ride earnings breakdown
- Incentives
- Deductions or penalties
- Payout status

Backend modules:

- `private/earnings`

### trust

- Driver trust score
- Cancellation score
- Route fairness score
- Improvement tips

Backend modules:

- `private/trust`
- `core/trust-engine`

### notifications

- Driver inbox
- Ride alerts
- Document approval alerts
- Earnings and payout alerts

Backend modules:

- `private/notifications`
- `core/notification-engine`

### profile

- Driver profile
- Vehicle summary
- Document status
- Account settings

Backend modules:

- `private/driver`
- `private/vehicle`
- `private/driver-documents`

### support

- Driver help center
- Create support request
- Track support tickets

Backend modules:

- `public/support`
- `private/disputes`

## MVP Build Order

1. Driver app Vite TypeScript setup
2. Auth and session shell
3. Onboarding and document status
4. Availability dashboard
5. Ride request accept/decline flow
6. Active ride lifecycle controls
7. Earnings dashboard
8. Trust and profile screens
9. Notifications and support

## Design Direction

- Driver app should be mobile-first, but desktop-safe.
- The first screen after login should show online status, today's earnings, approval status, and active ride/request.
- Ride execution screens should be fast and action-focused.
- Trust and compliance warnings should be visible before the driver goes online.
- Earnings screens should explain gross fare, platform fee, incentives, deductions, and payout status clearly.
