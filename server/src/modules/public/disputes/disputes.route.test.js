import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import { RIDE_BOOKING_CANCELLATION_REASONS, RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
    DISPUTE_EVIDENCE_TYPES,
    DISPUTE_PRIORITIES,
    DISPUTE_REASONS,
    DISPUTE_REQUESTED_RESOLUTIONS,
    DISPUTE_STATUSES,
    DISPUTE_TYPES
} from './disputes.constants.js';
import { createDisputesRouter } from './disputes.route.js';

const BASE_PATH = '/api/v1/public/disputes';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createDisputesRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createCompletedRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: 'ride-id',
    _id: 'ride-id',
    bookingCode: 'GR-TEST-0001',
    authUserId: `${role}-id`,
    role,
    status: RIDE_BOOKING_STATUSES.CONFIRMED,
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
    vehicleType: 'cab_economy',
    selectedDriver: {
        driverId: 'drv_cab_rajesh',
        fullName: 'Rajesh Kumar',
        rating: 4.9,
        vehicleName: 'Suzuki Dzire',
        vehicleNumber: 'WB 01 AC 4522',
        vehicleColor: 'White',
        etaMinutes: 4,
        distanceKm: 0.8
    },
    fareSnapshot: {
        currency: 'INR',
        totalFare: 350,
        distanceKm: 8.4,
        durationMinutes: 22,
        surgeMultiplier: 1.2,
        confidenceScore: 92
    },
    trustSignals: {
        driverTrustScore: 95,
        driverReliabilityScore: 97,
        routeFairnessScore: 97,
        routeAccuracyScore: 84,
        cancellationRiskScore: 7,
        cancellationRiskLevel: 'low',
        cancellationRatio: 1.2,
        detourPercentage: 6,
        onTimeArrivalScore: 94,
        fairPriceScore: 88
    },
    confirmedAt: new Date('2026-01-01T07:00:00.000Z'),
    cancellation: null,
    createdAt: new Date('2026-01-01T06:58:00.000Z'),
    updatedAt: new Date('2026-01-01T07:30:00.000Z'),
    ...overrides
});

const createActiveRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => createCompletedRideBooking(role, {
    confirmedAt: new Date('2026-01-01T08:08:00.000Z'),
    ...overrides
});

const createCancelledRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => createCompletedRideBooking(role, {
    id: 'cancelled-ride-id',
    _id: 'cancelled-ride-id',
    bookingCode: 'GR-TEST-CANCEL',
    status: RIDE_BOOKING_STATUSES.CANCELLED,
    confirmedAt: null,
    cancellation: {
        reason: RIDE_BOOKING_CANCELLATION_REASONS.DRIVER_LATE,
        note: 'Driver asked to cancel',
        cancelledAt: new Date('2026-01-01T08:03:00.000Z')
    },
    createdAt: new Date('2026-01-01T08:00:00.000Z'),
    updatedAt: new Date('2026-01-01T08:03:00.000Z'),
    ...overrides
});

