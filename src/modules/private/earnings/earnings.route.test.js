import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import PrivateTokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    EARNINGS_PERIODS,
    EARNINGS_STATEMENT_PERIODS,
    EARNINGS_STATUSES
} from './earnings.constants.js';
import { createEarningsRouter } from './earnings.route.js';
import { RIDE_BOOKING_STATUSES } from '../../public/ride-booking/ride-booking.constants.js';
import {
    PAYMENT_METHODS,
    PAYMENT_STATUSES
} from '../../public/payments/payments.constants.js';
import { FARE_VEHICLE_TYPES } from '../../public/fare/fare.constants.js';

const BASE_PATH = '/api/v1/private/earnings';
const FIXED_NOW = new Date('2026-01-08T08:10:00.000Z');
const WEEK_START = new Date('2026-01-04T18:30:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createEarningsRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.DRIVER, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: role === PRIVATE_AUTH_ROLES.DRIVER ? '+919111111111' : '+919222222222',
    employeeCode: role === PRIVATE_AUTH_ROLES.DRIVER ? 'drv_cab_rajesh' : `${role.toUpperCase()}-001`,
    department: role === PRIVATE_AUTH_ROLES.DRIVER ? 'driver_network' : 'operations',
    serviceZone: 'kolkata',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDriverProfile = (overrides = {}) => ({
    id: 'driver-profile-id',
    _id: 'driver-profile-id',
    authUserId: 'driver-id',
    driverCode: 'drv_cab_rajesh',
    profile: {
        displayName: 'Rajesh Kumar'
    },
    service: {
        serviceZone: 'kolkata',
        vehicleTypes: [FARE_VEHICLE_TYPES.CAB_ECONOMY]
    },
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createRide = (overrides = {}) => ({
    id: 'ride-id',
    _id: 'ride-id',
    bookingCode: 'BOOK-001',
    status: RIDE_BOOKING_STATUSES.CONFIRMED,
    pickup: {
        address: 'Salt Lake',
        latitude: 22.58,
        longitude: 88.43
    },
    dropoff: {
        address: 'Park Street',
        latitude: 22.55,
        longitude: 88.35
    },
    vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
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
        totalFare: 100,
        distanceKm: 6,
        durationMinutes: 20,
        surgeMultiplier: 1.2,
        confidenceScore: 94,
        validUntil: FIXED_NOW
    },
    trustSignals: {
        driverTrustScore: 95,
        fairPriceScore: 96,
        routeAccuracyScore: 97
    },
    paymentMethod: PAYMENT_METHODS.UPI,
    confirmedAt: new Date('2026-01-07T07:00:00.000Z'),
    cancellation: null,
    createdAt: new Date('2026-01-07T06:55:00.000Z'),
    updatedAt: new Date('2026-01-07T07:25:00.000Z'),
    ...overrides
});

const createPayment = (overrides = {}) => ({
    id: 'payment-id',
    _id: 'payment-id',
    paymentCode: 'PAY-001',
    rideId: 'ride-id',
    method: PAYMENT_METHODS.UPI,
    status: PAYMENT_STATUSES.SUCCEEDED,
    currency: 'INR',
    fareAmount: 100,
    tipAmount: 10,
    discountAmount: 0,
    amount: 110,
    capturedAt: new Date('2026-01-07T07:30:00.000Z'),
    refundableUntil: new Date('2026-01-08T07:30:00.000Z'),
    refund: null,
    createdAt: new Date('2026-01-07T07:25:00.000Z'),
    updatedAt: new Date('2026-01-07T07:30:00.000Z'),
    ...overrides
});

const createDependencies = () => ({
    earningsDao: {
        findAuthUserById: jest.fn(),
        findProfileByAuthUserId: jest.fn(),
        findEarningRides: jest.fn(),
        findRideByIdForDriver: jest.fn(),
        findPaymentsForRideIds: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private earnings routes', () => {
    let dependencies;
    let app;
    let driverUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        driverUser = createPrivateUser();
    });

    const mockDriverContext = () => {
        dependencies.earningsDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.earningsDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile());
    };

    test('options returns earnings metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.periods).toContain(EARNINGS_PERIODS.THIS_WEEK);
        expect(response.body.data.options.statementPeriods).toContain(EARNINGS_STATEMENT_PERIODS.WEEKLY);
        expect(response.body.data.options.statuses).toContain(EARNINGS_STATUSES.AVAILABLE);
    });

    test('summary returns driver earning totals for the current week', async () => {
        mockDriverContext();
        dependencies.earningsDao.findEarningRides.mockResolvedValue([
            createRide(),
            createRide({
                id: 'cash-ride-id',
                _id: 'cash-ride-id',
                bookingCode: 'BOOK-002',
                fareSnapshot: {
                    ...createRide().fareSnapshot,
                    totalFare: 80,
                    surgeMultiplier: 1
                },
                paymentMethod: PAYMENT_METHODS.CASH
            }),
            createRide({
                id: 'cancelled-ride-id',
                _id: 'cancelled-ride-id',
                bookingCode: 'BOOK-003',
                status: RIDE_BOOKING_STATUSES.CANCELLED,
                cancellation: {
                    cancelledAt: new Date('2026-01-07T08:00:00.000Z')
                }
            })
        ]);
        dependencies.earningsDao.findPaymentsForRideIds.mockResolvedValue([
            createPayment(),
            createPayment({
                id: 'cash-payment-id',
                _id: 'cash-payment-id',
                paymentCode: 'PAY-002',
                rideId: 'cash-ride-id',
                method: PAYMENT_METHODS.CASH,
                fareAmount: 80,
                tipAmount: 0,
                amount: 80
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/summary?period=${EARNINGS_PERIODS.THIS_WEEK}`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.earnings.summary.rideCount).toBe(3);
        expect(response.body.data.earnings.summary.availableRides).toBe(1);
        expect(response.body.data.earnings.summary.settledRides).toBe(1);
        expect(response.body.data.earnings.summary.cancelledRides).toBe(1);
        expect(response.body.data.earnings.summary.netEarnings).toBe(157);
        expect(response.body.data.earnings.summary.availableForPayout).toBe(157);
        expect(dependencies.earningsDao.findEarningRides).toHaveBeenCalledWith({
            driverId: 'drv_cab_rajesh',
            from: WEEK_START,
            to: FIXED_NOW,
            limit: 100
        });
    });

    test('rides returns filtered earning ride items', async () => {
        mockDriverContext();
        dependencies.earningsDao.findEarningRides.mockResolvedValue([
            createRide(),
            createRide({
                id: 'pending-ride-id',
                _id: 'pending-ride-id',
                bookingCode: 'BOOK-004',
                confirmedAt: new Date('2026-01-08T08:00:00.000Z'),
                fareSnapshot: {
                    ...createRide().fareSnapshot,
                    durationMinutes: 60
                }
            })
        ]);
        dependencies.earningsDao.findPaymentsForRideIds.mockResolvedValue([
            createPayment()
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides?status=${EARNINGS_STATUSES.AVAILABLE}&limit=5`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.earnings.rides).toHaveLength(1);
        expect(response.body.data.earnings.rides[0].bookingCode).toBe('BOOK-001');
        expect(response.body.data.earnings.rides[0].netEarning).toBe(93);
        expect(dependencies.earningsDao.findEarningRides).toHaveBeenCalledWith({
            driverId: 'drv_cab_rajesh',
            from: WEEK_START,
            to: FIXED_NOW,
            limit: 5
        });
    });

    test('ride detail returns route, payment, and earning components', async () => {
        mockDriverContext();
        dependencies.earningsDao.findRideByIdForDriver.mockResolvedValue(createRide());
        dependencies.earningsDao.findPaymentsForRideIds.mockResolvedValue([
            createPayment()
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ride.bookingCode).toBe('BOOK-001');
        expect(response.body.data.ride.route.pickup.address).toBe('Salt Lake');
        expect(response.body.data.ride.components.driverFare).toBe(80);
        expect(response.body.data.ride.components.incentiveAmount).toBe(3);
        expect(response.body.data.ride.components.netEarning).toBe(93);
    });

    test('statements groups earnings by month', async () => {
        mockDriverContext();
        dependencies.earningsDao.findEarningRides.mockResolvedValue([
            createRide(),
            createRide({
                id: 'older-ride-id',
                _id: 'older-ride-id',
                bookingCode: 'BOOK-005',
                confirmedAt: new Date('2026-01-02T07:00:00.000Z'),
                createdAt: new Date('2026-01-02T06:55:00.000Z')
            })
        ]);
        dependencies.earningsDao.findPaymentsForRideIds.mockResolvedValue([
            createPayment(),
            createPayment({
                id: 'older-payment-id',
                _id: 'older-payment-id',
                rideId: 'older-ride-id',
                paymentCode: 'PAY-005'
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/statements?period=${EARNINGS_PERIODS.THIS_MONTH}&groupBy=${EARNINGS_STATEMENT_PERIODS.MONTHLY}`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.earnings.statements).toHaveLength(1);
        expect(response.body.data.earnings.statements[0].statementId).toBe('earnings-monthly-2026-01');
        expect(response.body.data.earnings.statements[0].summary.netEarnings).toBe(186);
    });

    test('simulate returns payout math without reading rides', async () => {
        mockDriverContext();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/simulate`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                fareAmount: 200,
                tipAmount: 20,
                surgeMultiplier: 1.5,
                deductionAmount: 10
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.components.platformFee).toBe(40);
        expect(response.body.data.components.driverFare).toBe(160);
        expect(response.body.data.components.incentiveAmount).toBe(15);
        expect(response.body.data.netEarning).toBe(185);
        expect(dependencies.earningsDao.findEarningRides).not.toHaveBeenCalled();
    });

    test('admin users cannot access driver earnings routes', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(403);
    });

    test('driver users without earnings permission are rejected', async () => {
        const limitedDriver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER, {
            permissions: DEFAULT_PRIVATE_ROLE_PERMISSIONS[PRIVATE_AUTH_ROLES.DRIVER]
                .filter((permission) => permission !== PRIVATE_AUTH_PERMISSIONS.DRIVER_EARNINGS_READ)
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/summary`,
            headers: authHeaderFor(dependencies, limitedDriver)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('custom period validates date range', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/summary?period=${EARNINGS_PERIODS.CUSTOM}`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({
                path: 'query.from'
            })
        ]));
    });
});
