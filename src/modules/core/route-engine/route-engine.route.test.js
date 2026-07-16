import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { FARE_VEHICLE_TYPES } from '../../public/fare/fare.constants.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    ROUTE_ENGINE_ROUTE_PREFERENCES,
    ROUTE_ENGINE_TRAFFIC_LEVELS
} from './route-engine.constants.js';
import { createRouteEngineRouter } from './route-engine.route.js';

const BASE_PATH = '/api/v1/core/route-engine';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createRouteEngineRouter(dependencies));
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

const createPlanPayload = (overrides = {}) => ({
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
    vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
    serviceZone: ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    routePreference: ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED,
    requestedAt: '2026-01-01T08:10:00.000+05:30',
    ...overrides
});

const createDependencies = () => ({
    routeEngineDao: {
        findPublicUserById: jest.fn(),
        findPrivateUserById: jest.fn()
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

describe('core route engine routes', () => {
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

    test('options returns route engine metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.vehicleTypes).toContain(FARE_VEHICLE_TYPES.CAB_ECONOMY);
        expect(response.body.data.options.routePreferences).toContain(ROUTE_ENGINE_ROUTE_PREFERENCES.LOW_TRAFFIC);
        expect(response.body.data.options.trafficLevels).toContain(ROUTE_ENGINE_TRAFFIC_LEVELS.HEAVY);
    });

    test('public user can calculate a route plan with waypoint segments', async () => {
        dependencies.routeEngineDao.findPublicUserById.mockResolvedValue(riderUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/plan`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: createPlanPayload({
                waypoints: [{
                    address: 'Esplanade',
                    latitude: 22.5646,
                    longitude: 88.3517
                }]
            })
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.route.distance.routeDistanceKm).toBeGreaterThan(
            response.body.data.route.distance.straightLineKm
        );
        expect(response.body.data.route.duration.estimatedMinutes).toBeGreaterThan(0);
        expect(response.body.data.route.segments).toHaveLength(2);
        expect(response.body.data.route.alternatives).toHaveLength(3);
        expect(response.body.data.route.alternativePickups).toHaveLength(2);
        expect(response.body.data.route.quality.score).toBeGreaterThan(0);
        expect(response.body.data.route.traffic.level).toBe(ROUTE_ENGINE_TRAFFIC_LEVELS.MODERATE);
        expect(dependencies.routeEngineDao.findPublicUserById).toHaveBeenCalledWith(riderUser.id);
    });

    test('ops user can calculate low traffic route plans', async () => {
        dependencies.routeEngineDao.findPrivateUserById.mockResolvedValue(opsUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/plan`,
            headers: privateAuthHeaderFor(dependencies, opsUser),
            body: createPlanPayload({
                serviceZone: 'Kolkata',
                routePreference: ROUTE_ENGINE_ROUTE_PREFERENCES.LOW_TRAFFIC
            })
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.route.serviceZone).toBe('kolkata');
        expect(response.body.data.route.routePreference).toBe(ROUTE_ENGINE_ROUTE_PREFERENCES.LOW_TRAFFIC);
        expect(response.body.data.route.guidance.nextAction).toEqual(expect.any(String));
        expect(response.body.data.route.geometry.polyline.length).toBeGreaterThanOrEqual(3);
    });

    test('private route planning requires ride ops read permission', async () => {
        const privateUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: []
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/plan`,
            headers: privateAuthHeaderFor(dependencies, privateUser),
            body: createPlanPayload()
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Ride ops read permission is required');
    });

    test('route planning rejects repeated consecutive locations', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/plan`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: createPlanPayload({
                dropoff: {
                    address: 'Same place',
                    latitude: 22.5535,
                    longitude: 88.3526
                }
            })
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
