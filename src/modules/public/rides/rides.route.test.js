import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import { RIDE_BOOKING_CANCELLATION_REASONS, RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import { createRidesRouter } from './rides.route.js';
import { RIDE_HISTORY_FILTERS, RIDE_LIFECYCLE_STATUSES } from './rides.constants.js';

const BASE_PATH = '/api/v1/public/rides';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createRidesRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: 'ride-id',
    _id: 'ride-id',
    bookingCode: 'GR-TEST-0001',
    authUserId: `${role}-id`,
    role,
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
        cancellationRiskLevel: 'low',
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
    createdAt: new Date('2026-01-01T08:07:00.000Z'),
    updatedAt: new Date('2026-01-01T08:08:00.000Z'),
    ...overrides
});

const createCancelledRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => createRideBooking(role, {
    id: 'cancelled-ride-id',
    _id: 'cancelled-ride-id',
    bookingCode: 'GR-TEST-CANCEL',
    status: RIDE_BOOKING_STATUSES.CANCELLED,
    confirmedAt: null,
    cancellation: {
        reason: RIDE_BOOKING_CANCELLATION_REASONS.CHANGED_PLANS,
        note: 'No longer needed',
        cancelledAt: new Date('2026-01-01T08:03:00.000Z')
    },
    createdAt: new Date('2026-01-01T08:00:00.000Z'),
    updatedAt: new Date('2026-01-01T08:03:00.000Z'),
    ...overrides
});

const createCompletedRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => createRideBooking(role, {
    id: 'completed-ride-id',
    _id: 'completed-ride-id',
    bookingCode: 'GR-TEST-DONE',
    confirmedAt: new Date('2026-01-01T07:00:00.000Z'),
    createdAt: new Date('2026-01-01T06:58:00.000Z'),
    updatedAt: new Date('2026-01-01T07:30:00.000Z'),
    ...overrides
});

const createDependencies = () => ({
    ridesDao: {
        findByIdForUser: jest.fn(),
        findCurrentForUser: jest.fn(),
        findHistoryForUser: jest.fn()
    },
    tokenService: new TokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public rides routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('current returns the active confirmed ride', async () => {
        const user = createUser();
        const rideBooking = createRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });

        dependencies.ridesDao.findCurrentForUser.mockResolvedValue(rideBooking);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/current`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.ride.lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE);
        expect(response.body.data.ride.progress.percentage).toBeGreaterThanOrEqual(15);
        expect(dependencies.ridesDao.findCurrentForUser).toHaveBeenCalledWith(user.id, user.role);
    });

    test('history returns completed and cancelled rides by default', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);

        dependencies.ridesDao.findHistoryForUser.mockResolvedValue([
            createCompletedRideBooking(user.role, {
                authUserId: user.id,
                role: user.role
            }),
            createCancelledRideBooking(user.role, {
                authUserId: user.id,
                role: user.role
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/history`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.history).toHaveLength(2);
        expect(response.body.data.history[0].lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.COMPLETED);
        expect(response.body.data.history[1].lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.CANCELLED);
        expect(dependencies.ridesDao.findHistoryForUser).toHaveBeenCalledWith(user.id, user.role, {
            bookingStatuses: [
                RIDE_BOOKING_STATUSES.CONFIRMED,
                RIDE_BOOKING_STATUSES.CANCELLED
            ],
            limit: 10
        });
    });

    test('history can be filtered to active rides', async () => {
        const user = createUser();

        dependencies.ridesDao.findHistoryForUser.mockResolvedValue([
            createRideBooking(user.role, {
                authUserId: user.id,
                role: user.role
            }),
            createCompletedRideBooking(user.role, {
                authUserId: user.id,
                role: user.role
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/history?status=${RIDE_HISTORY_FILTERS.ACTIVE}&limit=2`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.history).toHaveLength(1);
        expect(response.body.data.history[0].lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE);
        expect(dependencies.ridesDao.findHistoryForUser).toHaveBeenCalledWith(user.id, user.role, {
            bookingStatuses: [RIDE_BOOKING_STATUSES.CONFIRMED],
            limit: 6
        });
    });

    test('ride details can be fetched by id', async () => {
        const user = createUser();
        const rideBooking = createRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(rideBooking);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/ride-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ride.id).toBe('ride-id');
        expect(response.body.data.ride.driver.fullName).toBe('Rajesh Kumar');
        expect(response.body.data.ride.trustSignals.routeAccuracyScore).toBe(96);
        expect(dependencies.ridesDao.findByIdForUser).toHaveBeenCalledWith('ride-id', user.id, user.role);
    });

    test('ride receipt exposes fare and trust transparency', async () => {
        const user = createUser();
        const rideBooking = createCompletedRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(rideBooking);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/completed-ride-id/receipt`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.receipt.receiptNumber).toBe('RCPT-GR-TEST-DONE');
        expect(response.body.data.receipt.paymentSummary.paidAmount).toBe(350);
        expect(response.body.data.receipt.trustSummary.fairPriceScore).toBe(92);
        expect(response.body.data.ride.lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.COMPLETED);
    });

    test('missing rides return not found', async () => {
        const user = createUser();

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/missing-ride-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Ride not found');
    });

    test('rides routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/current`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('rides routes return validation errors for invalid query filters', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/history?status=bad_status`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
