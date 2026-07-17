import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
    RATING_DIMENSIONS,
    RATING_SENTIMENTS,
    RATING_STATUSES,
    RATING_TAGS
} from './ratings.constants.js';
import { createRatingsRouter } from './ratings.route.js';

const BASE_PATH = '/api/v1/public/ratings';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createRatingsRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createCompletedRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: 'ride-id',
    _id: 'ride-id',
    bookingCode: 'GR-TEST-0001',
    authUserId: `${role}-id`,
    role,
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
        confidenceScore: 92
    },
    confirmedAt: new Date('2026-01-01T07:00:00.000Z'),
    createdAt: new Date('2026-01-01T06:58:00.000Z'),
    updatedAt: new Date('2026-01-01T07:30:00.000Z'),
    ...overrides
});

const createActiveRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => createCompletedRideBooking(role, {
    confirmedAt: new Date('2026-01-01T08:08:00.000Z'),
    ...overrides
});

const createRating = (overrides = {}) => ({
    id: 'rating-id',
    _id: 'rating-id',
    ratingCode: 'RTG-20260101081000-ABC123',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    rideId: 'ride-id',
    rideSnapshot: {
        bookingCode: 'GR-TEST-0001',
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
        driver: {
            driverId: 'drv_cab_rajesh',
            fullName: 'Rajesh Kumar',
            vehicleName: 'Suzuki Dzire',
            vehicleNumber: 'WB 01 AC 4522'
        }
    },
    score: 5,
    sentiment: RATING_SENTIMENTS.POSITIVE,
    status: RATING_STATUSES.SUBMITTED,
    tags: [RATING_TAGS.PROFESSIONAL_DRIVER, RATING_TAGS.FAIR_ROUTE],
    dimensions: {
        [RATING_DIMENSIONS.DRIVER_BEHAVIOR]: 5,
        [RATING_DIMENSIONS.ROUTE_QUALITY]: 5,
        [RATING_DIMENSIONS.SAFETY]: 5
    },
    comment: 'Smooth and transparent ride',
    isAnonymous: false,
    submittedAt: FIXED_NOW,
    editableUntil: new Date('2026-01-08T08:10:00.000Z'),
    editCount: 0,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDependencies = () => ({
    ratingsDao: {
        create: jest.fn(),
        findByIdForUser: jest.fn(),
        findByRideForUser: jest.fn(),
        findHistoryForUser: jest.fn(),
        findSummaryForUser: jest.fn(),
        updateByIdForUser: jest.fn()
    },
    ridesDao: {
        findByIdForUser: jest.fn()
    },
    tokenService: new TokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public ratings routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('options returns rating scale, tags, and dimensions', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.scale.max).toBe(5);
        expect(response.body.data.options.tags).toContain(RATING_TAGS.FAIR_ROUTE);
        expect(response.body.data.options.dimensions).toContain(RATING_DIMENSIONS.VALUE_FOR_MONEY);
    });

    test('submit ride rating creates feedback for completed rides', async () => {
        const user = createUser();
        const ride = createCompletedRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(ride);
        dependencies.ratingsDao.findByRideForUser.mockResolvedValue(null);
        dependencies.ratingsDao.create.mockImplementation(async (payload) => createRating({
            ...payload,
            id: 'rating-id',
            _id: 'rating-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                score: 5,
                tags: [RATING_TAGS.PROFESSIONAL_DRIVER, RATING_TAGS.FAIR_ROUTE],
                dimensions: {
                    [RATING_DIMENSIONS.DRIVER_BEHAVIOR]: 5,
                    [RATING_DIMENSIONS.ROUTE_QUALITY]: 5,
                    [RATING_DIMENSIONS.VALUE_FOR_MONEY]: 4
                },
                comment: 'Smooth and transparent ride'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.rating.score).toBe(5);
        expect(response.body.data.rating.sentiment).toBe(RATING_SENTIMENTS.POSITIVE);
        expect(response.body.data.rating.ride.driver.fullName).toBe('Rajesh Kumar');
        expect(response.body.data.impact.contributesToTrustScore).toBe(true);
        expect(dependencies.ridesDao.findByIdForUser).toHaveBeenCalledWith('ride-id', user.id, user.role);
        expect(dependencies.ratingsDao.findByRideForUser).toHaveBeenCalledWith('ride-id', user.id, user.role);
        expect(dependencies.ratingsDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: user.id,
            role: user.role,
            rideId: 'ride-id',
            score: 5,
            sentiment: RATING_SENTIMENTS.POSITIVE,
            status: RATING_STATUSES.SUBMITTED
        }));
    });

    test('submit ride rating prevents duplicate feedback', async () => {
        const user = createUser();

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(createCompletedRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        }));
        dependencies.ratingsDao.findByRideForUser.mockResolvedValue(createRating({
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                score: 4
            }
        });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('Ride is already rated');
        expect(dependencies.ratingsDao.create).not.toHaveBeenCalled();
    });

    test('submit ride rating rejects active rides', async () => {
        const user = createUser();

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(createActiveRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                score: 5
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only completed rides can be rated');
        expect(dependencies.ratingsDao.create).not.toHaveBeenCalled();
    });

    test('ride rating status returns existing rating and eligibility', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);
        const rating = createRating({
            authUserId: user.id,
            role: user.role
        });

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(createCompletedRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        }));
        dependencies.ratingsDao.findByRideForUser.mockResolvedValue(rating);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rating.ratingCode).toBe('RTG-20260101081000-ABC123');
        expect(response.body.data.eligibility.canRate).toBe(false);
        expect(response.body.data.eligibility.reason).toBe('Ride is already rated');
    });

    test('history returns rating ledger and summary', async () => {
        const user = createUser();

        dependencies.ratingsDao.findHistoryForUser.mockResolvedValue([
            createRating({
                authUserId: user.id,
                role: user.role
            }),
            createRating({
                id: 'low-rating-id',
                _id: 'low-rating-id',
                ratingCode: 'RTG-LOW',
                authUserId: user.id,
                role: user.role,
                score: 2,
                sentiment: RATING_SENTIMENTS.NEGATIVE,
                tags: [RATING_TAGS.ROUTE_ISSUE]
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/history?sentiment=${RATING_SENTIMENTS.POSITIVE}&limit=5`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.history).toHaveLength(2);
        expect(response.body.data.summary.totalRatings).toBe(2);
        expect(response.body.data.summary.averageScore).toBe(3.5);
        expect(dependencies.ratingsDao.findHistoryForUser).toHaveBeenCalledWith(user.id, user.role, {
            sentiment: RATING_SENTIMENTS.POSITIVE,
            limit: 5
        });
    });

    test('summary returns aggregate rating health', async () => {
        const user = createUser();

        dependencies.ratingsDao.findSummaryForUser.mockResolvedValue({
            totals: [{
                totalRatings: 3,
                averageScore: 4.333,
                positiveCount: 2,
                neutralCount: 1,
                negativeCount: 0,
                lastRatedAt: FIXED_NOW
            }],
            scores: [
                { _id: 3, count: 1 },
                { _id: 5, count: 2 }
            ],
            tags: [
                { _id: RATING_TAGS.FAIR_ROUTE, count: 2 }
            ]
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/summary`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.summary.averageScore).toBe(4.3);
        expect(response.body.data.summary.scoreDistribution['5']).toBe(2);
        expect(response.body.data.summary.topTags[0]).toEqual({
            tag: RATING_TAGS.FAIR_ROUTE,
            count: 2
        });
    });

    test('rating details can be fetched by id', async () => {
        const user = createUser();

        dependencies.ratingsDao.findByIdForUser.mockResolvedValue(createRating({
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rating-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rating.ratingCode).toBe('RTG-20260101081000-ABC123');
        expect(response.body.data.rating.dimensions.driverBehavior).toBe(5);
        expect(dependencies.ratingsDao.findByIdForUser).toHaveBeenCalledWith('rating-id', user.id, user.role);
    });

    test('rating can be updated during edit window', async () => {
        const user = createUser();
        const rating = createRating({
            authUserId: user.id,
            role: user.role
        });

        dependencies.ratingsDao.findByIdForUser.mockResolvedValue(rating);
        dependencies.ratingsDao.updateByIdForUser.mockImplementation(async (_ratingId, _userId, _role, payload) => createRating({
            ...rating,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rating-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                score: 3,
                tags: [RATING_TAGS.FARE_ISSUE],
                comment: 'Fare clarity could improve'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rating.status).toBe(RATING_STATUSES.UPDATED);
        expect(response.body.data.rating.sentiment).toBe(RATING_SENTIMENTS.NEUTRAL);
        expect(response.body.data.rating.editCount).toBe(1);
        expect(dependencies.ratingsDao.updateByIdForUser).toHaveBeenCalledWith('rating-id', user.id, user.role, expect.objectContaining({
            score: 3,
            sentiment: RATING_SENTIMENTS.NEUTRAL,
            status: RATING_STATUSES.UPDATED,
            editCount: 1
        }));
    });

    test('rating update rejects expired edit windows', async () => {
        const user = createUser();

        dependencies.ratingsDao.findByIdForUser.mockResolvedValue(createRating({
            authUserId: user.id,
            role: user.role,
            editableUntil: new Date('2025-12-31T08:10:00.000Z')
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rating-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                score: 4
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Rating edit window has expired');
        expect(dependencies.ratingsDao.updateByIdForUser).not.toHaveBeenCalled();
    });

    test('ratings routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('ratings routes return validation errors for invalid scores', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                score: 6
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });
});
