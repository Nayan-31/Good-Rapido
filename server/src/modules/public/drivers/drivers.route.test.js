import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import { FARE_VEHICLE_TYPES } from '../fare/fare.constants.js';
import { RIDE_BOOKING_RISK_LEVELS } from '../ride-booking/ride-booking.constants.js';
import { DRIVER_SORT_OPTIONS, DRIVER_TRUST_LEVELS } from './drivers.constants.js';
import { createDriversRouter } from './drivers.route.js';

const BASE_PATH = '/api/v1/public/drivers';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createDriversRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createDriver = (overrides = {}) => ({
    id: 'drv_cab_rajesh',
    fullName: 'Rajesh Kumar',
    vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
    vehicleName: 'Suzuki Dzire',
    vehicleNumber: 'WB 01 AC 4522',
    vehicleColor: 'White',
    rating: 4.9,
    etaMinutes: 4,
    distanceKm: 0.8,
    averageFarePerKm: 15,
    routeFairnessScore: 97,
    detourPercentage: 2,
    onTimeArrivalScore: 94,
    cancellationRatio: 1.2,
    trustScore: 95,
    reliabilityScore: 97,
    cancellationRiskScore: 7,
    cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.LOW,
    completedRides: 2480,
    ...overrides
});

const createDependencies = () => ({
    driversDao: {
        findAll: jest.fn(),
        findById: jest.fn()
    },
    tokenService: new TokenService()
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public drivers routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('list returns driver transparency summaries with filters', async () => {
        const user = createUser();
        const drivers = [
            createDriver(),
            createDriver({
                id: 'drv_cab_neha',
                fullName: 'Neha Das',
                rating: 4.7,
                trustScore: 88,
                routeFairnessScore: 92,
                onTimeArrivalScore: 90,
                cancellationRiskScore: 31,
                cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.MEDIUM
            })
        ];

        dependencies.driversDao.findAll.mockResolvedValue(drivers);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}?vehicleType=${FARE_VEHICLE_TYPES.CAB_ECONOMY}&sortBy=${DRIVER_SORT_OPTIONS.ROUTE_FAIRNESS}&limit=2`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.drivers).toHaveLength(2);
        expect(response.body.data.drivers[0].driverId).toBe('drv_cab_rajesh');
        expect(response.body.data.drivers[0].trustLevel).toBe(DRIVER_TRUST_LEVELS.EXCELLENT);
        expect(response.body.data.summary.resultCount).toBe(2);
        expect(response.body.data.summary.averageTrustScore).toBe(91.5);
        expect(dependencies.driversDao.findAll).toHaveBeenCalledWith({
            vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
            sortBy: DRIVER_SORT_OPTIONS.ROUTE_FAIRNESS,
            limit: 2
        });
    });

    test('profile returns trust, route fairness, and cancellation risk sections', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);
        const driver = createDriver();

        dependencies.driversDao.findById.mockResolvedValue(driver);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/drv_cab_rajesh`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.driver.fullName).toBe('Rajesh Kumar');
        expect(response.body.data.driver.trust.score).toBe(95);
        expect(response.body.data.driver.routeFairness.routeAccuracyScore).toBe(96);
        expect(response.body.data.driver.cancellationRisk.level).toBe(RIDE_BOOKING_RISK_LEVELS.LOW);
        expect(response.body.data.driver.transparencyBadges).toContain('Low cancellation risk');
        expect(dependencies.driversDao.findById).toHaveBeenCalledWith('drv_cab_rajesh');
    });

    test('trust report explains the trust score dimensions', async () => {
        const user = createUser();

        dependencies.driversDao.findById.mockResolvedValue(createDriver());

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/drv_cab_rajesh/trust`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.trust.trustScore).toBe(95);
        expect(response.body.data.trust.metrics).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'reliability',
                score: 97
            }),
            expect.objectContaining({
                code: 'cancellation_behavior',
                score: 93
            })
        ]));
    });

    test('route fairness report exposes detour and arrival signals', async () => {
        const user = createUser();

        dependencies.driversDao.findById.mockResolvedValue(createDriver());

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/drv_cab_rajesh/route-fairness`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.routeFairness.score).toBe(97);
        expect(response.body.data.routeFairness.detourPercentage).toBe(2);
        expect(response.body.data.routeFairness.routeAccuracyScore).toBe(96);
    });

    test('cancellation risk report gives rider guidance', async () => {
        const user = createUser();

        dependencies.driversDao.findById.mockResolvedValue(createDriver({
            cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.MEDIUM,
            cancellationRiskScore: 31,
            cancellationRatio: 3.8
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/drv_cab_neha/cancellation-risk`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.cancellationRisk.score).toBe(31);
        expect(response.body.data.cancellationRisk.level).toBe(RIDE_BOOKING_RISK_LEVELS.MEDIUM);
        expect(response.body.data.cancellationRisk.riderGuidance).toBe('Consider backup options if timing is critical');
    });

    test('missing driver profiles return not found', async () => {
        const user = createUser();

        dependencies.driversDao.findById.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/missing-driver`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Driver not found');
    });

    test('drivers routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: BASE_PATH
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('drivers routes return validation errors for invalid filters', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}?vehicleType=rocket`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
