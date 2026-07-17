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
import { DRIVER_AVAILABILITY_STATUSES } from '../../private/driver-availability/driver-availability.constants.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
    MATCHING_ENGINE_DRIVER_SOURCES
} from './matching-engine.constants.js';
import { createMatchingEngineRouter } from './matching-engine.route.js';

const BASE_PATH = '/api/v1/core/matching-engine';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createMatchingEngineRouter(dependencies));
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

const createMatchPayload = (overrides = {}) => ({
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
    vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
    serviceZone: MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
    limit: 2,
    ...overrides
});

const createLiveDriver = (overrides = {}) => ({
    id: 'driver-profile-id',
    _id: 'driver-profile-id',
    authUserId: 'private-driver-id',
    profile: {
        displayName: 'Live Driver'
    },
    service: {
        vehicleTypes: [
            FARE_VEHICLE_TYPES.BIKE,
            FARE_VEHICLE_TYPES.CAB_ECONOMY
        ],
        serviceZone: 'kolkata'
    },
    vehicles: [{
        type: FARE_VEHICLE_TYPES.CAB_ECONOMY,
        make: 'Tata',
        model: 'Tigor',
        color: 'Blue',
        registrationNumber: 'WB 10 ME 2026',
        isPrimary: true
    }],
    availability: {
        status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
        currentLocation: {
            type: 'Point',
            coordinates: [88.346, 22.584]
        },
        activeServiceZones: ['kolkata'],
        lastHeartbeatAt: FIXED_NOW
    },
    trustScore: 96,
    reliabilityScore: 94,
    routeFairnessScore: 95,
    cancellationRiskScore: 9,
    cancellationRiskLevel: 'low',
    cancellationRatio: 1,
    detourPercentage: 2,
    onTimeArrivalScore: 94,
    completedRides: 620,
    ...overrides
});

const createDependencies = () => ({
    matchingEngineDao: {
        findPublicUserById: jest.fn(),
        findPrivateUserById: jest.fn(),
        findAvailableDrivers: jest.fn()
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

describe('core matching engine routes', () => {
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

    test('options returns matching engine metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.vehicleTypes).toContain(FARE_VEHICLE_TYPES.CAB_ECONOMY);
        expect(response.body.data.options.driverSources).toContain(MATCHING_ENGINE_DRIVER_SOURCES.LIVE_AVAILABILITY);
        expect(response.body.data.options.scoreWeights.TRUST).toBeGreaterThan(0);
    });

    test('public user can match fallback trusted drivers', async () => {
        dependencies.matchingEngineDao.findPublicUserById.mockResolvedValue(riderUser);
        dependencies.matchingEngineDao.findAvailableDrivers.mockResolvedValue([]);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/match`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: createMatchPayload()
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.matching.matches).toHaveLength(2);
        expect(response.body.data.matching.matches[0].driverId).toBe('drv_cab_rajesh');
        expect(response.body.data.matching.matches[0].source).toBe(MATCHING_ENGINE_DRIVER_SOURCES.STATIC_POOL);
        expect(response.body.data.matching.matches[0].match.score).toBeGreaterThan(0);
        expect(response.body.data.matching.summary.totalMatches).toBe(2);
        expect(dependencies.matchingEngineDao.findAvailableDrivers).toHaveBeenCalledWith({
            vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
            serviceZone: MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
            limit: 2
        });
    });

    test('ops user can match live available drivers', async () => {
        dependencies.matchingEngineDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.matchingEngineDao.findAvailableDrivers.mockResolvedValue([
            createLiveDriver()
        ]);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/match`,
            headers: privateAuthHeaderFor(dependencies, opsUser),
            body: createMatchPayload({
                serviceZone: 'Kolkata'
            })
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.matching.matches).toHaveLength(1);
        expect(response.body.data.matching.matches[0].source).toBe(MATCHING_ENGINE_DRIVER_SOURCES.LIVE_AVAILABILITY);
        expect(response.body.data.matching.matches[0].vehicle.type).toBe(FARE_VEHICLE_TYPES.CAB_ECONOMY);
        expect(response.body.data.matching.matches[0].vehicle.name).toBe('Tata Tigor');
        expect(response.body.data.matching.summary.serviceZone).toBe('kolkata');
    });

    test('private matching access requires ride ops read permission', async () => {
        const privateUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: []
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/match`,
            headers: privateAuthHeaderFor(dependencies, privateUser),
            body: createMatchPayload()
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Ride ops read permission is required');
    });

    test('matching routes return validation errors for invalid payloads', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/match`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: createMatchPayload({
                dropoff: {
                    address: 'Same place',
                    latitude: 22.5851,
                    longitude: 88.3468
                }
            })
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
