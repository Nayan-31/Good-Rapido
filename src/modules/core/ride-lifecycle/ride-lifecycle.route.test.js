import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import {
    RIDE_BOOKING_CANCELLATION_REASONS,
    RIDE_BOOKING_RISK_LEVELS,
    RIDE_BOOKING_STATUSES
} from '../../public/ride-booking/ride-booking.constants.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    RIDE_LIFECYCLE_EVENTS,
    RIDE_LIFECYCLE_STATUSES
} from './ride-lifecycle.constants.js';
import { createRideLifecycleRouter } from './ride-lifecycle.route.js';

const BASE_PATH = '/api/v1/core/ride-lifecycle';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createRideLifecycleRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPublicUser = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: '+919111111111',
    accountStatus: AUTH_ACCOUNT_STATUSES.ACTIVE,
    ...overrides
});

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.OPS, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: '+919222222222',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    ...overrides
});

const createRideBooking = (overrides = {}) => ({
    id: 'ride-id',
    _id: 'ride-id',
    bookingCode: 'GR-LIFE-0001',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    fareEstimateId: 'fare-estimate-id',
    status: RIDE_BOOKING_STATUSES.CONFIRMED,
    pickup: {
        address: 'Howrah Bridge',
        latitude: 22.5851,
        longitude: 88.3468
    },
    dropoff: {
        address: 'Park Street',
        latitude: 22.5535,
        longitude: 88.3526
    },
    vehicleType: 'cab_economy',
    selectedDriver: {
        driverId: 'drv_cab_rajesh',
        fullName: 'Rajesh Kumar',
        rating: 4.9,
        vehicleName: 'Suzuki Dzire',
        vehicleNumber: 'WB 01 AC 4522',
        vehicleColor: 'White',
        etaMinutes: 4,
        distanceKm: 0.8
    },
    fareSnapshot: {
        currency: 'INR',
        totalFare: 350,
        distanceKm: 8.4,
        durationMinutes: 22,
        surgeMultiplier: 1.2,
        confidenceScore: 92,
        validUntil: new Date('2026-01-01T08:20:00.000Z'),
        lockedUntil: new Date('2026-01-01T08:13:00.000Z')
    },
    trustSignals: {
        driverTrustScore: 95,
        driverReliabilityScore: 97,
        routeFairnessScore: 97,
        routeAccuracyScore: 96,
        cancellationRiskScore: 7,
        cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.LOW,
        cancellationRatio: 1.2,
        detourPercentage: 2,
        onTimeArrivalScore: 94,
        fairPriceScore: 92
    },
    paymentMethod: 'personal_wallet',
    riderNote: null,
    expiresAt: new Date('2026-01-01T08:13:00.000Z'),
    confirmedAt: new Date('2026-01-01T08:08:00.000Z'),
    cancellation: null,
    lifecycle: {
        transitionLog: []
    },
    createdAt: new Date('2026-01-01T08:07:00.000Z'),
    updatedAt: new Date('2026-01-01T08:08:00.000Z'),
    ...overrides
});

const createDependencies = () => ({
    rideLifecycleDao: {
        findPublicUserById: jest.fn(),
        findPrivateUserById: jest.fn(),
        findRideById: jest.fn(),
        findRideByIdForUser: jest.fn(),
        updateRideById: jest.fn()
    },
    publicTokenService: new PublicTokenService(),
    privateTokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const publicAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.publicTokenService.signAccessToken(user)}`
});

const privateAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.privateTokenService.signAccessToken(user)}`
});

