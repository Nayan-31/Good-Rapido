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
    FRAUD_ACTION_TYPES,
    FRAUD_CASE_SOURCES,
    FRAUD_CASE_STATUSES,
    FRAUD_CASE_TYPES,
    FRAUD_EVIDENCE_TYPES,
    FRAUD_RESOLUTION_DECISIONS,
    FRAUD_SEVERITY_LEVELS,
    FRAUD_SUBJECT_TYPES
} from './fraud.constants.js';
import { createFraudRouter } from './fraud.route.js';

const BASE_PATH = '/api/v1/private/fraud';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createFraudRouter(dependencies));
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

const createFraudCase = (overrides = {}) => ({
    id: 'fraud-case-id',
    _id: 'fraud-case-id',
    caseCode: 'FRAUD-PROMO_ABUSE-RIDER-RIDER-001-20260101081000',
    subjectType: FRAUD_SUBJECT_TYPES.RIDER,
    subjectId: 'rider-001',
    subjectLabel: 'Rider One',
    caseType: FRAUD_CASE_TYPES.PROMO_ABUSE,
    source: FRAUD_CASE_SOURCES.SYSTEM,
    severity: FRAUD_SEVERITY_LEVELS.HIGH,
    status: FRAUD_CASE_STATUSES.OPEN,
    riskScore: 72,
    confidenceScore: 80,
    signals: {
        promoAbuseScore: 88,
        paymentRiskScore: 10,
        gpsMismatchScore: 0,
        deviceReuseScore: 65,
        cancellationAbuseScore: 30,
        disputePatternScore: 40,
        velocityScore: 75
    },
    evidence: [{
        type: FRAUD_EVIDENCE_TYPES.PROMO,
        label: 'Repeated promo redemptions',
        url: 'https://goodrapido.test/evidence/promo-1',
        note: 'Same device used across accounts',
        capturedAt: FIXED_NOW
    }],
    linkedEntities: {
        rideId: 'ride-001',
        paymentId: 'payment-001',
        promoCode: 'WELCOME100',
        deviceId: 'device-001',
        ipAddress: '10.0.0.1'
    },
    actions: {
        accountBlocked: false,
        payoutHeld: false,
        promoDisabled: true,
        rideBookingBlocked: true,
        reason: 'Promo abuse controls',
        expiresAt: null
    },
    assignedReviewerId: null,
    latestReviewNote: 'Needs fraud review',
    lastReviewedAt: FIXED_NOW,
    lastReviewedBy: 'admin-id',
    resolution: {},
    actionLog: [{
        action: FRAUD_ACTION_TYPES.CREATE_CASE,
        note: 'Initial fraud case',
        actorId: 'admin-id',
        actorRole: PRIVATE_AUTH_ROLES.ADMIN,
        createdAt: FIXED_NOW
    }],
    createdBy: 'admin-id',
    updatedBy: 'admin-id',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createCasePayload = (overrides = {}) => ({
    subjectType: FRAUD_SUBJECT_TYPES.RIDER,
    subjectId: 'rider-001',
    subjectLabel: 'Rider One',
    caseType: FRAUD_CASE_TYPES.PROMO_ABUSE,
    source: FRAUD_CASE_SOURCES.SYSTEM,
    riskScore: 86,
    confidenceScore: 82,
    signals: {
        promoAbuseScore: 90,
        deviceReuseScore: 70,
        velocityScore: 80
    },
    evidence: [{
        type: FRAUD_EVIDENCE_TYPES.PROMO,
        label: 'Promo replay',
        url: 'https://goodrapido.test/evidence/promo-1',
        note: 'Same device claimed promo repeatedly',
        capturedAt: '2026-01-01T08:10:00.000Z'
    }],
    linkedEntities: {
        rideId: 'ride-001',
        promoCode: 'WELCOME100',
        deviceId: 'device-001'
    },
    actions: {
        promoDisabled: true,
        reason: 'Repeated promo abuse'
    },
    note: 'Suspicious promo usage detected',
    ...overrides
});

const createDependencies = () => ({
    fraudDao: {
        findPrivateUserById: jest.fn(),
        findDashboardCases: jest.fn(),
        findCases: jest.fn(),
        findById: jest.fn(),
        createCase: jest.fn(),
        updateCase: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private fraud routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser();
    });

    test('options returns fraud metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.caseTypes).toContain(FRAUD_CASE_TYPES.PROMO_ABUSE);
        expect(response.body.data.options.severities).toContain(FRAUD_SEVERITY_LEVELS.CRITICAL);
        expect(response.body.data.options.evidenceTypes).toContain(FRAUD_EVIDENCE_TYPES.DEVICE);
    });

    test('dashboard returns fraud case risk summaries', async () => {
        dependencies.fraudDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.fraudDao.findDashboardCases.mockResolvedValue([
            createFraudCase({
                severity: FRAUD_SEVERITY_LEVELS.CRITICAL,
                riskScore: 91
            }),
            createFraudCase({
                id: 'dismissed-case-id',
                _id: 'dismissed-case-id',
                caseCode: 'FRAUD-CHARGEBACK-PAYMENT-PAYMENT-001-20260101081000',
                subjectType: FRAUD_SUBJECT_TYPES.PAYMENT,
                subjectId: 'payment-001',
                caseType: FRAUD_CASE_TYPES.CHARGEBACK,
                severity: FRAUD_SEVERITY_LEVELS.MEDIUM,
                status: FRAUD_CASE_STATUSES.DISMISSED,
                riskScore: 45
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dashboard.summary.totalCases).toBe(2);
        expect(response.body.data.dashboard.summary.criticalRiskCases).toBe(1);
        expect(response.body.data.dashboard.openCases).toHaveLength(1);
        expect(response.body.data.dashboard.highRiskCases[0].severity).toBe(FRAUD_SEVERITY_LEVELS.CRITICAL);
    });

    test('list cases passes fraud filters to the dao', async () => {
        dependencies.fraudDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.fraudDao.findCases.mockResolvedValue([
            createFraudCase({
                status: FRAUD_CASE_STATUSES.UNDER_REVIEW
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/cases?subjectType=${FRAUD_SUBJECT_TYPES.RIDER}&caseType=${FRAUD_CASE_TYPES.PROMO_ABUSE}&severity=${FRAUD_SEVERITY_LEVELS.HIGH}&status=${FRAUD_CASE_STATUSES.UNDER_REVIEW}&q=rider&limit=5`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.fraud.cases).toHaveLength(1);
        expect(dependencies.fraudDao.findCases).toHaveBeenCalledWith({
            subjectType: FRAUD_SUBJECT_TYPES.RIDER,
            caseType: FRAUD_CASE_TYPES.PROMO_ABUSE,
            severity: FRAUD_SEVERITY_LEVELS.HIGH,
            status: FRAUD_CASE_STATUSES.UNDER_REVIEW,
            q: 'rider',
            limit: 5
        });
    });

    test('admin can create a critical fraud case', async () => {
        dependencies.fraudDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.fraudDao.createCase.mockImplementation(async (payload) => createFraudCase({
            ...payload,
            id: 'fraud-case-id',
            _id: 'fraud-case-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/cases`,
            headers: authHeaderFor(dependencies, adminUser),
            body: createCasePayload()
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.case.severity).toBe(FRAUD_SEVERITY_LEVELS.CRITICAL);
        expect(response.body.data.case.status).toBe(FRAUD_CASE_STATUSES.OPEN);
        expect(response.body.data.case.riskScore).toBe(86);
        expect(response.body.data.case.actions.promoDisabled).toBe(true);
        expect(dependencies.fraudDao.createCase).toHaveBeenCalledWith(expect.objectContaining({
            caseCode: expect.stringMatching(/^FRAUD-PROMO_ABUSE-RIDER-RIDER-001-/),
            createdBy: adminUser.id,
            updatedBy: adminUser.id
        }));
    });

    test('admin can update a fraud case risk score and evidence', async () => {
        const fraudCase = createFraudCase();

        dependencies.fraudDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.fraudDao.findById.mockResolvedValue(fraudCase);
        dependencies.fraudDao.updateCase.mockImplementation(async (_caseId, payload) => ({
            ...fraudCase,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/cases/fraud-case-id`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                riskScore: 35,
                evidence: [{
                    type: FRAUD_EVIDENCE_TYPES.NOTE,
                    note: 'Promo activity looks explainable after review'
                }],
                note: 'Risk lowered after manual review'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.case.riskScore).toBe(35);
        expect(response.body.data.case.severity).toBe(FRAUD_SEVERITY_LEVELS.LOW);
        expect(response.body.data.case.latestReviewNote).toBe('Risk lowered after manual review');
        expect(response.body.data.case.actionLog.at(-1).action).toBe(FRAUD_ACTION_TYPES.UPDATE_CASE);
    });

    test('admin can assign reviewers, add notes, confirm, and resolve fraud cases', async () => {
        const fraudCase = createFraudCase();

        dependencies.fraudDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.fraudDao.findById.mockResolvedValue(fraudCase);
        dependencies.fraudDao.updateCase.mockImplementation(async (_caseId, payload) => ({
            ...fraudCase,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const assignResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/cases/fraud-case-id/assign`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                assignedReviewerId: 'reviewer-001',
                note: 'Fraud team will review'
            }
        });

        expect(assignResponse.statusCode).toBe(200);
        expect(assignResponse.body.data.case.assignedReviewerId).toBe('reviewer-001');
        expect(assignResponse.body.data.case.status).toBe(FRAUD_CASE_STATUSES.UNDER_REVIEW);

        const noteResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/cases/fraud-case-id/notes`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                note: 'Device fingerprint matches three accounts'
            }
        });

        expect(noteResponse.statusCode).toBe(200);
        expect(noteResponse.body.data.case.latestReviewNote).toBe('Device fingerprint matches three accounts');

        const confirmResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/cases/fraud-case-id/confirm`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                actions: {
                    accountBlocked: true,
                    promoDisabled: true,
                    reason: 'Confirmed promo fraud'
                },
                note: 'Confirmed fraud pattern'
            }
        });

        expect(confirmResponse.statusCode).toBe(200);
        expect(confirmResponse.body.data.case.status).toBe(FRAUD_CASE_STATUSES.CONFIRMED);
        expect(confirmResponse.body.data.case.actions.accountBlocked).toBe(true);
        expect(confirmResponse.body.data.case.resolution.decision).toBe(FRAUD_RESOLUTION_DECISIONS.CONFIRMED_FRAUD);

        dependencies.fraudDao.findById.mockResolvedValue(createFraudCase({
            status: FRAUD_CASE_STATUSES.CONFIRMED,
            resolution: {
                decision: FRAUD_RESOLUTION_DECISIONS.CONFIRMED_FRAUD,
                note: 'Confirmed fraud pattern',
                resolvedAt: FIXED_NOW,
                resolvedBy: adminUser.id
            }
        }));

        const resolveResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/cases/fraud-case-id/resolve`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                decision: FRAUD_RESOLUTION_DECISIONS.MITIGATED,
                note: 'Controls applied'
            }
        });

        expect(resolveResponse.statusCode).toBe(200);
        expect(resolveResponse.body.data.case.status).toBe(FRAUD_CASE_STATUSES.RESOLVED);
        expect(resolveResponse.body.data.case.resolution.decision).toBe(FRAUD_RESOLUTION_DECISIONS.MITIGATED);
    });

    test('admin can dismiss false positive fraud cases', async () => {
        const fraudCase = createFraudCase({
            status: FRAUD_CASE_STATUSES.UNDER_REVIEW
        });

        dependencies.fraudDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.fraudDao.findById.mockResolvedValue(fraudCase);
        dependencies.fraudDao.updateCase.mockImplementation(async (_caseId, payload) => ({
            ...fraudCase,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/cases/fraud-case-id/dismiss`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                note: 'False positive after payment verification'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.case.status).toBe(FRAUD_CASE_STATUSES.DISMISSED);
        expect(response.body.data.case.resolution.decision).toBe(FRAUD_RESOLUTION_DECISIONS.FALSE_POSITIVE);
    });

    test('simulate returns fraud guidance without creating a case', async () => {
        dependencies.fraudDao.findPrivateUserById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/simulate`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                caseType: FRAUD_CASE_TYPES.ACCOUNT_TAKEOVER,
                signals: {
                    deviceReuseScore: 95,
                    velocityScore: 90,
                    paymentRiskScore: 80
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.severity).toBe(FRAUD_SEVERITY_LEVELS.CRITICAL);
        expect(response.body.data.guidance.shouldEscalate).toBe(true);
        expect(response.body.data.actions.accountBlocked).toBe(true);
        expect(response.body.data.actions.rideBookingBlocked).toBe(true);
        expect(dependencies.fraudDao.createCase).not.toHaveBeenCalled();
    });

    test('driver users cannot access fraud routes', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
    });

    test('ops users without fraud write permission cannot create cases', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/cases`,
            headers: authHeaderFor(dependencies, opsUser),
            body: createCasePayload()
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('create case validates required fraud fields', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/cases`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                subjectId: 'rider-001'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({
                path: 'body.subjectType'
            })
        ]));
    });
});
