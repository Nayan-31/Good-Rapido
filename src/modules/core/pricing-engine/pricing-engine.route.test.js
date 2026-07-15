import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import {
    FARE_SURGE_LEVELS,
    FARE_VEHICLE_TYPES
} from '../../public/fare/fare.constants.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { PRICING_RULE_STATUSES } from '../../private/pricing/pricing.constants.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    PRICING_ENGINE_RULE_SOURCES
} from './pricing-engine.constants.js';
import { createPricingEngineRouter } from './pricing-engine.route.js';

const BASE_PATH = '/api/v1/core/pricing-engine';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createPricingEngineRouter(dependencies));
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

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.ADMIN, overrides = {}) => ({
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

const createActivePricingRule = (overrides = {}) => ({
    id: 'pricing-rule-id',
    _id: 'pricing-rule-id',
    ruleCode: 'PRICE-CAB_ECONOMY-KOLKATA-20260101081000',
    label: 'Kolkata economy cab standard',
    vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
    serviceZone: 'kolkata',
    pricing: {
        currency: 'INR',
        baseFare: 58,
        perKm: 17,
        perMinute: 2.4,
        minimumFare: 82,
        platformFee: 16,
        taxRate: 0.05,
        averageSpeedKmph: 26
    },
    surgeRules: {
        morningPeakMultiplier: 1.2,
        eveningPeakMultiplier: 1.35,
        lateNightMultiplier: 1.14,
        maxSurgeMultiplier: 1.8
    },
    status: PRICING_RULE_STATUSES.ACTIVE,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveUntil: null,
    ...overrides
});

const createQuotePayload = (overrides = {}) => ({
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
    serviceZone: PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    requestedAt: '2026-01-01T08:10:00.000Z',
    ...overrides
});

const createDependencies = () => ({
    pricingEngineDao: {
        findPublicUserById: jest.fn(),
        findPrivateUserById: jest.fn(),
        findActivePricingRule: jest.fn()
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

describe('core pricing engine routes', () => {
    let dependencies;
    let app;
    let riderUser;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        riderUser = createPublicUser();
        adminUser = createPrivateUser();
    });

    test('options returns pricing engine metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.vehicleTypes).toContain(FARE_VEHICLE_TYPES.CAB_ECONOMY);
        expect(response.body.data.options.surgeLevels).toContain(FARE_SURGE_LEVELS.HIGH);
        expect(response.body.data.options.ruleSources).toContain(PRICING_ENGINE_RULE_SOURCES.ACTIVE_RULE);
    });

    test('public user can calculate a baseline pricing quote', async () => {
        dependencies.pricingEngineDao.findPublicUserById.mockResolvedValue(riderUser);
        dependencies.pricingEngineDao.findActivePricingRule.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/quote`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: createQuotePayload()
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.quote.vehicleType).toBe(FARE_VEHICLE_TYPES.BIKE);
        expect(response.body.data.quote.breakdown.totalFare).toBeGreaterThan(0);
        expect(response.body.data.quote.pricingRule.source).toBe(PRICING_ENGINE_RULE_SOURCES.BASELINE);
        expect(response.body.data.quote.alternativePickups).toHaveLength(2);
        expect(dependencies.pricingEngineDao.findActivePricingRule).toHaveBeenCalledWith({
            vehicleType: FARE_VEHICLE_TYPES.BIKE,
            serviceZone: PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
            now: expect.any(Date)
        });
    });

    test('private user can compare vehicle pricing with active rules and fallback rules', async () => {
        dependencies.pricingEngineDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingEngineDao.findActivePricingRule.mockImplementation(async ({ vehicleType, serviceZone }) => {
            if (vehicleType === FARE_VEHICLE_TYPES.CAB_ECONOMY && serviceZone === 'kolkata') {
                return createActivePricingRule();
            }

            return null;
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/compare`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                ...createQuotePayload({
                    serviceZone: 'Kolkata'
                }),
                vehicleTypes: [
                    FARE_VEHICLE_TYPES.BIKE,
                    FARE_VEHICLE_TYPES.CAB_ECONOMY
                ],
                vehicleType: undefined
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.comparison.quotes).toHaveLength(2);
        expect(response.body.data.comparison.recommendedQuote.vehicleType).toEqual(expect.any(String));
        expect(response.body.data.comparison.quotes.find(
            (quote) => quote.vehicleType === FARE_VEHICLE_TYPES.CAB_ECONOMY
        ).pricingRule.source).toBe(PRICING_ENGINE_RULE_SOURCES.ACTIVE_RULE);
        expect(response.body.data.comparison.quotes.find(
            (quote) => quote.vehicleType === FARE_VEHICLE_TYPES.BIKE
        ).pricingRule.source).toBe(PRICING_ENGINE_RULE_SOURCES.BASELINE);
    });

    test('private pricing access requires pricing read permission', async () => {
        const privateUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: []
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/quote`,
            headers: privateAuthHeaderFor(dependencies, privateUser),
            body: createQuotePayload()
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Pricing read permission is required');
    });

    test('quote rejects invalid locations', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/quote`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: createQuotePayload({
                dropoff: {
                    address: 'Park Street',
                    latitude: 22.5535,
                    longitude: 88.3526
                }
            })
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });
});
