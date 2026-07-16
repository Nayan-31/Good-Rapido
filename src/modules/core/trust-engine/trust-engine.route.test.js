import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { RIDE_BOOKING_RISK_LEVELS } from '../../public/ride-booking/ride-booking.constants.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import {
    TRUST_RISK_LEVELS,
    TRUST_SUBJECT_TYPES
} from '../../private/trust/trust.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    TRUST_ENGINE_ASSESSMENT_SOURCES,
    TRUST_ENGINE_DRIVER_TRUST_LEVELS,
    TRUST_ENGINE_SCORE_FIELDS
} from './trust-engine.constants.js';
import { createTrustEngineRouter } from './trust-engine.route.js';

const BASE_PATH = '/api/v1/core/trust-engine';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createTrustEngineRouter(dependencies));
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

const createDependencies = () => ({
    trustEngineDao: {
        findPublicUserById: jest.fn(),
        findPrivateUserById: jest.fn()
    },
    publicTokenService: new PublicTokenService(),
    privateTokenService: new PrivateTokenService()
});

const publicAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.publicTokenService.signAccessToken(user)}`
});

const privateAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.privateTokenService.signAccessToken(user)}`
});

describe('core trust engine routes', () => {
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

    test('options returns trust engine metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.scoreFields).toEqual(TRUST_ENGINE_SCORE_FIELDS);
        expect(response.body.data.options.assessmentSources).toContain(TRUST_ENGINE_ASSESSMENT_SOURCES.METRICS);
        expect(response.body.data.options.driverTrustLevels).toContain(TRUST_ENGINE_DRIVER_TRUST_LEVELS.EXCELLENT);
    });

    test('private admin can calculate a risk assessment from metrics', async () => {
        dependencies.trustEngineDao.findPrivateUserById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/assess`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                subjectType: TRUST_SUBJECT_TYPES.DRIVER,
                metrics: {
                    completedRides: 20,
                    cancelledRides: 12,
                    disputeCount: 4,
                    incidentCount: 3,
                    paymentFailureCount: 2,
                    ratingAverage: 2.8
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.assessment.riskLevel).toBe(TRUST_RISK_LEVELS.HIGH);
        expect(response.body.data.assessment.guidance.shouldEscalate).toBe(true);
        expect(response.body.data.assessment.guidance.shouldHoldPayout).toBe(true);
        expect(response.body.data.assessment.scores.overall).toBeGreaterThan(0);
    });

    test('public user can evaluate driver trust signals', async () => {
        dependencies.trustEngineDao.findPublicUserById.mockResolvedValue(riderUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/drivers/evaluate`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: {
                driver: {
                    driverId: 'drv_cab_rajesh',
                    fullName: 'Rajesh Kumar',
                    rating: 4.9,
                    trustScore: 95,
                    reliabilityScore: 97,
                    routeFairnessScore: 97,
                    onTimeArrivalScore: 94,
                    cancellationRiskScore: 7,
                    cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.LOW,
                    cancellationRatio: 1.2,
                    detourPercentage: 2,
                    completedRides: 2480
                },
                fareSource: {
                    confidenceScore: 92
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.evaluation.trust.level).toBe(TRUST_ENGINE_DRIVER_TRUST_LEVELS.EXCELLENT);
        expect(response.body.data.evaluation.cancellationRisk.level).toBe(RIDE_BOOKING_RISK_LEVELS.LOW);
        expect(response.body.data.evaluation.rideTrustSignals.fairPriceScore).toBe(92);
        expect(response.body.data.evaluation.transparencyBadges).toContain('Low cancellation risk');
    });

    test('private trust assessment requires trust read permission', async () => {
        const privateUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: []
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/assess`,
            headers: privateAuthHeaderFor(dependencies, privateUser),
            body: {
                subjectType: TRUST_SUBJECT_TYPES.RIDER,
                riskLevel: TRUST_RISK_LEVELS.HIGH
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Trust read permission is required');
    });

    test('trust assessment validates missing signals', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/assess`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                subjectType: TRUST_SUBJECT_TYPES.RIDER
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
