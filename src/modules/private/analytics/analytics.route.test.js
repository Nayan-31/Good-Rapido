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
    ANALYTICS_GROUP_BY,
    ANALYTICS_PERIODS
} from './analytics.constants.js';
import { createAnalyticsRouter } from './analytics.route.js';
import { RIDE_BOOKING_STATUSES } from '../../public/ride-booking/ride-booking.constants.js';
import {
    PAYMENT_METHODS,
    PAYMENT_STATUSES
} from '../../public/payments/payments.constants.js';
import {
    DISPUTE_PRIORITIES,
    DISPUTE_STATUSES,
    DISPUTE_TYPES
} from '../../public/disputes/disputes.constants.js';
import { RATING_SENTIMENTS } from '../../public/ratings/ratings.constants.js';

const BASE_PATH = '/api/v1/private/analytics';
const FIXED_NOW = new Date('2026-01-08T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createAnalyticsRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.ADMIN, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: role === PRIVATE_AUTH_ROLES.DRIVER ? '+919111111111' : '+919222222222',
    employeeCode: `${role.toUpperCase()}-001`,
    department: 'operations',
    serviceZone: 'kolkata',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createRide = (overrides = {}) => ({
    id: 'ride-id',
    _id: 'ride-id',
    bookingCode: 'BOOK-001',
    status: RIDE_BOOKING_STATUSES.CONFIRMED,
    vehicleType: 'cab_economy',
    selectedDriver: {
        driverId: 'drv_cab_rajesh',
        fullName: 'Rajesh Kumar'
    },
    fareSnapshot: {
        totalFare: 100,
        distanceKm: 8,
        durationMinutes: 24,
        surgeMultiplier: 1.2
    },
    createdAt: new Date('2026-01-07T07:00:00.000Z'),
    updatedAt: new Date('2026-01-07T07:30:00.000Z'),
    ...overrides
});

const createPayment = (overrides = {}) => ({
    id: 'payment-id',
    _id: 'payment-id',
    paymentCode: 'PAY-001',
    method: PAYMENT_METHODS.UPI,
    status: PAYMENT_STATUSES.SUCCEEDED,
    fareAmount: 100,
    tipAmount: 10,
    discountAmount: 5,
    amount: 105,
    refund: null,
    createdAt: new Date('2026-01-07T07:35:00.000Z'),
    updatedAt: new Date('2026-01-07T07:36:00.000Z'),
    ...overrides
});

const createDispute = (overrides = {}) => ({
    id: 'dispute-id',
    _id: 'dispute-id',
    disputeCode: 'DSP-001',
    type: DISPUTE_TYPES.FARE_OVERCHARGE,
    status: DISPUTE_STATUSES.SUBMITTED,
    priority: DISPUTE_PRIORITIES.URGENT,
    requestedRefundAmount: 80,
    createdAt: new Date('2026-01-07T08:00:00.000Z'),
    latestActivityAt: new Date('2026-01-07T08:00:00.000Z'),
    ...overrides
});

const createRating = (overrides = {}) => ({
    id: 'rating-id',
    _id: 'rating-id',
    score: 5,
    sentiment: RATING_SENTIMENTS.POSITIVE,
    submittedAt: new Date('2026-01-07T09:00:00.000Z'),
    createdAt: new Date('2026-01-07T09:00:00.000Z'),
    ...overrides
});

const createDriverProfile = (overrides = {}) => ({
    id: 'driver-profile-id',
    _id: 'driver-profile-id',
    driverCode: 'drv_cab_rajesh',
    approvalStatus: 'approved',
    service: {
        serviceZone: 'kolkata'
    },
    availability: {
        status: 'online'
    },
    latestActivityAt: new Date('2026-01-07T08:00:00.000Z'),
    ...overrides
});

const createTrustProfile = (overrides = {}) => ({
    id: 'trust-profile-id',
    _id: 'trust-profile-id',
    subjectType: 'driver',
    subjectId: 'drv_cab_rajesh',
    riskLevel: 'high',
    reviewStatus: 'open',
    scores: {
        overall: 55
    },
    createdAt: new Date('2026-01-07T08:30:00.000Z'),
    updatedAt: new Date('2026-01-07T08:30:00.000Z'),
    ...overrides
});

const createFraudCase = (overrides = {}) => ({
    id: 'fraud-case-id',
    _id: 'fraud-case-id',
    caseCode: 'FRAUD-001',
    caseType: 'promo_abuse',
    severity: 'critical',
    status: 'open',
    riskScore: 91,
    createdAt: new Date('2026-01-07T08:45:00.000Z'),
    updatedAt: new Date('2026-01-07T08:45:00.000Z'),
    ...overrides
});

const createDependencies = () => ({
    analyticsDao: {
        findPrivateUserById: jest.fn(),
        findRideBookings: jest.fn(),
        findPayments: jest.fn(),
        findDisputes: jest.fn(),
        findRatings: jest.fn(),
        findDriverProfiles: jest.fn(),
        findTrustProfiles: jest.fn(),
        findFraudCases: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private analytics routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser();
    });

    const mockActiveUser = () => {
        dependencies.analyticsDao.findPrivateUserById.mockResolvedValue(adminUser);
    };

    const mockAllDatasets = () => {
        dependencies.analyticsDao.findRideBookings.mockResolvedValue([
            createRide(),
            createRide({
                id: 'cancelled-ride-id',
                _id: 'cancelled-ride-id',
                status: RIDE_BOOKING_STATUSES.CANCELLED,
                vehicleType: 'bike',
                fareSnapshot: {
                    totalFare: 40,
                    distanceKm: 3,
                    durationMinutes: 12
                }
            })
        ]);
        dependencies.analyticsDao.findPayments.mockResolvedValue([
            createPayment(),
            createPayment({
                id: 'refunded-payment-id',
                _id: 'refunded-payment-id',
                method: PAYMENT_METHODS.CARD,
                status: PAYMENT_STATUSES.REFUNDED,
                fareAmount: 40,
                tipAmount: 0,
                discountAmount: 0,
                amount: 40,
                refund: {
                    amount: 20
                }
            })
        ]);
        dependencies.analyticsDao.findDisputes.mockResolvedValue([
            createDispute()
        ]);
        dependencies.analyticsDao.findRatings.mockResolvedValue([
            createRating(),
            createRating({
                id: 'negative-rating-id',
                _id: 'negative-rating-id',
                score: 2,
                sentiment: RATING_SENTIMENTS.NEGATIVE
            })
        ]);
        dependencies.analyticsDao.findDriverProfiles.mockResolvedValue([
            createDriverProfile(),
            createDriverProfile({
                id: 'pending-driver-id',
                _id: 'pending-driver-id',
                driverCode: 'drv_bike_arjun',
                approvalStatus: 'pending',
                availability: {
                    status: 'offline'
                }
            })
        ]);
        dependencies.analyticsDao.findTrustProfiles.mockResolvedValue([
            createTrustProfile()
        ]);
        dependencies.analyticsDao.findFraudCases.mockResolvedValue([
            createFraudCase()
        ]);
    };

    test('options returns analytics metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.periods).toContain(ANALYTICS_PERIODS.THIS_WEEK);
        expect(response.body.data.options.groupBy).toContain(ANALYTICS_GROUP_BY.DAY);
        expect(response.body.data.options.metrics).toContain('revenue');
    });

    test('overview returns cross-domain analytics summary', async () => {
        mockActiveUser();
        mockAllDatasets();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/overview?period=${ANALYTICS_PERIODS.THIS_WEEK}&limit=10`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.analytics.summary.rides.totalRides).toBe(2);
        expect(response.body.data.analytics.summary.revenue.netRevenue).toBe(125);
        expect(response.body.data.analytics.summary.disputes.openDisputes).toBe(1);
        expect(response.body.data.analytics.summary.ratings.averageScore).toBe(3.5);
        expect(response.body.data.analytics.summary.drivers.onlineDrivers).toBe(1);
        expect(response.body.data.analytics.summary.trustSafety.openFraudCases).toBe(1);
        expect(dependencies.analyticsDao.findRideBookings).toHaveBeenCalledWith(expect.objectContaining({
            limit: 10
        }));
    });

    test('rides endpoint returns grouped ride analytics', async () => {
        mockActiveUser();
        dependencies.analyticsDao.findRideBookings.mockResolvedValue([
            createRide(),
            createRide({
                id: 'bike-ride-id',
                _id: 'bike-ride-id',
                vehicleType: 'bike',
                fareSnapshot: {
                    totalFare: 50,
                    distanceKm: 4,
                    durationMinutes: 14
                }
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides?groupBy=${ANALYTICS_GROUP_BY.DAY}`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.analytics.summary.totalRides).toBe(2);
        expect(response.body.data.analytics.series[0].bucket).toBe('2026-01-07');
        expect(response.body.data.analytics.byVehicleType).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'bike',
                totalRides: 1
            }),
            expect.objectContaining({
                key: 'cab_economy',
                totalRides: 1
            })
        ]));
    });

    test('revenue endpoint returns payment analytics by method', async () => {
        mockActiveUser();
        dependencies.analyticsDao.findPayments.mockResolvedValue([
            createPayment(),
            createPayment({
                id: 'cash-payment-id',
                _id: 'cash-payment-id',
                method: PAYMENT_METHODS.CASH,
                status: PAYMENT_STATUSES.SUCCEEDED,
                fareAmount: 80,
                tipAmount: 0,
                discountAmount: 0,
                amount: 80
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/revenue?groupBy=${ANALYTICS_GROUP_BY.DAY}`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.analytics.summary.grossRevenue).toBe(185);
        expect(response.body.data.analytics.summary.succeededPayments).toBe(2);
        expect(response.body.data.analytics.byMethod).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: PAYMENT_METHODS.CASH,
                grossRevenue: 80
            }),
            expect.objectContaining({
                key: PAYMENT_METHODS.UPI,
                grossRevenue: 105
            })
        ]));
    });

    test('drivers endpoint returns driver supply and top driver analytics', async () => {
        mockActiveUser();
        dependencies.analyticsDao.findDriverProfiles.mockResolvedValue([
            createDriverProfile(),
            createDriverProfile({
                id: 'offline-driver-id',
                _id: 'offline-driver-id',
                driverCode: 'drv_bike_arjun',
                approvalStatus: 'under_review',
                service: {
                    serviceZone: 'howrah'
                },
                availability: {
                    status: 'offline'
                }
            })
        ]);
        dependencies.analyticsDao.findRideBookings.mockResolvedValue([
            createRide(),
            createRide({
                id: 'second-ride-id',
                _id: 'second-ride-id',
                fareSnapshot: {
                    totalFare: 120
                }
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/drivers`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.analytics.summary.totalDrivers).toBe(2);
        expect(response.body.data.analytics.summary.onlineDrivers).toBe(1);
        expect(response.body.data.analytics.topDrivers[0]).toEqual(expect.objectContaining({
            driverId: 'drv_cab_rajesh',
            rideCount: 2,
            totalFare: 220
        }));
    });

    test('trust-safety endpoint returns disputes, ratings, trust, and fraud analytics', async () => {
        mockActiveUser();
        dependencies.analyticsDao.findDisputes.mockResolvedValue([
            createDispute()
        ]);
        dependencies.analyticsDao.findRatings.mockResolvedValue([
            createRating()
        ]);
        dependencies.analyticsDao.findTrustProfiles.mockResolvedValue([
            createTrustProfile()
        ]);
        dependencies.analyticsDao.findFraudCases.mockResolvedValue([
            createFraudCase()
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/trust-safety`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.analytics.summary.disputes.urgentDisputes).toBe(1);
        expect(response.body.data.analytics.summary.trust.highRiskProfiles).toBe(1);
        expect(response.body.data.analytics.summary.fraud.criticalCases).toBe(1);
        expect(response.body.data.analytics.highRiskTrustProfiles).toHaveLength(1);
        expect(response.body.data.analytics.openFraudCases).toHaveLength(1);
    });

    test('forecast returns projected rides and revenue without reading datasets', async () => {
        mockActiveUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/forecast`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                baselineRides: 10,
                averageFare: 100,
                growthRate: 0.1,
                platformFeeRate: 0.2,
                forecastDays: 3
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.analytics.forecast).toHaveLength(3);
        expect(response.body.data.analytics.summary.projectedRides).toBe(33);
        expect(response.body.data.analytics.summary.projectedGrossRevenue).toBe(3300);
        expect(response.body.data.analytics.summary.projectedPlatformRevenue).toBe(660);
        expect(dependencies.analyticsDao.findRideBookings).not.toHaveBeenCalled();
    });

    test('driver users cannot access analytics routes', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
    });

    test('ops users without analytics permission are rejected', async () => {
        const limitedOps = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: DEFAULT_PRIVATE_ROLE_PERMISSIONS[PRIVATE_AUTH_ROLES.OPS]
                .filter((permission) => permission !== PRIVATE_AUTH_PERMISSIONS.ANALYTICS_READ)
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/overview`,
            headers: authHeaderFor(dependencies, limitedOps)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('custom period validates date range', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/overview?period=${ANALYTICS_PERIODS.CUSTOM}`,
            headers: authHeaderFor(dependencies, adminUser)
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
