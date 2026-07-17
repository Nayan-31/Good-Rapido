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
    TRUST_ACTION_TYPES,
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SUBJECT_TYPES
} from './trust.constants.js';
import { createTrustRouter } from './trust.route.js';

const BASE_PATH = '/api/v1/private/trust';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createTrustRouter(dependencies));
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

const createTrustProfile = (overrides = {}) => ({
    id: 'trust-profile-id',
    _id: 'trust-profile-id',
    trustCode: 'TRUST-RIDER-RIDER-001-20260101081000',
    subjectType: TRUST_SUBJECT_TYPES.RIDER,
    subjectId: 'rider-001',
    subjectLabel: 'Rider One',
    riskLevel: TRUST_RISK_LEVELS.MEDIUM,
    status: TRUST_PROFILE_STATUSES.MONITORING,
    reviewStatus: TRUST_REVIEW_STATUSES.OPEN,
    scores: {
        overall: 64,
        safety: 66,
        reliability: 61,
        payment: 90,
        cancellation: 55,
        fraud: 50
    },
    metrics: {
        completedRides: 48,
        cancelledRides: 7,
        disputeCount: 2,
        incidentCount: 1,
        paymentFailureCount: 0,
        ratingAverage: 4.1,
        lastRideAt: FIXED_NOW
    },
    restrictions: {
        rideBookingBlocked: false,
        driverPayoutHold: false,
        promoBlocked: true,
        reason: 'Promo abuse review',
        expiresAt: null
    },
    assignedReviewerId: null,
    latestReviewNote: 'Needs monitoring',
    lastReviewedAt: FIXED_NOW,
    lastReviewedBy: 'admin-id',
    actionLog: [{
        action: TRUST_ACTION_TYPES.CREATE_PROFILE,
        note: 'Initial review',
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

const createProfilePayload = (overrides = {}) => ({
    subjectType: TRUST_SUBJECT_TYPES.RIDER,
    subjectId: 'rider-001',
    subjectLabel: 'Rider One',
    scores: {
        safety: 40,
        reliability: 45,
        payment: 80,
        cancellation: 50,
        fraud: 35
    },
    metrics: {
        completedRides: 30,
        cancelledRides: 12,
        disputeCount: 3,
        incidentCount: 2,
        paymentFailureCount: 1,
        ratingAverage: 3.2,
        lastRideAt: '2026-01-01T08:10:00.000Z'
    },
    restrictions: {
        promoBlocked: true,
        reason: 'Repeated promo disputes'
    },
    note: 'High risk from recent ride signals',
    ...overrides
});

const createDependencies = () => ({
    trustDao: {
        findPrivateUserById: jest.fn(),
        findDashboardProfiles: jest.fn(),
        findProfiles: jest.fn(),
        findById: jest.fn(),
        findBySubject: jest.fn(),
        createProfile: jest.fn(),
        updateProfile: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private trust routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser();
    });

    test('options returns trust metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.subjectTypes).toContain(TRUST_SUBJECT_TYPES.DRIVER);
        expect(response.body.data.options.riskLevels).toContain(TRUST_RISK_LEVELS.CRITICAL);
        expect(response.body.data.options.reviewStatuses).toContain(TRUST_REVIEW_STATUSES.UNDER_REVIEW);
    });

    test('dashboard returns trust risk and review summaries', async () => {
        dependencies.trustDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.trustDao.findDashboardProfiles.mockResolvedValue([
            createTrustProfile({
                riskLevel: TRUST_RISK_LEVELS.CRITICAL,
                status: TRUST_PROFILE_STATUSES.SUSPENDED
            }),
            createTrustProfile({
                id: 'clear-profile-id',
                _id: 'clear-profile-id',
                trustCode: 'TRUST-DRIVER-DRIVER-001-20260101081000',
                subjectType: TRUST_SUBJECT_TYPES.DRIVER,
                subjectId: 'driver-001',
                riskLevel: TRUST_RISK_LEVELS.LOW,
                status: TRUST_PROFILE_STATUSES.CLEAR,
                reviewStatus: TRUST_REVIEW_STATUSES.RESOLVED,
                scores: {
                    overall: 92
                }
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dashboard.summary.totalProfiles).toBe(2);
        expect(response.body.data.dashboard.summary.criticalRiskProfiles).toBe(1);
        expect(response.body.data.dashboard.openReviews).toHaveLength(1);
        expect(response.body.data.dashboard.highRiskProfiles[0].riskLevel).toBe(TRUST_RISK_LEVELS.CRITICAL);
    });

    test('list profiles passes trust filters to the dao', async () => {
        dependencies.trustDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.trustDao.findProfiles.mockResolvedValue([
            createTrustProfile({
                riskLevel: TRUST_RISK_LEVELS.HIGH
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/profiles?subjectType=${TRUST_SUBJECT_TYPES.RIDER}&riskLevel=${TRUST_RISK_LEVELS.HIGH}&reviewStatus=${TRUST_REVIEW_STATUSES.OPEN}&q=rider&limit=5`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.trust.profiles).toHaveLength(1);
        expect(dependencies.trustDao.findProfiles).toHaveBeenCalledWith({
            subjectType: TRUST_SUBJECT_TYPES.RIDER,
            riskLevel: TRUST_RISK_LEVELS.HIGH,
            reviewStatus: TRUST_REVIEW_STATUSES.OPEN,
            q: 'rider',
            limit: 5
        });
    });

    test('admin can create a high risk trust profile', async () => {
        dependencies.trustDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.trustDao.findBySubject.mockResolvedValue(null);
        dependencies.trustDao.createProfile.mockImplementation(async (payload) => createTrustProfile({
            ...payload,
            id: 'trust-profile-id',
            _id: 'trust-profile-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/profiles`,
            headers: authHeaderFor(dependencies, adminUser),
            body: createProfilePayload()
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.profile.riskLevel).toBe(TRUST_RISK_LEVELS.HIGH);
        expect(response.body.data.profile.status).toBe(TRUST_PROFILE_STATUSES.RESTRICTED);
        expect(response.body.data.profile.scores.overall).toBe(50);
        expect(dependencies.trustDao.createProfile).toHaveBeenCalledWith(expect.objectContaining({
            trustCode: expect.stringMatching(/^TRUST-RIDER-RIDER-001-/),
            createdBy: adminUser.id,
            updatedBy: adminUser.id
        }));
    });

    test('duplicate trust subjects are rejected', async () => {
        dependencies.trustDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.trustDao.findBySubject.mockResolvedValue(createTrustProfile());

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/profiles`,
            headers: authHeaderFor(dependencies, adminUser),
            body: createProfilePayload()
        });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('Trust profile already exists for this subject');
        expect(dependencies.trustDao.createProfile).not.toHaveBeenCalled();
    });

    test('admin can update scores and move a profile to critical risk', async () => {
        const profile = createTrustProfile();

        dependencies.trustDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.trustDao.findById.mockResolvedValue(profile);
        dependencies.trustDao.updateProfile.mockImplementation(async (_profileId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/profiles/trust-profile-id`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                scores: {
                    overall: 35
                },
                note: 'Severe incident confirmed'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.profile.riskLevel).toBe(TRUST_RISK_LEVELS.CRITICAL);
        expect(response.body.data.profile.status).toBe(TRUST_PROFILE_STATUSES.SUSPENDED);
        expect(response.body.data.profile.latestReviewNote).toBe('Severe incident confirmed');
        expect(response.body.data.profile.actionLog.at(-1).action).toBe(TRUST_ACTION_TYPES.UPDATE_PROFILE);
    });

    test('admin can assign reviewers, add notes, and resolve reviews', async () => {
        const profile = createTrustProfile();

        dependencies.trustDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.trustDao.findById.mockResolvedValue(profile);
        dependencies.trustDao.updateProfile.mockImplementation(async (_profileId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const assignResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/profiles/trust-profile-id/assign`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                assignedReviewerId: 'reviewer-001',
                note: 'Safety team will review'
            }
        });

        expect(assignResponse.statusCode).toBe(200);
        expect(assignResponse.body.data.profile.assignedReviewerId).toBe('reviewer-001');
        expect(assignResponse.body.data.profile.reviewStatus).toBe(TRUST_REVIEW_STATUSES.UNDER_REVIEW);

        const noteResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/profiles/trust-profile-id/notes`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                note: 'Rider has three similar disputes'
            }
        });

        expect(noteResponse.statusCode).toBe(200);
        expect(noteResponse.body.data.profile.latestReviewNote).toBe('Rider has three similar disputes');

        const resolveResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/profiles/trust-profile-id/resolve`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                status: TRUST_PROFILE_STATUSES.MONITORING,
                note: 'Monitoring is enough for now'
            }
        });

        expect(resolveResponse.statusCode).toBe(200);
        expect(resolveResponse.body.data.profile.reviewStatus).toBe(TRUST_REVIEW_STATUSES.RESOLVED);
        expect(resolveResponse.body.data.profile.status).toBe(TRUST_PROFILE_STATUSES.MONITORING);
    });

    test('simulate returns risk guidance without creating a profile', async () => {
        dependencies.trustDao.findPrivateUserById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/simulate`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                metrics: {
                    completedRides: 10,
                    cancelledRides: 10,
                    disputeCount: 4,
                    incidentCount: 3,
                    paymentFailureCount: 5,
                    ratingAverage: 2.5
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.riskLevel).toBe(TRUST_RISK_LEVELS.CRITICAL);
        expect(response.body.data.status).toBe(TRUST_PROFILE_STATUSES.SUSPENDED);
        expect(response.body.data.guidance.shouldEscalate).toBe(true);
        expect(dependencies.trustDao.createProfile).not.toHaveBeenCalled();
    });

    test('driver users cannot access trust routes', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
    });

    test('ops users without trust write permission cannot create profiles', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/profiles`,
            headers: authHeaderFor(dependencies, opsUser),
            body: createProfilePayload()
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('create profile validates required subject fields', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/profiles`,
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
