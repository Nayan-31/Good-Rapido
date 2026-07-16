import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    FRAUD_ENGINE_ASSESSMENT_SOURCES,
    FRAUD_ENGINE_CASE_TYPES,
    FRAUD_ENGINE_SEVERITY_LEVELS,
    FRAUD_ENGINE_SIGNAL_FIELDS,
    FRAUD_ENGINE_SUBJECT_TYPES
} from './fraud-engine.constants.js';
import { createFraudEngineRouter } from './fraud-engine.route.js';

const BASE_PATH = '/api/v1/core/fraud-engine';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createFraudEngineRouter(dependencies));
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
    phone: '+919222222222',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    ...overrides
});

const createDependencies = () => ({
    fraudEngineDao: {
        findPrivateUserById: jest.fn()
    },
    privateTokenService: new PrivateTokenService()
});

const privateAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.privateTokenService.signAccessToken(user)}`
});

describe('core fraud engine routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser();
    });

    test('options returns fraud engine metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: privateAuthHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.signalFields).toEqual(FRAUD_ENGINE_SIGNAL_FIELDS);
        expect(response.body.data.options.caseTypes).toContain(FRAUD_ENGINE_CASE_TYPES.PROMO_ABUSE);
        expect(response.body.data.options.assessmentSources).toContain(FRAUD_ENGINE_ASSESSMENT_SOURCES.SIGNALS);
    });

    test('private admin can calculate fraud risk from signals', async () => {
        dependencies.fraudEngineDao.findPrivateUserById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/assess`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                subjectType: FRAUD_ENGINE_SUBJECT_TYPES.DRIVER,
                caseType: FRAUD_ENGINE_CASE_TYPES.CHARGEBACK,
                signals: {
                    paymentRiskScore: 84,
                    disputePatternScore: 70,
                    velocityScore: 65
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.assessment.source).toBe(FRAUD_ENGINE_ASSESSMENT_SOURCES.SIGNALS);
        expect(response.body.data.assessment.severity).toBe(FRAUD_ENGINE_SEVERITY_LEVELS.HIGH);
        expect(response.body.data.assessment.actions.payoutHeld).toBe(true);
        expect(response.body.data.assessment.guidance.shouldEscalate).toBe(true);
        expect(response.body.data.assessment.riskScore).toBeGreaterThan(60);
    });

    test('private admin can calculate fraud risk from manual risk score', async () => {
        dependencies.fraudEngineDao.findPrivateUserById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/assess`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                subjectType: FRAUD_ENGINE_SUBJECT_TYPES.RIDER,
                caseType: FRAUD_ENGINE_CASE_TYPES.ACCOUNT_TAKEOVER,
                riskScore: 91
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.assessment.source).toBe(FRAUD_ENGINE_ASSESSMENT_SOURCES.MANUAL_RISK_SCORE);
        expect(response.body.data.assessment.severity).toBe(FRAUD_ENGINE_SEVERITY_LEVELS.CRITICAL);
        expect(response.body.data.assessment.confidenceScore).toBe(60);
        expect(response.body.data.assessment.actions.accountBlocked).toBe(true);
    });

    test('fraud assessment requires fraud read permission', async () => {
        const privateUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: []
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/assess`,
            headers: privateAuthHeaderFor(dependencies, privateUser),
            body: {
                caseType: FRAUD_ENGINE_CASE_TYPES.PROMO_ABUSE,
                riskScore: 75
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Fraud read permission is required');
    });

    test('fraud assessment validates missing scoring inputs', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/assess`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                caseType: FRAUD_ENGINE_CASE_TYPES.PROMO_ABUSE
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('driver roles cannot access fraud engine routes', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER, {
            permissions: [PRIVATE_AUTH_PERMISSIONS.FRAUD_READ]
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: privateAuthHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('You do not have access to fraud engine routes');
    });
});
