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
    DISPUTE_EVIDENCE_TYPES,
    DISPUTE_PRIORITIES,
    DISPUTE_REASONS,
    DISPUTE_REQUESTED_RESOLUTIONS,
    DISPUTE_RESOLUTION_TYPES,
    DISPUTE_STATUSES,
    DISPUTE_TYPES
} from '../../public/disputes/disputes.constants.js';
import { PRIVATE_DISPUTE_ACTIONS } from './disputes.constants.js';
import { createPrivateDisputesRouter } from './disputes.route.js';

const BASE_PATH = '/api/v1/private/disputes';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createPrivateDisputesRouter(dependencies));
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

const createDispute = (overrides = {}) => ({
    id: 'dispute-id',
    _id: 'dispute-id',
    disputeCode: 'DSP-20260101081000-ABC123',
    authUserId: 'rider-id',
    role: 'rider',
    rideId: 'ride-id',
    rideSnapshot: {
        bookingCode: 'BOOK-001',
        pickup: {
            address: 'Salt Lake',
            latitude: 22.58,
            longitude: 88.43
        },
        dropoff: {
            address: 'Park Street',
            latitude: 22.55,
            longitude: 88.35
        },
        vehicleType: 'cab_economy',
        driver: {
            driverId: 'drv_cab_rajesh',
            fullName: 'Rajesh Kumar',
            vehicleName: 'Suzuki Dzire',
            vehicleNumber: 'WB 01 AC 4522'
        }
    },
    type: DISPUTE_TYPES.FARE_OVERCHARGE,
    reason: DISPUTE_REASONS.FARE_HIGHER_THAN_QUOTE,
    status: DISPUTE_STATUSES.SUBMITTED,
    priority: DISPUTE_PRIORITIES.HIGH,
    title: 'Fare was higher than quote',
    description: 'The final fare was higher than the locked estimate.',
    requestedResolution: DISPUTE_REQUESTED_RESOLUTIONS.FARE_ADJUSTMENT,
    requestedRefundAmount: 120,
    currency: 'INR',
    evidence: [{
        type: DISPUTE_EVIDENCE_TYPES.RECEIPT,
        label: 'Fare receipt',
        url: 'https://goodrapido.test/evidence/receipt.jpg',
        note: 'Fare receipt screenshot',
        submittedAt: FIXED_NOW,
        capturedAt: FIXED_NOW
    }],
    timeline: {
        submittedAt: FIXED_NOW
    },
    resolution: null,
    trustSignals: {
        driverTrustScore: 95,
        routeAccuracyScore: 92,
        fairPriceScore: 70,
        cancellationRiskLevel: 'low'
    },
    ops: {
        assignedOpsUserId: null,
        lastAction: null,
        lastActionNote: null,
        lastActionAt: null,
        lastActionBy: null,
        actionLog: []
    },
    latestActivityAt: FIXED_NOW,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDependencies = () => ({
    disputesDao: {
        findPrivateUserById: jest.fn(),
        findDashboardDisputes: jest.fn(),
        findDisputes: jest.fn(),
        findById: jest.fn(),
        updateDispute: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private dispute routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser();
    });

    test('options returns private dispute metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.statuses).toContain(DISPUTE_STATUSES.UNDER_REVIEW);
        expect(response.body.data.options.priorities).toContain(DISPUTE_PRIORITIES.URGENT);
        expect(response.body.data.options.actions).toContain(PRIVATE_DISPUTE_ACTIONS.RESOLVE_DISPUTE);
    });

    test('dashboard returns dispute operation summaries', async () => {
        dependencies.disputesDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.disputesDao.findDashboardDisputes.mockResolvedValue([
            createDispute({
                priority: DISPUTE_PRIORITIES.URGENT
            }),
            createDispute({
                id: 'resolved-dispute-id',
                _id: 'resolved-dispute-id',
                disputeCode: 'DSP-RESOLVED',
                status: DISPUTE_STATUSES.RESOLVED,
                priority: DISPUTE_PRIORITIES.LOW,
                requestedRefundAmount: 0,
                resolution: {
                    type: DISPUTE_RESOLUTION_TYPES.NO_ACTION,
                    note: 'Already resolved',
                    refundAmount: 0,
                    resolvedAt: FIXED_NOW
                }
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dashboard.summary.totalDisputes).toBe(2);
        expect(response.body.data.dashboard.summary.urgentCount).toBe(1);
        expect(response.body.data.dashboard.summary.resolvedCount).toBe(1);
        expect(response.body.data.dashboard.urgentQueue).toHaveLength(1);
    });

    test('queue passes dispute filters to the dao', async () => {
        dependencies.disputesDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.disputesDao.findDisputes.mockResolvedValue([
            createDispute({
                status: DISPUTE_STATUSES.UNDER_REVIEW
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/queue?status=${DISPUTE_STATUSES.UNDER_REVIEW}&type=${DISPUTE_TYPES.FARE_OVERCHARGE}&priority=${DISPUTE_PRIORITIES.HIGH}&assignedOpsUserId=ops-id&q=BOOK&limit=5`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.disputes.disputes).toHaveLength(1);
        expect(dependencies.disputesDao.findDisputes).toHaveBeenCalledWith({
            status: DISPUTE_STATUSES.UNDER_REVIEW,
            type: DISPUTE_TYPES.FARE_OVERCHARGE,
            priority: DISPUTE_PRIORITIES.HIGH,
            assignedOpsUserId: 'ops-id',
            q: 'BOOK',
            limit: 5
        });
    });

    test('detail returns evidence, trust signals, and ops state', async () => {
        dependencies.disputesDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.disputesDao.findById.mockResolvedValue(createDispute());

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dispute-id`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dispute.disputeCode).toBe('DSP-20260101081000-ABC123');
        expect(response.body.data.dispute.evidence).toHaveLength(1);
        expect(response.body.data.dispute.trustSignals.fairPriceScore).toBe(70);
        expect(response.body.data.dispute.guidance.canResolve).toBe(true);
    });

    test('admin can update priority and assign owner state', async () => {
        const dispute = createDispute();

        dependencies.disputesDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.disputesDao.findById.mockResolvedValue(dispute);
        dependencies.disputesDao.updateDispute.mockImplementation(async (_disputeId, payload) => ({
            ...dispute,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/dispute-id`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                priority: DISPUTE_PRIORITIES.URGENT,
                assignedOpsUserId: 'ops-owner-id',
                note: 'Escalating refund review'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dispute.priority).toBe(DISPUTE_PRIORITIES.URGENT);
        expect(response.body.data.dispute.ops.assignedOpsUserId).toBe('ops-owner-id');
        expect(response.body.data.dispute.ops.lastAction).toBe(PRIVATE_DISPUTE_ACTIONS.UPDATE_STATE);
    });

    test('admin can assign owner and request evidence', async () => {
        const dispute = createDispute();

        dependencies.disputesDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.disputesDao.findById.mockResolvedValue(dispute);
        dependencies.disputesDao.updateDispute.mockImplementation(async (_disputeId, payload) => ({
            ...dispute,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const assignResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/assign`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                assignedOpsUserId: 'ops-owner-id',
                note: 'Owner assigned'
            }
        });

        expect(assignResponse.statusCode).toBe(200);
        expect(assignResponse.body.data.dispute.status).toBe(DISPUTE_STATUSES.UNDER_REVIEW);
        expect(assignResponse.body.data.dispute.ops.assignedOpsUserId).toBe('ops-owner-id');
        expect(assignResponse.body.data.dispute.timeline.acknowledgedAt).toBe(FIXED_NOW.toISOString());

        const evidenceResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/request-evidence`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                note: 'Please upload payment receipt'
            }
        });

        expect(evidenceResponse.statusCode).toBe(200);
        expect(evidenceResponse.body.data.dispute.status).toBe(DISPUTE_STATUSES.EVIDENCE_REQUESTED);
        expect(evidenceResponse.body.data.dispute.timeline.evidenceRequestedAt).toBe(FIXED_NOW.toISOString());
    });

    test('admin can add notes, resolve, and reject open disputes', async () => {
        const dispute = createDispute({
            status: DISPUTE_STATUSES.UNDER_REVIEW
        });

        dependencies.disputesDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.disputesDao.findById.mockResolvedValue(dispute);
        dependencies.disputesDao.updateDispute.mockImplementation(async (_disputeId, payload) => ({
            ...dispute,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const noteResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/notes`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                note: 'Rider receipt and fare estimate are attached'
            }
        });

        expect(noteResponse.statusCode).toBe(200);
        expect(noteResponse.body.data.dispute.ops.lastAction).toBe(PRIVATE_DISPUTE_ACTIONS.ADD_NOTE);

        const resolveResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/resolve`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                resolutionType: DISPUTE_RESOLUTION_TYPES.REFUND_APPROVED,
                refundAmount: 80,
                note: 'Refund approved for overcharge'
            }
        });

        expect(resolveResponse.statusCode).toBe(200);
        expect(resolveResponse.body.data.dispute.status).toBe(DISPUTE_STATUSES.RESOLVED);
        expect(resolveResponse.body.data.dispute.resolution.type).toBe(DISPUTE_RESOLUTION_TYPES.REFUND_APPROVED);
        expect(resolveResponse.body.data.dispute.resolution.refundAmount).toBe(80);

        const rejectResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/reject`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                note: 'Fare matched route and estimate'
            }
        });

        expect(rejectResponse.statusCode).toBe(200);
        expect(rejectResponse.body.data.dispute.status).toBe(DISPUTE_STATUSES.REJECTED);
        expect(rejectResponse.body.data.dispute.resolution.type).toBe(DISPUTE_RESOLUTION_TYPES.REJECTED);
    });

    test('closed disputes cannot be resolved again', async () => {
        dependencies.disputesDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.disputesDao.findById.mockResolvedValue(createDispute({
            status: DISPUTE_STATUSES.RESOLVED
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/resolve`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                resolutionType: DISPUTE_RESOLUTION_TYPES.NO_ACTION,
                note: 'Trying to resolve again'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only open disputes can be resolved');
        expect(dependencies.disputesDao.updateDispute).not.toHaveBeenCalled();
    });

    test('driver users cannot access private dispute routes', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
    });

    test('ops users without dispute write permission cannot update disputes', async () => {
        const readOnlyOps = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: DEFAULT_PRIVATE_ROLE_PERMISSIONS[PRIVATE_AUTH_ROLES.OPS]
                .filter((permission) => permission !== PRIVATE_AUTH_PERMISSIONS.OPS_DISPUTES_WRITE)
        });

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/dispute-id`,
            headers: authHeaderFor(dependencies, readOnlyOps),
            body: {
                priority: DISPUTE_PRIORITIES.URGENT
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('resolve validates refund amount for refund approvals', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/resolve`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                resolutionType: DISPUTE_RESOLUTION_TYPES.REFUND_APPROVED,
                note: 'Refund approved'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({
                path: 'body.refundAmount'
            })
        ]));
    });
});
