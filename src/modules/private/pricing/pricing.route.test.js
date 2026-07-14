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
import { FARE_VEHICLE_TYPES } from '../../public/fare/fare.constants.js';
import {
    PRICING_DEFAULT_SERVICE_ZONE,
    PRICING_RULE_STATUSES
} from './pricing.constants.js';
import { createPricingRouter } from './pricing.route.js';

const BASE_PATH = '/api/v1/private/pricing';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createPricingRouter(dependencies));
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

const createPricingRule = (overrides = {}) => ({
    id: 'pricing-rule-id',
    _id: 'pricing-rule-id',
    ruleCode: 'PRICE-CAB_ECONOMY-KOLKATA-20260101081000',
    label: 'Kolkata economy cab standard',
    description: 'Standard pricing for Kolkata economy cab rides',
    vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
    serviceZone: 'kolkata',
    pricing: {
        currency: 'INR',
        baseFare: 60,
        perKm: 18,
        perMinute: 2.5,
        minimumFare: 85,
        platformFee: 18,
        taxRate: 0.05,
        averageSpeedKmph: 26
    },
    surgeRules: {
        morningPeakMultiplier: 1.18,
        eveningPeakMultiplier: 1.32,
        lateNightMultiplier: 1.12,
        maxSurgeMultiplier: 1.8
    },
    status: PRICING_RULE_STATUSES.DRAFT,
    effectiveFrom: FIXED_NOW,
    effectiveUntil: null,
    notes: 'Initial rule',
    createdBy: 'admin-id',
    updatedBy: 'admin-id',
    activatedAt: null,
    archivedAt: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createRulePayload = (overrides = {}) => ({
    label: 'Kolkata economy cab standard',
    description: 'Standard pricing for Kolkata economy cab rides',
    vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
    serviceZone: 'Kolkata',
    pricing: {
        currency: 'inr',
        baseFare: 60,
        perKm: 18,
        perMinute: 2.5,
        minimumFare: 85,
        platformFee: 18,
        taxRate: 0.05,
        averageSpeedKmph: 26
    },
    surgeRules: {
        eveningPeakMultiplier: 1.32,
        maxSurgeMultiplier: 1.8
    },
    effectiveFrom: '2026-01-01T08:10:00.000Z',
    notes: 'Initial rule',
    ...overrides
});

const createDependencies = () => ({
    pricingDao: {
        findPrivateUserById: jest.fn(),
        findDashboardRules: jest.fn(),
        findRules: jest.fn(),
        findById: jest.fn(),
        findActiveRule: jest.fn(),
        createRule: jest.fn(),
        updateRule: jest.fn(),
        archiveActiveRules: jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 0 })
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private pricing routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser();
    });

    test('options returns pricing metadata and baseline rules', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.vehicleTypes).toContain(FARE_VEHICLE_TYPES.CAB_ECONOMY);
        expect(response.body.data.options.statuses).toContain(PRICING_RULE_STATUSES.ACTIVE);
        expect(response.body.data.options.baselineRules).toEqual(expect.arrayContaining([
            expect.objectContaining({
                vehicleType: FARE_VEHICLE_TYPES.BIKE
            })
        ]));
    });

    test('dashboard returns pricing rule summary and active rules', async () => {
        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.findDashboardRules.mockResolvedValue([
            createPricingRule({
                status: PRICING_RULE_STATUSES.ACTIVE,
                activatedAt: FIXED_NOW
            }),
            createPricingRule({
                id: 'draft-rule-id',
                _id: 'draft-rule-id',
                ruleCode: 'PRICE-BIKE-DEFAULT-20260101081000',
                vehicleType: FARE_VEHICLE_TYPES.BIKE,
                serviceZone: PRICING_DEFAULT_SERVICE_ZONE
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dashboard.summary.totalRules).toBe(2);
        expect(response.body.data.dashboard.summary.activeRules).toBe(1);
        expect(response.body.data.dashboard.activeRules[0].vehicleType).toBe(FARE_VEHICLE_TYPES.CAB_ECONOMY);
    });

    test('list rules passes pricing filters to the dao', async () => {
        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.findRules.mockResolvedValue([
            createPricingRule({
                status: PRICING_RULE_STATUSES.ACTIVE
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rules?status=${PRICING_RULE_STATUSES.ACTIVE}&vehicleType=${FARE_VEHICLE_TYPES.CAB_ECONOMY}&serviceZone=Kolkata&limit=5`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.pricing.rules).toHaveLength(1);
        expect(dependencies.pricingDao.findRules).toHaveBeenCalledWith({
            status: PRICING_RULE_STATUSES.ACTIVE,
            vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
            serviceZone: 'kolkata',
            limit: 5
        });
    });

    test('admin can create a draft pricing rule', async () => {
        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.createRule.mockImplementation(async (payload) => createPricingRule({
            ...payload,
            id: 'pricing-rule-id',
            _id: 'pricing-rule-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules`,
            headers: authHeaderFor(dependencies, adminUser),
            body: createRulePayload()
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.rule.status).toBe(PRICING_RULE_STATUSES.DRAFT);
        expect(response.body.data.rule.pricing.currency).toBe('INR');
        expect(response.body.data.rule.serviceZone).toBe('kolkata');
        expect(dependencies.pricingDao.createRule).toHaveBeenCalledWith(expect.objectContaining({
            ruleCode: expect.stringMatching(/^PRICE-CAB_ECONOMY-KOLKATA-/),
            createdBy: adminUser.id,
            updatedBy: adminUser.id
        }));
    });

    test('admin can update a draft pricing rule', async () => {
        const rule = createPricingRule();

        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.findById.mockResolvedValue(rule);
        dependencies.pricingDao.updateRule.mockImplementation(async (_ruleId, payload) => ({
            ...rule,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rules/pricing-rule-id`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                pricing: {
                    perKm: 19,
                    platformFee: 20
                },
                notes: 'Updated per-km fare after review'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rule.pricing.perKm).toBe(19);
        expect(response.body.data.rule.pricing.platformFee).toBe(20);
        expect(response.body.data.rule.notes).toBe('Updated per-km fare after review');
    });

    test('active pricing rules cannot be edited directly', async () => {
        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.findById.mockResolvedValue(createPricingRule({
            status: PRICING_RULE_STATUSES.ACTIVE
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rules/pricing-rule-id`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                notes: 'Trying to edit active pricing'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only draft pricing rules can be edited');
        expect(dependencies.pricingDao.updateRule).not.toHaveBeenCalled();
    });

    test('admin can activate a pricing rule and archive older active rules', async () => {
        const rule = createPricingRule({
            effectiveFrom: new Date('2025-12-31T00:00:00.000Z')
        });

        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.findById.mockResolvedValue(rule);
        dependencies.pricingDao.updateRule.mockImplementation(async (_ruleId, payload) => ({
            ...rule,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules/pricing-rule-id/activate`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rule.status).toBe(PRICING_RULE_STATUSES.ACTIVE);
        expect(response.body.data.rule.activatedAt).toBe(FIXED_NOW.toISOString());
        expect(dependencies.pricingDao.archiveActiveRules).toHaveBeenCalledWith({
            vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
            serviceZone: 'kolkata',
            exceptRuleId: 'pricing-rule-id',
            archivedAt: FIXED_NOW,
            updatedBy: adminUser.id
        });
    });

    test('admin can archive an active pricing rule', async () => {
        const rule = createPricingRule({
            status: PRICING_RULE_STATUSES.ACTIVE
        });

        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.findById.mockResolvedValue(rule);
        dependencies.pricingDao.updateRule.mockImplementation(async (_ruleId, payload) => ({
            ...rule,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules/pricing-rule-id/archive`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rule.status).toBe(PRICING_RULE_STATUSES.ARCHIVED);
        expect(response.body.data.rule.archivedAt).toBe(FIXED_NOW.toISOString());
    });

    test('pricing simulation uses active rules when available', async () => {
        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.findActiveRule.mockResolvedValue(createPricingRule({
            status: PRICING_RULE_STATUSES.ACTIVE
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/simulate`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
                serviceZone: 'kolkata',
                distanceKm: 10,
                requestedAt: '2026-01-01T12:30:00.000Z'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.simulation.surge.level).toBe('high');
        expect(response.body.data.simulation.breakdown.totalFare).toBeGreaterThan(0);
        expect(dependencies.pricingDao.findActiveRule).toHaveBeenCalledWith({
            vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
            serviceZone: 'kolkata',
            now: new Date('2026-01-01T12:30:00.000Z')
        });
    });

    test('pricing simulation falls back to baseline pricing when no active rule exists', async () => {
        dependencies.pricingDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.pricingDao.findActiveRule.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/simulate`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                vehicleType: FARE_VEHICLE_TYPES.BIKE,
                distanceKm: 3,
                durationMinutes: 12
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rule.ruleCode).toBe('BASELINE-BIKE');
        expect(response.body.data.simulation.breakdown.currency).toBe('INR');
    });

    test('driver private users cannot access pricing routes', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rules`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('You do not have access to this private route');
    });

    test('write routes reject users without pricing write permission', async () => {
        const readOnlyOps = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: [PRIVATE_AUTH_PERMISSIONS.PRICING_READ]
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules`,
            headers: authHeaderFor(dependencies, readOnlyOps),
            body: createRulePayload()
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('pricing routes return validation errors for invalid payloads', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules`,
            headers: authHeaderFor(dependencies, adminUser),
            body: createRulePayload({
                pricing: {
                    baseFare: -1
                }
            })
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(dependencies.pricingDao.createRule).not.toHaveBeenCalled();
    });
});
