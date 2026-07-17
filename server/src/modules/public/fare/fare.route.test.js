import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import { FARE_VEHICLE_TYPES } from './fare.constants.js';
import { createFareRouter } from './fare.route.js';

const BASE_PATH = '/api/v1/public/fare';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createFareRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createEstimate = (overrides = {}) => ({
    id: 'estimate-id',
    _id: 'estimate-id',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    pickup: {
        address: 'Park Street',
        latitude: 22.5535,
        longitude: 88.3526
    },
    dropoff: {
        address: 'Howrah Station',
        latitude: 22.585,
        longitude: 88.3426
    },
    vehicleType: FARE_VEHICLE_TYPES.BIKE,
    requestedAt: new Date('2026-01-01T12:00:00.000Z'),
    distanceKm: 4.67,
    durationMinutes: 14,
    breakdown: {
        currency: 'INR',
        baseFare: 25,
        distanceFare: 39.7,
        timeFare: 14,
        minFareAdjustment: 0,
        surgeFare: 0,
        platformFee: 6,
        taxes: 4.24,
        totalFare: 88.94
    },
    surge: {
        multiplier: 1,
        level: 'normal',
        reason: 'Demand and driver availability are normal'
    },
    confidence: {
        score: 94,
        level: 'high',
        factors: ['Stable local demand and standard route distance']
    },
    alternativePickups: [{
        label: 'Pickup 250m north',
        pickup: {
            latitude: 22.555745,
            longitude: 88.3526
        },
        walkingDistanceMeters: 250,
        estimatedSavings: 2.67,
        estimatedFare: 86.27,
        reason: 'Nearby pickup may avoid a busier demand pocket'
    }],
    validUntil: new Date('2026-01-01T12:10:00.000Z'),
    lock: {
        isLocked: false,
        lockedUntil: null
    },
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    ...overrides
});

const createDependencies = () => ({
    fareDao: {
        create: jest.fn(),
        findByIdForUser: jest.fn(),
        lockEstimate: jest.fn(),
        findRecentForUser: jest.fn()
    },
    tokenService: new TokenService()
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public fare routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('estimate creates a transparent fare breakdown', async () => {
        const user = createUser();

        dependencies.fareDao.create.mockImplementation(async (payload) => createEstimate({
            ...payload,
            id: 'estimate-id',
            _id: 'estimate-id',
            createdAt: new Date('2026-01-01T12:00:00.000Z'),
            updatedAt: new Date('2026-01-01T12:00:00.000Z')
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/estimate`,
            headers: authHeaderFor(dependencies, user),
            body: {
                pickup: {
                    address: 'Park Street',
                    latitude: 22.5535,
                    longitude: 88.3526
                },
                dropoff: {
                    address: 'Howrah Station',
                    latitude: 22.585,
                    longitude: 88.3426
                },
                vehicleType: FARE_VEHICLE_TYPES.BIKE,
                requestedAt: '2026-01-01T06:00:00.000Z'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.estimate.breakdown.currency).toBe('INR');
        expect(response.body.data.estimate.breakdown.totalFare).toBeGreaterThan(0);
        expect(response.body.data.estimate.confidence.level).toBe('high');
        expect(response.body.data.estimate.alternativePickups.length).toBe(2);
        expect(dependencies.fareDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: user.id,
            role: user.role,
            vehicleType: FARE_VEHICLE_TYPES.BIKE
        }));
    });

    test('estimate lock stores a short pricing lock', async () => {
        const user = createUser();
        const estimate = createEstimate({
            authUserId: user.id,
            role: user.role,
            validUntil: new Date(Date.now() + 10 * 60 * 1000)
        });
        const lockedEstimate = createEstimate({
            ...estimate,
            lock: {
                isLocked: true,
                lockedUntil: new Date(Date.now() + 3 * 60 * 1000)
            }
        });

        dependencies.fareDao.findByIdForUser.mockResolvedValue(estimate);
        dependencies.fareDao.lockEstimate.mockResolvedValue(lockedEstimate);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/estimates/estimate-id/lock`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.estimate.lock.isLocked).toBe(true);
        expect(dependencies.fareDao.lockEstimate).toHaveBeenCalledWith(
            'estimate-id',
            user.id,
            user.role,
            expect.any(Date)
        );
    });

    test('get estimate returns not found for missing estimates', async () => {
        const user = createUser();

        dependencies.fareDao.findByIdForUser.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/estimates/missing-estimate-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Fare estimate not found');
    });

    test('history returns recent fare totals for the authenticated user', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);
        const estimate = createEstimate({
            authUserId: user.id,
            role: user.role,
            vehicleType: FARE_VEHICLE_TYPES.AUTO
        });

        dependencies.fareDao.findRecentForUser.mockResolvedValue([estimate]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/history?vehicleType=${FARE_VEHICLE_TYPES.AUTO}&limit=5`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.history[0].vehicleType).toBe(FARE_VEHICLE_TYPES.AUTO);
        expect(dependencies.fareDao.findRecentForUser).toHaveBeenCalledWith(user.id, user.role, {
            vehicleType: FARE_VEHICLE_TYPES.AUTO,
            limit: 5
        });
    });

    test('fare routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/estimate`,
            body: {
                pickup: {
                    latitude: 22.5535,
                    longitude: 88.3526
                },
                dropoff: {
                    latitude: 22.585,
                    longitude: 88.3426
                },
                vehicleType: FARE_VEHICLE_TYPES.BIKE
            }
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('fare routes return validation errors for invalid payloads', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/estimate`,
            headers: authHeaderFor(dependencies, user),
            body: {
                pickup: {
                    latitude: 22.5535,
                    longitude: 88.3526
                },
                vehicleType: FARE_VEHICLE_TYPES.BIKE
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('unknown fare routes return 404', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/unknown`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
    });
});