const createDispute = (overrides = {}) => ({
    id: 'dispute-id',
    _id: 'dispute-id',
    disputeCode: 'DSP-20260101081000-ABC123',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    rideId: 'ride-id',
    rideSnapshot: {
        bookingCode: 'GR-TEST-0001',
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
        vehicleType: 'cab_economy',
        driver: {
            driverId: 'drv_cab_rajesh',
            fullName: 'Rajesh Kumar',
            vehicleName: 'Suzuki Dzire',
            vehicleNumber: 'WB 01 AC 4522'
        }
    },
    type: DISPUTE_TYPES.WRONG_ROUTE,
    reason: DISPUTE_REASONS.UNNECESSARY_DETOUR,
    status: DISPUTE_STATUSES.SUBMITTED,
    priority: DISPUTE_PRIORITIES.HIGH,
    title: 'Wrong route or detour',
    description: 'Driver took a longer route without any clear reason',
    requestedResolution: DISPUTE_REQUESTED_RESOLUTIONS.ROUTE_REVIEW,
    requestedRefundAmount: 80,
    currency: 'INR',
    evidence: [{
        type: DISPUTE_EVIDENCE_TYPES.TEXT_NOTE,
        label: 'Route note',
        url: null,
        note: 'Detour near Park Street',
        submittedAt: FIXED_NOW,
        capturedAt: null
    }],
    timeline: {
        submittedAt: FIXED_NOW
    },
    resolution: null,
    trustSignals: {
        driverTrustScore: 95,
        routeAccuracyScore: 84,
        fairPriceScore: 88,
        cancellationRiskLevel: 'low'
    },
    latestActivityAt: FIXED_NOW,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDependencies = () => ({
    disputesDao: {
        create: jest.fn(),
        findActiveByRideAndTypeForUser: jest.fn(),
        findByIdForUser: jest.fn(),
        findHistoryForUser: jest.fn(),
        findRideDisputesForUser: jest.fn(),
        findSummaryForUser: jest.fn(),
        updateByIdForUser: jest.fn()
    },
    ridesDao: {
        findByIdForUser: jest.fn()
    },
    tokenService: new TokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public disputes routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('options returns dispute types, reasons, evidence types, and resolutions', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.types).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: DISPUTE_TYPES.WRONG_ROUTE,
                priority: DISPUTE_PRIORITIES.HIGH
            })
        ]));
        expect(response.body.data.options.reasons).toContain(DISPUTE_REASONS.UNNECESSARY_DETOUR);
        expect(response.body.data.options.evidenceTypes).toContain(DISPUTE_EVIDENCE_TYPES.RECEIPT);
    });

    test('submit ride dispute creates a case for completed rides', async () => {
        const user = createUser();
        const ride = createCompletedRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(ride);
        dependencies.disputesDao.findActiveByRideAndTypeForUser.mockResolvedValue(null);
        dependencies.disputesDao.create.mockImplementation(async (payload) => createDispute({
            ...payload,
            id: 'dispute-id',
            _id: 'dispute-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                type: DISPUTE_TYPES.WRONG_ROUTE,
                reason: DISPUTE_REASONS.UNNECESSARY_DETOUR,
                description: 'Driver took a longer route without any clear reason',
                requestedRefundAmount: 80,
                evidence: [{
                    type: DISPUTE_EVIDENCE_TYPES.TEXT_NOTE,
                    label: 'Route note',
                    note: 'Detour near Park Street'
                }]
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.dispute.status).toBe(DISPUTE_STATUSES.SUBMITTED);
        expect(response.body.data.dispute.priority).toBe(DISPUTE_PRIORITIES.HIGH);
        expect(response.body.data.dispute.ride.driver.fullName).toBe('Rajesh Kumar');
        expect(response.body.data.guidance.isOpen).toBe(true);
        expect(dependencies.ridesDao.findByIdForUser).toHaveBeenCalledWith('ride-id', user.id, user.role);
        expect(dependencies.disputesDao.findActiveByRideAndTypeForUser).toHaveBeenCalledWith(
            'ride-id',
            user.id,
            user.role,
            DISPUTE_TYPES.WRONG_ROUTE
        );
        expect(dependencies.disputesDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: user.id,
            role: user.role,
            rideId: 'ride-id',
            type: DISPUTE_TYPES.WRONG_ROUTE,
            reason: DISPUTE_REASONS.UNNECESSARY_DETOUR,
            requestedResolution: DISPUTE_REQUESTED_RESOLUTIONS.ROUTE_REVIEW
        }));
    });

    test('submit ride dispute prevents duplicate active disputes for same ride and type', async () => {
        const user = createUser();

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(createCompletedRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        }));
        dependencies.disputesDao.findActiveByRideAndTypeForUser.mockResolvedValue(createDispute({
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                type: DISPUTE_TYPES.WRONG_ROUTE,
                reason: DISPUTE_REASONS.UNNECESSARY_DETOUR,
                description: 'Driver took a longer route without any clear reason'
            }
        });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('An active dispute already exists for this ride and type');
        expect(dependencies.disputesDao.create).not.toHaveBeenCalled();
    });

    test('submit ride dispute rejects active rides', async () => {
        const user = createUser();

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(createActiveRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                type: DISPUTE_TYPES.WRONG_ROUTE,
                reason: DISPUTE_REASONS.UNNECESSARY_DETOUR,
                description: 'Driver took a longer route without any clear reason'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only completed or cancelled rides can be disputed');
        expect(dependencies.disputesDao.create).not.toHaveBeenCalled();
    });

    test('cancelled rides can be disputed for driver cancellation issues', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(createCancelledRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        }));
        dependencies.disputesDao.findActiveByRideAndTypeForUser.mockResolvedValue(null);
        dependencies.disputesDao.create.mockImplementation(async (payload) => createDispute({
            ...payload,
            id: 'cancel-dispute-id',
            _id: 'cancel-dispute-id',
            rideId: 'cancelled-ride-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/cancelled-ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                type: DISPUTE_TYPES.DRIVER_CANCELLATION,
                reason: DISPUTE_REASONS.DRIVER_FORCED_CANCEL,
                description: 'Driver asked me to cancel after accepting the ride'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.dispute.type).toBe(DISPUTE_TYPES.DRIVER_CANCELLATION);
        expect(response.body.data.dispute.priority).toBe(DISPUTE_PRIORITIES.HIGH);
    });

    test('ride disputes returns existing disputes and eligibility', async () => {
        const user = createUser();

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(createCompletedRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        }));
        dependencies.disputesDao.findRideDisputesForUser.mockResolvedValue([
            createDispute({
                authUserId: user.id,
                role: user.role
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.disputes).toHaveLength(1);
        expect(response.body.data.eligibility.canDispute).toBe(true);
        expect(response.body.data.eligibility.activeDisputeCount).toBe(1);
        expect(response.body.data.eligibility.recommendedTypes).toContain(DISPUTE_TYPES.WRONG_ROUTE);
    });

    test('history returns dispute ledger and summary with filters', async () => {
        const user = createUser();

        dependencies.disputesDao.findHistoryForUser.mockResolvedValue([
            createDispute({
                authUserId: user.id,
                role: user.role
            }),
            createDispute({
                id: 'resolved-dispute-id',
                _id: 'resolved-dispute-id',
                disputeCode: 'DSP-RESOLVED',
                authUserId: user.id,
                role: user.role,
                type: DISPUTE_TYPES.PAYMENT_ISSUE,
                reason: DISPUTE_REASONS.REFUND_NOT_RECEIVED,
                status: DISPUTE_STATUSES.RESOLVED,
                priority: DISPUTE_PRIORITIES.HIGH,
                timeline: {
                    submittedAt: new Date('2026-01-01T07:10:00.000Z'),
                    resolvedAt: FIXED_NOW
                }
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/history?status=${DISPUTE_STATUSES.SUBMITTED}&limit=5`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.history).toHaveLength(2);
        expect(response.body.data.summary.totalDisputes).toBe(2);
        expect(response.body.data.summary.openCount).toBe(1);
        expect(response.body.data.summary.resolvedCount).toBe(1);
        expect(dependencies.disputesDao.findHistoryForUser).toHaveBeenCalledWith(user.id, user.role, {
            status: DISPUTE_STATUSES.SUBMITTED,
            limit: 5
        });
    });

    test('summary returns aggregate dispute health', async () => {
        const user = createUser();

        dependencies.disputesDao.findSummaryForUser.mockResolvedValue({
            totals: [{
                totalDisputes: 4,
                openCount: 2,
                resolvedCount: 1,
                cancelledCount: 1,
                urgentCount: 1,
                latestSubmittedAt: FIXED_NOW
            }],
            statuses: [
                { _id: DISPUTE_STATUSES.SUBMITTED, count: 2 },
                { _id: DISPUTE_STATUSES.RESOLVED, count: 1 }
            ],
            types: [
                { _id: DISPUTE_TYPES.WRONG_ROUTE, count: 2 },
                { _id: DISPUTE_TYPES.SAFETY_CONCERN, count: 1 }
            ]
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/summary`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.summary.totalDisputes).toBe(4);
        expect(response.body.data.summary.byStatus.submitted).toBe(2);
        expect(response.body.data.summary.byType.safety_concern).toBe(1);
    });

    test('dispute details can be fetched by id', async () => {
        const user = createUser();

        dependencies.disputesDao.findByIdForUser.mockResolvedValue(createDispute({
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dispute-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dispute.disputeCode).toBe('DSP-20260101081000-ABC123');
        expect(response.body.data.dispute.trustSignals.routeAccuracyScore).toBe(84);
        expect(response.body.data.guidance.nextAction).toBe('Our support team will review the ride signals and evidence');
        expect(dependencies.disputesDao.findByIdForUser).toHaveBeenCalledWith('dispute-id', user.id, user.role);
    });

    test('evidence can be added to open disputes', async () => {
        const user = createUser();
        const dispute = createDispute({
            authUserId: user.id,
            role: user.role,
            evidence: []
        });

        dependencies.disputesDao.findByIdForUser.mockResolvedValue(dispute);
        dependencies.disputesDao.updateByIdForUser.mockImplementation(async (_disputeId, _userId, _role, payload) => createDispute({
            ...dispute,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/evidence`,
            headers: authHeaderFor(dependencies, user),
            body: {
                evidence: [{
                    type: DISPUTE_EVIDENCE_TYPES.RECEIPT,
                    label: 'Payment screenshot',
                    url: 'https://example.com/receipt.png'
                }]
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dispute.status).toBe(DISPUTE_STATUSES.UNDER_REVIEW);
        expect(response.body.data.dispute.evidence).toHaveLength(1);
        expect(dependencies.disputesDao.updateByIdForUser).toHaveBeenCalledWith('dispute-id', user.id, user.role, expect.objectContaining({
            status: DISPUTE_STATUSES.UNDER_REVIEW,
            latestActivityAt: FIXED_NOW
        }));
    });

    test('cancel dispute closes an open case', async () => {
        const user = createUser();
        const dispute = createDispute({
            authUserId: user.id,
            role: user.role
        });

        dependencies.disputesDao.findByIdForUser.mockResolvedValue(dispute);
        dependencies.disputesDao.updateByIdForUser.mockImplementation(async (_disputeId, _userId, _role, payload) => createDispute({
            ...dispute,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/cancel`,
            headers: authHeaderFor(dependencies, user),
            body: {
                note: 'Issue resolved outside support'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dispute.status).toBe(DISPUTE_STATUSES.CANCELLED);
        expect(response.body.data.dispute.timeline.cancelledAt).toBe(FIXED_NOW.toISOString());
        expect(response.body.data.guidance.isOpen).toBe(false);
    });

    test('evidence cannot be added to resolved disputes', async () => {
        const user = createUser();

        dependencies.disputesDao.findByIdForUser.mockResolvedValue(createDispute({
            authUserId: user.id,
            role: user.role,
            status: DISPUTE_STATUSES.RESOLVED
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/dispute-id/evidence`,
            headers: authHeaderFor(dependencies, user),
            body: {
                evidence: [{
                    type: DISPUTE_EVIDENCE_TYPES.TEXT_NOTE,
                    note: 'More context'
                }]
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only open disputes can accept evidence');
        expect(dependencies.disputesDao.updateByIdForUser).not.toHaveBeenCalled();
    });

    test('disputes routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('disputes routes return validation errors for invalid payloads', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, user),
            body: {
                type: DISPUTE_TYPES.WRONG_ROUTE,
                reason: DISPUTE_REASONS.UNNECESSARY_DETOUR,
                description: 'short'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });
});
