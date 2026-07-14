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
    FARE_SURGE_LEVELS,
    FARE_VEHICLE_TYPES
} from '../../public/fare/fare.constants.js';
import {
    SURGE_DECISION_TYPES,
    SURGE_DEFAULT_SERVICE_ZONE,
    SURGE_RULE_STATUSES,
    SURGE_TRIGGERS
} from './surge.constants.js';
import { createSurgeRouter } from './surge.route.js';

const BASE_PATH = '/api/v1/private/surge';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createSurgeRouter(dependencies));
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

const createSurgeRule = (overrides = {}) => ({
    id: 'surge-rule-id',
    _id: 'surge-rule-id',
    surgeCode: 'SURGE-KOLKATA-DEMAND_SPIKE-20260101081000',
    label: 'Kolkata evening demand surge',
    description: 'Temporary surge for high demand in Kolkata',
    serviceZone: 'kolkata',
    vehicleTypes: [FARE_VEHICLE_TYPES.CAB_ECONOMY, FARE_VEHICLE_TYPES.CAB_PREMIUM],
    trigger: SURGE_TRIGGERS.DEMAND_SPIKE,
    decisionType: SURGE_DECISION_TYPES.MANUAL,
    baseMultiplier: 1.35,
    maxMultiplier: 1.8,
    currentMultiplier: 1.35,
    level: FARE_SURGE_LEVELS.HIGH,
    status: SURGE_RULE_STATUSES.DRAFT,
    startsAt: new Date('2026-01-01T08:00:00.000Z'),
    endsAt: new Date('2026-01-01T10:00:00.000Z'),
    cooldownMinutes: 15,
    reason: 'Demand is higher than available drivers',
    customerMessage: 'Fares are higher due to demand',
    signals: {
        demandScore: 88,
        supplyScore: 25,
        cancellationRiskScore: 12,
        activeDrivers: 42,
        pendingRequests: 120
    },
    notes: 'Watch rider conversion',
    createdBy: 'admin-id',
    updatedBy: 'admin-id',
    activatedAt: null,
    pausedAt: null,
    endedAt: null,
    archivedAt: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createRulePayload = (overrides = {}) => ({
    label: 'Kolkata evening demand surge',
    description: 'Temporary surge for high demand in Kolkata',
    serviceZone: 'Kolkata',
    vehicleTypes: [FARE_VEHICLE_TYPES.CAB_ECONOMY, FARE_VEHICLE_TYPES.CAB_PREMIUM],
    trigger: SURGE_TRIGGERS.DEMAND_SPIKE,
    decisionType: SURGE_DECISION_TYPES.MANUAL,
    baseMultiplier: 1.35,
    maxMultiplier: 1.8,
    startsAt: '2026-01-01T08:00:00.000Z',
    endsAt: '2026-01-01T10:00:00.000Z',
    cooldownMinutes: 15,
    reason: 'Demand is higher than available drivers',
    customerMessage: 'Fares are higher due to demand',
    signals: {
        demandScore: 88,
        supplyScore: 25,
        activeDrivers: 42,
        pendingRequests: 120
    },
    notes: 'Watch rider conversion',
    ...overrides
});

const createDependencies = () => ({
    surgeDao: {
        findPrivateUserById: jest.fn(),
        findDashboardRules: jest.fn(),
        findRules: jest.fn(),
        findById: jest.fn(),
        findActiveRule: jest.fn(),
        createRule: jest.fn(),
        updateRule: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private surge routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser();
    });

    test('options returns surge metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.statuses).toContain(SURGE_RULE_STATUSES.ACTIVE);
        expect(response.body.data.options.triggers).toContain(SURGE_TRIGGERS.DEMAND_SPIKE);
        expect(response.body.data.options.vehicleTypes).toContain(FARE_VEHICLE_TYPES.CAB_ECONOMY);
    });

    test('dashboard returns active and upcoming surge summaries', async () => {
        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findDashboardRules.mockResolvedValue([
            createSurgeRule({
                status: SURGE_RULE_STATUSES.ACTIVE,
                activatedAt: FIXED_NOW
            }),
            createSurgeRule({
                id: 'scheduled-rule-id',
                _id: 'scheduled-rule-id',
                surgeCode: 'SURGE-DEFAULT-WEATHER-20260101081000',
                serviceZone: SURGE_DEFAULT_SERVICE_ZONE,
                trigger: SURGE_TRIGGERS.WEATHER,
                status: SURGE_RULE_STATUSES.SCHEDULED,
                startsAt: new Date('2026-01-01T11:00:00.000Z'),
                endsAt: new Date('2026-01-01T13:00:00.000Z')
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
        expect(response.body.data.dashboard.upcomingRules).toHaveLength(1);
    });

    test('list rules passes surge filters to the dao', async () => {
        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findRules.mockResolvedValue([
            createSurgeRule({
                status: SURGE_RULE_STATUSES.ACTIVE
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rules?status=${SURGE_RULE_STATUSES.ACTIVE}&serviceZone=Kolkata&vehicleType=${FARE_VEHICLE_TYPES.CAB_ECONOMY}&trigger=${SURGE_TRIGGERS.DEMAND_SPIKE}&limit=5`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.surge.rules).toHaveLength(1);
        expect(dependencies.surgeDao.findRules).toHaveBeenCalledWith({
            status: SURGE_RULE_STATUSES.ACTIVE,
            serviceZone: 'kolkata',
            vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
            trigger: SURGE_TRIGGERS.DEMAND_SPIKE,
            limit: 5
        });
    });

    test('admin can create a draft surge rule', async () => {
        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.createRule.mockImplementation(async (payload) => createSurgeRule({
            ...payload,
            id: 'surge-rule-id',
            _id: 'surge-rule-id',
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
        expect(response.body.data.rule.status).toBe(SURGE_RULE_STATUSES.DRAFT);
        expect(response.body.data.rule.level).toBe(FARE_SURGE_LEVELS.HIGH);
        expect(response.body.data.rule.serviceZone).toBe('kolkata');
        expect(dependencies.surgeDao.createRule).toHaveBeenCalledWith(expect.objectContaining({
            surgeCode: expect.stringMatching(/^SURGE-KOLKATA-DEMAND_SPIKE-/),
            createdBy: adminUser.id,
            updatedBy: adminUser.id
        }));
    });

    test('admin can update a paused surge rule', async () => {
        const rule = createSurgeRule({
            status: SURGE_RULE_STATUSES.PAUSED
        });

        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findById.mockResolvedValue(rule);
        dependencies.surgeDao.updateRule.mockImplementation(async (_ruleId, payload) => ({
            ...rule,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rules/surge-rule-id`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                baseMultiplier: 1.22,
                maxMultiplier: 1.6,
                notes: 'Reduced after supply improved'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rule.currentMultiplier).toBe(1.22);
        expect(response.body.data.rule.level).toBe(FARE_SURGE_LEVELS.MODERATE);
        expect(response.body.data.rule.notes).toBe('Reduced after supply improved');
    });

    test('active surge rules cannot be edited directly', async () => {
        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findById.mockResolvedValue(createSurgeRule({
            status: SURGE_RULE_STATUSES.ACTIVE
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rules/surge-rule-id`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                notes: 'Trying to edit active surge'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only draft or paused surge rules can be edited');
        expect(dependencies.surgeDao.updateRule).not.toHaveBeenCalled();
    });

    test('admin can activate a scheduled surge rule', async () => {
        const rule = createSurgeRule({
            status: SURGE_RULE_STATUSES.SCHEDULED,
            startsAt: new Date('2026-01-01T09:00:00.000Z')
        });

        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findById.mockResolvedValue(rule);
        dependencies.surgeDao.updateRule.mockImplementation(async (_ruleId, payload) => ({
            ...rule,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules/surge-rule-id/activate`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rule.status).toBe(SURGE_RULE_STATUSES.ACTIVE);
        expect(response.body.data.rule.activatedAt).toBe(FIXED_NOW.toISOString());
    });

    test('admin can pause and end surge rules', async () => {
        const activeRule = createSurgeRule({
            status: SURGE_RULE_STATUSES.ACTIVE
        });

        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findById.mockResolvedValue(activeRule);
        dependencies.surgeDao.updateRule.mockImplementation(async (_ruleId, payload) => ({
            ...activeRule,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const pauseResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules/surge-rule-id/pause`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(pauseResponse.statusCode).toBe(200);
        expect(pauseResponse.body.data.rule.status).toBe(SURGE_RULE_STATUSES.PAUSED);

        dependencies.surgeDao.findById.mockResolvedValue(createSurgeRule({
            status: SURGE_RULE_STATUSES.PAUSED
        }));

        const endResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules/surge-rule-id/end`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(endResponse.statusCode).toBe(200);
        expect(endResponse.body.data.rule.status).toBe(SURGE_RULE_STATUSES.ENDED);
        expect(endResponse.body.data.rule.endedAt).toBe(FIXED_NOW.toISOString());
    });

    test('active surge rules must be ended or paused before archiving', async () => {
        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findById.mockResolvedValue(createSurgeRule({
            status: SURGE_RULE_STATUSES.ACTIVE
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules/surge-rule-id/archive`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Active surge rules must be ended or paused before archiving');
    });

    test('surge simulation applies an active matching rule', async () => {
        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findActiveRule.mockResolvedValue(createSurgeRule({
            status: SURGE_RULE_STATUSES.ACTIVE
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/simulate`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
                serviceZone: 'kolkata',
                baseFare: 400,
                demandScore: 90,
                supplyScore: 20,
                requestedAt: '2026-01-01T08:30:00.000Z'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.simulation.applied).toBe(true);
        expect(response.body.data.simulation.multiplier).toBeGreaterThan(1.35);
        expect(response.body.data.simulation.fareImpact.estimatedFare).toBeGreaterThan(400);
        expect(dependencies.surgeDao.findActiveRule).toHaveBeenCalledWith({
            serviceZone: 'kolkata',
            vehicleType: FARE_VEHICLE_TYPES.CAB_ECONOMY,
            now: new Date('2026-01-01T08:30:00.000Z')
        });
    });

    test('surge simulation falls back to baseline when no active rule exists', async () => {
        dependencies.surgeDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.surgeDao.findActiveRule.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/simulate`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                vehicleType: FARE_VEHICLE_TYPES.BIKE,
                baseFare: 100
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.rule.surgeCode).toBe('BASELINE-SURGE-BIKE');
        expect(response.body.data.simulation.multiplier).toBe(1);
        expect(response.body.data.simulation.fareImpact.estimatedFare).toBe(100);
    });

    test('driver private users cannot access surge routes', async () => {
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

    test('surge routes return validation errors for invalid payloads', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rules`,
            headers: authHeaderFor(dependencies, adminUser),
            body: createRulePayload({
                baseMultiplier: 1.7,
                maxMultiplier: 1.2
            })
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(dependencies.surgeDao.createRule).not.toHaveBeenCalled();
    });
});
