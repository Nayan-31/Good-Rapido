import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import { createRideBookingRouter } from './ride-booking.route.js';
import { RIDE_BOOKING_CANCELLATION_REASONS, RIDE_BOOKING_STATUSES } from './ride-booking.constants.js';

const BASE_PATH = '/api/v1/public/ride-booking';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createRideBookingRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createFareEstimate = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: 'fare-estimate-id',
    _id: 'fare-estimate-id',
    authUserId: `${role}-id`,
    role,
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
    requestedAt: new Date('2026-01-01T08:00:00.000Z'),
    distanceKm: 8.4,
    durationMinutes: 22,
    breakdown: {
        currency: 'INR',
        baseFare: 60,
        distanceFare: 180,
        timeFare: 40,
        minFareAdjustment: 0,
        surgeFare: 60,
        platformFee: 10,
        taxes: 10,
        totalFare: 350
    },
    surge: {
        multiplier: 1.2,
        level: 'moderate',
        reason: 'High demand in Park Street area due to peak hours'
    },
    confidence: {
        score: 92,
        level: 'high',
        factors: ['Stable route pricing']
    },
    alternativePickups: [],
    validUntil: new Date(Date.now() + 10 * 60 * 1000),
    lock: {
        isLocked: true,
        lockedUntil: new Date(Date.now() + 3 * 60 * 1000)
    },
    createdAt: new Date('2026-01-01T08:00:00.000Z'),
    updatedAt: new Date('2026-01-01T08:00:00.000Z'),
    ...overrides
});

const createBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: 'booking-id',
    _id: 'booking-id',
    bookingCode: 'GR-TEST-0001',
    authUserId: `${role}-id`,
    role,
    fareEstimateId: 'fare-estimate-id',
    status: RIDE_BOOKING_STATUSES.DRIVER_SELECTED,
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
        validUntil: new Date(Date.now() + 10 * 60 * 1000),
        lockedUntil: new Date(Date.now() + 3 * 60 * 1000)
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
    expiresAt: new Date(Date.now() + 3 * 60 * 1000),
    confirmedAt: null,
    cancellation: null,
    createdAt: new Date('2026-01-01T08:00:00.000Z'),
    updatedAt: new Date('2026-01-01T08:00:00.000Z'),
    ...overrides
});

