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
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import {
    RIDE_BOOKING_CANCELLATION_REASONS,
    RIDE_BOOKING_RISK_LEVELS,
    RIDE_BOOKING_STATUSES
} from '../../public/ride-booking/ride-booking.constants.js';
import { RIDE_LIFECYCLE_STATUSES } from '../../public/rides/rides.constants.js';
import {
    RIDE_OPS_ACTIONS,
    RIDE_OPS_FILTERS,
    RIDE_OPS_ISSUE_STATUSES,
    RIDE_OPS_PRIORITY_LEVELS
} from './ride-ops.constants.js';
import { createRideOpsRouter } from './ride-ops.route.js';

const BASE_PATH = '/api/v1/private/ride-ops';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createRideOpsRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.OPS, overrides = {}) => ({
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

const createRideBooking = (overrides = {}) => ({
    id: 'ride-id',
    _id: 'ride-id',
    bookingCode: 'GR-TEST-0001',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    fareEstimateId: 'fare-estimate-id',
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
        confidenceScore: 92,
        validUntil: new Date('2026-01-01T08:20:00.000Z'),
        lockedUntil: new Date('2026-01-01T08:13:00.000Z')
    },
    trustSignals: {
        driverTrustScore: 95,
        driverReliabilityScore: 97,
        routeFairnessScore: 97,
        routeAccuracyScore: 96,
        cancellationRiskScore: 7,
        cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.LOW,
        cancellationRatio: 1.2,
        detourPercentage: 2,
        onTimeArrivalScore: 94,
        fairPriceScore: 92
    },
    paymentMethod: 'personal_wallet',
    riderNote: null,
    expiresAt: new Date('2026-01-01T08:13:00.000Z'),
    confirmedAt: new Date('2026-01-01T08:08:00.000Z'),
    cancellation: null,
    ops: {
        priority: RIDE_OPS_PRIORITY_LEVELS.NORMAL,
        issueStatus: RIDE_OPS_ISSUE_STATUSES.NONE,
        assignedOpsUserId: null,
        actionLog: []
    },
    createdAt: new Date('2026-01-01T08:07:00.000Z'),
    updatedAt: new Date('2026-01-01T08:08:00.000Z'),
    ...overrides
});

const createPendingRideBooking = (overrides = {}) => createRideBooking({
    id: 'pending-ride-id',
    _id: 'pending-ride-id',
    bookingCode: 'GR-PENDING-0001',
    status: RIDE_BOOKING_STATUSES.DRIVER_SELECTED,
    confirmedAt: null,
    createdAt: new Date('2026-01-01T08:09:00.000Z'),
    updatedAt: new Date('2026-01-01T08:09:00.000Z'),
    ...overrides
});

const createCompletedRideBooking = (overrides = {}) => createRideBooking({
    id: 'completed-ride-id',
    _id: 'completed-ride-id',
    bookingCode: 'GR-DONE-0001',
    confirmedAt: new Date('2026-01-01T07:00:00.000Z'),
    createdAt: new Date('2026-01-01T06:58:00.000Z'),
    updatedAt: new Date('2026-01-01T07:30:00.000Z'),
    ...overrides
});

const createCancelledRideBooking = (overrides = {}) => createRideBooking({
    id: 'cancelled-ride-id',
    _id: 'cancelled-ride-id',
    bookingCode: 'GR-CANCEL-0001',
    status: RIDE_BOOKING_STATUSES.CANCELLED,
    confirmedAt: null,
    cancellation: {
        reason: RIDE_BOOKING_CANCELLATION_REASONS.CHANGED_PLANS,
        note: 'No longer needed',
        cancelledAt: new Date('2026-01-01T08:03:00.000Z')
    },
    createdAt: new Date('2026-01-01T08:00:00.000Z'),
    updatedAt: new Date('2026-01-01T08:03:00.000Z'),
    ...overrides
});

const createNewDriverPayload = () => ({
    driverId: 'drv_cab_neha',
    fullName: 'Neha Das',
    rating: 4.7,
    vehicleName: 'Hyundai Aura',
    vehicleNumber: 'WB 08 ND 5291',
    vehicleColor: 'Silver',
    etaMinutes: 6,
    distanceKm: 1.1
});

const createDependencies = () => ({
    rideOpsDao: {
        findPrivateUserById: jest.fn(),
        findDashboardRides: jest.fn(),
        findRides: jest.fn(),
        findById: jest.fn(),
        updateById: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private ride ops routes', () => {
    let dependencies;
    let app;
    let opsUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        opsUser = createPrivateUser();
    });

    test('options returns ride ops metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, opsUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.filters).toContain(RIDE_OPS_FILTERS.HIGH_RISK);
        expect(response.body.data.options.priorityLevels).toContain(RIDE_OPS_PRIORITY_LEVELS.URGENT);
        expect(response.body.data.options.actions).toContain(RIDE_OPS_ACTIONS.REASSIGN_DRIVER);
    });

    test('dashboard summarizes recent rides and exposes priority queue', async () => {
        dependencies.rideOpsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideOpsDao.findDashboardRides.mockResolvedValue([
            createRideBooking({
                trustSignals: {
                    ...createRideBooking().trustSignals,
                    cancellationRiskScore: 85,
                    cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.HIGH
                }
            }),
            createPendingRideBooking(),
            createCancelledRideBooking({
                ops: {
                    priority: RIDE_OPS_PRIORITY_LEVELS.URGENT,
                    issueStatus: RIDE_OPS_ISSUE_STATUSES.ESCALATED,
                    actionLog: []
                }
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, opsUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dashboard.summary.totalRides).toBe(3);
        expect(response.body.data.dashboard.summary.pendingConfirmation).toBe(1);
        expect(response.body.data.dashboard.summary.highRiskRides).toBe(2);
        expect(response.body.data.dashboard.summary.urgentRides).toBe(1);
        expect(response.body.data.dashboard.queue[0].ops.priority).toBe(RIDE_OPS_PRIORITY_LEVELS.URGENT);
    });

    test('active queue filters derived lifecycle rides and expands lookup limit', async () => {
        dependencies.rideOpsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideOpsDao.findRides.mockResolvedValue([
            createRideBooking(),
            createCompletedRideBooking()
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides?status=${RIDE_OPS_FILTERS.ACTIVE}&limit=2`,
            headers: authHeaderFor(dependencies, opsUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.queue.rides).toHaveLength(1);
        expect(response.body.data.queue.rides[0].lifecycleStatus).toBe(RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE);
        expect(dependencies.rideOpsDao.findRides).toHaveBeenCalledWith(expect.objectContaining({
            bookingStatuses: [RIDE_BOOKING_STATUSES.CONFIRMED],
            lookupLimit: 6
        }));
    });

    test('ride detail returns ops state, trust signals, and guidance', async () => {
        dependencies.rideOpsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideOpsDao.findById.mockResolvedValue(createRideBooking({
            ops: {
                priority: RIDE_OPS_PRIORITY_LEVELS.HIGH,
                issueStatus: RIDE_OPS_ISSUE_STATUSES.MONITORING,
                assignedOpsUserId: 'ops-id',
                actionLog: []
            }
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides/ride-id`,
            headers: authHeaderFor(dependencies, opsUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ride.id).toBe('ride-id');
        expect(response.body.data.ride.ops.priority).toBe(RIDE_OPS_PRIORITY_LEVELS.HIGH);
        expect(response.body.data.ride.trustSignals.routeAccuracyScore).toBe(96);
        expect(response.body.data.ride.guidance.canReassignDriver).toBe(true);
    });

    test('ops can update ride priority, issue status, owner, and note', async () => {
        const ride = createRideBooking();

        dependencies.rideOpsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideOpsDao.findById.mockResolvedValue(ride);
        dependencies.rideOpsDao.updateById.mockImplementation(async (_rideId, payload) => ({
            ...ride,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rides/ride-id/ops-state`,
            headers: authHeaderFor(dependencies, opsUser),
            body: {
                priority: RIDE_OPS_PRIORITY_LEVELS.URGENT,
                issueStatus: RIDE_OPS_ISSUE_STATUSES.ESCALATED,
                assignedOpsUserId: 'ops-supervisor-id',
                note: 'Customer raised a safety concern'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ride.ops.priority).toBe(RIDE_OPS_PRIORITY_LEVELS.URGENT);
        expect(response.body.data.ride.ops.issueStatus).toBe(RIDE_OPS_ISSUE_STATUSES.ESCALATED);
        expect(response.body.data.ride.ops.actionLog[0].note).toBe('Customer raised a safety concern');
        expect(dependencies.rideOpsDao.updateById).toHaveBeenCalledWith('ride-id', expect.objectContaining({
            ops: expect.objectContaining({
                lastAction: RIDE_OPS_ACTIONS.ASSIGN_OWNER,
                lastActionBy: opsUser.id
            })
        }));
    });

    test('ops can confirm a driver-selected ride', async () => {
        const ride = createPendingRideBooking();

        dependencies.rideOpsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideOpsDao.findById.mockResolvedValue(ride);
        dependencies.rideOpsDao.updateById.mockImplementation(async (_rideId, payload) => ({
            ...ride,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/pending-ride-id/confirm`,
            headers: authHeaderFor(dependencies, opsUser),
            body: {
                note: 'Rider confirmed over support call'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ride.bookingStatus).toBe(RIDE_BOOKING_STATUSES.CONFIRMED);
        expect(response.body.data.ride.timeline.confirmedAt).toBe(FIXED_NOW.toISOString());
        expect(response.body.data.ride.ops.lastAction).toBe(RIDE_OPS_ACTIONS.CONFIRM_RIDE);
    });

    test('ops can reassign a mutable ride driver', async () => {
        const ride = createRideBooking();

        dependencies.rideOpsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideOpsDao.findById.mockResolvedValue(ride);
        dependencies.rideOpsDao.updateById.mockImplementation(async (_rideId, payload) => ({
            ...ride,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rides/ride-id/driver`,
            headers: authHeaderFor(dependencies, opsUser),
            body: {
                driver: createNewDriverPayload(),
                trustSignals: {
                    driverTrustScore: 88,
                    cancellationRiskScore: 30,
                    cancellationRiskLevel: RIDE_BOOKING_RISK_LEVELS.MEDIUM
                },
                note: 'Original driver asked for reassignment'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ride.driver.driverId).toBe('drv_cab_neha');
        expect(response.body.data.ride.trustSignals.driverTrustScore).toBe(88);
        expect(response.body.data.ride.ops.lastAction).toBe(RIDE_OPS_ACTIONS.REASSIGN_DRIVER);
    });

    test('ops can cancel an active ride with cancellation details', async () => {
        const ride = createRideBooking();

        dependencies.rideOpsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideOpsDao.findById.mockResolvedValue(ride);
        dependencies.rideOpsDao.updateById.mockImplementation(async (_rideId, payload) => ({
            ...ride,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/cancel`,
            headers: authHeaderFor(dependencies, opsUser),
            body: {
                reason: RIDE_BOOKING_CANCELLATION_REASONS.SAFETY_CONCERN,
                note: 'Cancelled after rider safety escalation'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ride.bookingStatus).toBe(RIDE_BOOKING_STATUSES.CANCELLED);
        expect(response.body.data.ride.cancellation.cancelledAt).toBe(FIXED_NOW.toISOString());
        expect(response.body.data.ride.ops.lastAction).toBe(RIDE_OPS_ACTIONS.CANCEL_RIDE);
    });

    test('completed rides cannot be cancelled', async () => {
        dependencies.rideOpsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.rideOpsDao.findById.mockResolvedValue(createCompletedRideBooking());

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/completed-ride-id/cancel`,
            headers: authHeaderFor(dependencies, opsUser),
            body: {
                reason: RIDE_BOOKING_CANCELLATION_REASONS.OTHER,
                note: 'Too late'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Completed rides cannot be cancelled');
        expect(dependencies.rideOpsDao.updateById).not.toHaveBeenCalled();
    });

    test('driver private users cannot access ride ops routes', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/rides`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('You do not have access to this private route');
    });

    test('write routes reject ops users without write permission', async () => {
        const readOnlyOps = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: [PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ]
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/cancel`,
            headers: authHeaderFor(dependencies, readOnlyOps),
            body: {
                reason: RIDE_BOOKING_CANCELLATION_REASONS.OTHER,
                note: 'Readonly user'
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('reassign driver returns validation errors for invalid driver snapshots', async () => {
        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/rides/ride-id/driver`,
            headers: authHeaderFor(dependencies, opsUser),
            body: {
                driver: {
                    driverId: 'd'
                }
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(dependencies.rideOpsDao.findById).not.toHaveBeenCalled();
    });
});