describe('core ride lifecycle routes', () => {
    let dependencies;
    let app;
    let riderUser;
    let opsUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        riderUser = createPublicUser();
        opsUser = createPrivateUser();
    });

    test('options returns lifecycle metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.lifecycleStatuses).toContain(RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED);
        expect(response.body.data.options.lifecycleEvents).toContain(RIDE_LIFECYCLE_EVENTS.RIDE_COMPLETED);
        expect(response.body.data.options.cancellationReasons).toContain(RIDE_BOOKING_CANCELLATION_REASONS.SAFETY_CONCERN);
    });

    test('public user can fetch lifecycle for their own ride', async () => {
        dependencies.rideLifecycleDao.findPublicUserById.mockResolvedValue(riderUser);
        dependencies.rideLifecycleDao.findRideByIdForUser.mockResolvedValue(createRideBooking({
            authUserId: riderUser.id,
            role: riderUser.role
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.lifecycle.lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE);
        expect(response.body.data.lifecycle.progress.percentage).toBeGreaterThanOrEqual(15);
        expect(dependencies.rideLifecycleDao.findRideByIdForUser).toHaveBeenCalledWith(
            'ride-id',
            riderUser.id,
            riderUser.role
        );
    });

    test('ops user can fetch lifecycle for any ride', async () => {
        dependencies.rideLifecycleDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideLifecycleDao.findRideById.mockResolvedValue(createRideBooking());

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: privateAuthHeaderFor(dependencies, opsUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.lifecycle.ride.bookingCode).toBe('GR-LIFE-0001');
        expect(response.body.data.lifecycle.availableEvents).toContain(RIDE_LIFECYCLE_EVENTS.DRIVER_ARRIVED);
    });

    test('ops user can mark driver arrival', async () => {
        const ride = createRideBooking();

        dependencies.rideLifecycleDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideLifecycleDao.findRideById.mockResolvedValue(ride);
        dependencies.rideLifecycleDao.updateRideById.mockImplementation(async (_rideId, payload) => ({
            ...ride,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/events`,
            headers: privateAuthHeaderFor(dependencies, opsUser),
            body: {
                event: RIDE_LIFECYCLE_EVENTS.DRIVER_ARRIVED,
                note: 'Driver reached pickup gate'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.lifecycle.lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED);
        expect(response.body.data.lifecycle.transitionLog[0].event).toBe(RIDE_LIFECYCLE_EVENTS.DRIVER_ARRIVED);
        expect(dependencies.rideLifecycleDao.updateRideById).toHaveBeenCalledWith('ride-id', expect.objectContaining({
            lifecycle: expect.objectContaining({
                driverArrivedAt: FIXED_NOW,
                lastTransition: RIDE_LIFECYCLE_EVENTS.DRIVER_ARRIVED
            })
        }));
    });

    test('ops user can complete an in-progress ride', async () => {
        const ride = createRideBooking({
            lifecycle: {
                driverArrivedAt: new Date('2026-01-01T08:04:00.000Z'),
                rideStartedAt: new Date('2026-01-01T08:05:00.000Z'),
                transitionLog: []
            }
        });

        dependencies.rideLifecycleDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideLifecycleDao.findRideById.mockResolvedValue(ride);
        dependencies.rideLifecycleDao.updateRideById.mockImplementation(async (_rideId, payload) => ({
            ...ride,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/events`,
            headers: privateAuthHeaderFor(dependencies, opsUser),
            body: {
                event: RIDE_LIFECYCLE_EVENTS.RIDE_COMPLETED,
                note: 'Trip completed after dropoff confirmation'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.lifecycle.lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.COMPLETED);
        expect(dependencies.rideLifecycleDao.updateRideById).toHaveBeenCalledWith('ride-id', expect.objectContaining({
            lifecycle: expect.objectContaining({
                completedAt: FIXED_NOW,
                lastTransition: RIDE_LIFECYCLE_EVENTS.RIDE_COMPLETED
            })
        }));
    });

    test('cancelling lifecycle requires a cancellation reason', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/events`,
            headers: privateAuthHeaderFor(dependencies, opsUser),
            body: {
                event: RIDE_LIFECYCLE_EVENTS.RIDE_CANCELLED,
                note: 'Rider raised safety concern'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });

    test('public user cannot transition ride lifecycle', async () => {
        dependencies.rideLifecycleDao.findPublicUserById.mockResolvedValue(riderUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/events`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: {
                event: RIDE_LIFECYCLE_EVENTS.DRIVER_ARRIVED,
                note: 'Trying to update lifecycle'
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Ride lifecycle review access is restricted to ops users');
    });
});