const createDependencies = () => ({
    rideBookingDao: {
        create: jest.fn(),
        findByIdForUser: jest.fn(),
        updateSelectedDriver: jest.fn(),
        confirmBooking: jest.fn(),
        cancelBooking: jest.fn()
    },
    fareDao: {
        findByIdForUser: jest.fn()
    },
    tokenService: new TokenService()
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public ride booking routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('search returns trusted driver options for a fare estimate', async () => {
        const user = createUser();
        const fareEstimate = createFareEstimate(user.role);

        dependencies.fareDao.findByIdForUser.mockResolvedValue(fareEstimate);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/search`,
            headers: authHeaderFor(dependencies, user),
            body: {
                fareEstimateId: fareEstimate.id,
                limit: 2
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.search.driverOptions.length).toBe(2);
        expect(response.body.data.search.trustSummary.cancellationRiskLevel).toBe('low');
        expect(dependencies.fareDao.findByIdForUser).toHaveBeenCalledWith(fareEstimate.id, user.id, user.role);
    });

    test('bookings can be created from a valid fare estimate', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);
        const fareEstimate = createFareEstimate(user.role, {
            authUserId: user.id,
            role: user.role
        });

        dependencies.fareDao.findByIdForUser.mockResolvedValue(fareEstimate);
        dependencies.rideBookingDao.create.mockImplementation(async (payload) => createBooking(user.role, {
            ...payload,
            id: 'booking-id',
            _id: 'booking-id',
            createdAt: new Date('2026-01-01T08:00:00.000Z'),
            updatedAt: new Date('2026-01-01T08:00:00.000Z')
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/bookings`,
            headers: authHeaderFor(dependencies, user),
            body: {
                fareEstimateId: fareEstimate.id,
                selectedDriverId: 'drv_cab_rajesh',
                paymentMethod: 'personal_wallet'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.booking.status).toBe(RIDE_BOOKING_STATUSES.DRIVER_SELECTED);
        expect(response.body.data.booking.selectedDriver.fullName).toBe('Rajesh Kumar');
        expect(response.body.data.booking.trustSignals.routeFairnessScore).toBe(97);
        expect(dependencies.rideBookingDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: user.id,
            role: user.role,
            fareEstimateId: fareEstimate.id,
            vehicleType: 'cab_economy'
        }));
    });

    test('selected driver can be changed before confirmation', async () => {
        const user = createUser();
        const booking = createBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });
        const updatedBooking = createBooking(user.role, {
            authUserId: user.id,
            role: user.role,
            selectedDriver: {
                driverId: 'drv_cab_neha',
                fullName: 'Neha Das',
                rating: 4.7,
                vehicleName: 'Hyundai Aura',
                vehicleNumber: 'WB 08 ND 5291',
                vehicleColor: 'Silver',
                etaMinutes: 7,
                distanceKm: 1.3
            }
        });

        dependencies.rideBookingDao.findByIdForUser.mockResolvedValue(booking);
        dependencies.rideBookingDao.updateSelectedDriver.mockResolvedValue(updatedBooking);

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/bookings/booking-id/driver`,
            headers: authHeaderFor(dependencies, user),
            body: {
                driverId: 'drv_cab_neha'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.booking.selectedDriver.fullName).toBe('Neha Das');
        expect(dependencies.rideBookingDao.updateSelectedDriver).toHaveBeenCalledWith(
            'booking-id',
            user.id,
            user.role,
            expect.objectContaining({ driverId: 'drv_cab_neha' }),
            expect.objectContaining({ cancellationRiskLevel: 'medium' })
        );
    });

    test('bookings can be confirmed while the quote is valid', async () => {
        const user = createUser();
        const booking = createBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });
        const confirmedBooking = createBooking(user.role, {
            authUserId: user.id,
            role: user.role,
            status: RIDE_BOOKING_STATUSES.CONFIRMED,
            confirmedAt: new Date()
        });

        dependencies.rideBookingDao.findByIdForUser.mockResolvedValue(booking);
        dependencies.rideBookingDao.confirmBooking.mockResolvedValue(confirmedBooking);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/bookings/booking-id/confirm`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.booking.status).toBe(RIDE_BOOKING_STATUSES.CONFIRMED);
        expect(dependencies.rideBookingDao.confirmBooking).toHaveBeenCalledWith('booking-id', user.id, user.role, expect.any(Date));
    });

    test('bookings can be cancelled with a transparent reason', async () => {
        const user = createUser();
        const booking = createBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });
        const cancelledBooking = createBooking(user.role, {
            authUserId: user.id,
            role: user.role,
            status: RIDE_BOOKING_STATUSES.CANCELLED,
            cancellation: {
                reason: RIDE_BOOKING_CANCELLATION_REASONS.CHANGED_PLANS,
                note: 'No longer needed',
                cancelledAt: new Date()
            }
        });

        dependencies.rideBookingDao.findByIdForUser.mockResolvedValue(booking);
        dependencies.rideBookingDao.cancelBooking.mockResolvedValue(cancelledBooking);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/bookings/booking-id/cancel`,
            headers: authHeaderFor(dependencies, user),
            body: {
                reason: RIDE_BOOKING_CANCELLATION_REASONS.CHANGED_PLANS,
                note: 'No longer needed'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.booking.status).toBe(RIDE_BOOKING_STATUSES.CANCELLED);
        expect(response.body.data.booking.cancellation.reason).toBe(RIDE_BOOKING_CANCELLATION_REASONS.CHANGED_PLANS);
    });

    test('missing bookings return not found', async () => {
        const user = createUser();

        dependencies.rideBookingDao.findByIdForUser.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/bookings/missing-booking-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Ride booking not found');
    });

    test('ride booking routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/search`,
            body: {
                fareEstimateId: 'fare-estimate-id'
            }
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('ride booking routes return validation errors for invalid payloads', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/bookings/booking-id/cancel`,
            headers: authHeaderFor(dependencies, user),
            body: {
                reason: 'bad_reason'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
