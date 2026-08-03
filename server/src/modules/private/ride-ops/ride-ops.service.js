import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { buildRideLifecycle } from '../../core/ride-lifecycle/ride-lifecycle.engine.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { RIDE_BOOKING_STATUSES } from '../../public/ride-booking/ride-booking.constants.js';
import {
    RIDE_LIFECYCLE_STATUSES,
    RIDE_PROGRESS_STEPS
} from '../../public/rides/rides.constants.js';
import {
    RIDE_OPS_ACTIONS,
    RIDE_OPS_DEFAULT_DASHBOARD_HOURS,
    RIDE_OPS_FILTERS,
    RIDE_OPS_HIGH_RISK_THRESHOLD,
    RIDE_OPS_ISSUE_STATUSES,
    RIDE_OPS_MUTABLE_BOOKING_STATUSES,
    RIDE_OPS_PRIORITY_LEVELS
} from './ride-ops.constants.js';
import {
    toRideOpsDashboard,
    toRideOpsDetail,
    toRideOpsOptions,
    toRideOpsQueue
} from './dto/ride-ops.dto.js';

export default class RideOpsService {
    constructor({ rideOpsDao, now = () => new Date() }) {
        this.rideOpsDao = rideOpsDao;
        this.now = now;
    }

    options(authContext) {
        this.assertRideOpsReadContext(authContext);

        return buildSuccessResponse({
            message: 'Ride ops options fetched successfully',
            data: {
                options: toRideOpsOptions()
            }
        });
    }

    async dashboard(authContext) {
        await this.getPrivateUserContext(authContext, { write: false, staffOnly: true });
        const since = addHours(this.now(), -RIDE_OPS_DEFAULT_DASHBOARD_HOURS);
        const bookings = await this.rideOpsDao.findDashboardRides({
            since,
            limit: 50
        });
        const rides = this.toOpsRides(bookings)
            .sort(sortRideOpsQueue)
            .slice(0, 10);

        return buildSuccessResponse({
            message: 'Ride ops dashboard fetched successfully',
            data: {
                dashboard: toRideOpsDashboard(buildRideOpsSummary(this.toOpsRides(bookings)), rides)
            }
        });
    }

    async listRides(authContext, query = {}) {
        const actor = await this.getPrivateUserContext(authContext, { write: false });
        const scopedQuery = this.toScopedRideQuery(authContext, actor, query);
        const limit = query.limit || 25;
        const queueQuery = {
            ...scopedQuery,
            ...resolveBookingStatusQuery(scopedQuery),
            lookupLimit: needsDerivedFiltering(scopedQuery.status) ? Math.min(limit * 3, 100) : limit
        };
        const bookings = await this.rideOpsDao.findRides(queueQuery);
        const rides = this.toOpsRides(bookings)
            .filter((ride) => this.canAccessRide(authContext, actor, ride))
            .filter((ride) => matchesRideOpsFilter(ride, scopedQuery.status || RIDE_OPS_FILTERS.ALL))
            .sort(sortRideOpsQueue)
            .slice(0, limit);

        return buildSuccessResponse({
            message: 'Ride ops queue fetched successfully',
            data: {
                queue: toRideOpsQueue(rides, buildRideOpsSummary(rides))
            }
        });
    }

    async getRide(authContext, rideId) {
        const actor = await this.getPrivateUserContext(authContext, { write: false });
        const ride = await this.findRide(rideId);
        this.assertCanAccessRide(authContext, actor, ride);

        return buildSuccessResponse({
            message: 'Ride ops detail fetched successfully',
            data: {
                ride: toRideOpsDetail(ride)
            }
        });
    }

    async updateOpsState(authContext, rideId, payload) {
        const actor = await this.getPrivateUserContext(authContext, { write: true, staffOnly: true });
        const ride = await this.findRide(rideId);
        const now = this.now();
        const action = resolveOpsStateAction(payload);
        const nextOps = buildNextOpsState(ride.ops, payload, {
            action,
            actor,
            now
        });
        const updatedRide = await this.updateRide(rideId, {
            ops: nextOps
        });

        return buildSuccessResponse({
            message: 'Ride ops state updated successfully',
            data: {
                ride: toRideOpsDetail(updatedRide)
            }
        });
    }

    async confirmRide(authContext, rideId, payload = {}) {
        const actor = await this.getPrivateUserContext(authContext, { write: true });
        const ride = await this.findRide(rideId);
        this.assertCanAccessRide(authContext, actor, ride);

        if (ride.bookingStatus !== RIDE_BOOKING_STATUSES.DRIVER_SELECTED) {
            throw AppError.badRequest('Only driver-selected rides can be confirmed');
        }

        const now = this.now();
        const updatedRide = await this.updateRide(rideId, {
            status: RIDE_BOOKING_STATUSES.CONFIRMED,
            confirmedAt: now,
            ops: buildNextOpsState(ride.ops, {
                issueStatus: RIDE_OPS_ISSUE_STATUSES.MONITORING,
                note: payload.note || 'Ride confirmed by ride ops'
            }, {
                action: RIDE_OPS_ACTIONS.CONFIRM_RIDE,
                actor,
                now
            })
        });

        return buildSuccessResponse({
            message: 'Ride confirmed by ops successfully',
            data: {
                ride: toRideOpsDetail(updatedRide)
            }
        });
    }

    async reassignDriver(authContext, rideId, payload) {
        const actor = await this.getPrivateUserContext(authContext, { write: true, staffOnly: true });
        const ride = await this.findRide(rideId);

        assertRideIsMutable(ride, 'Driver cannot be reassigned for this ride');

        const now = this.now();
        const updatedRide = await this.updateRide(rideId, {
            selectedDriver: normalizeDriverSnapshot(payload.driver),
            trustSignals: {
                ...ride.trustSignals,
                ...(payload.trustSignals || {})
            },
            ops: buildNextOpsState(ride.ops, {
                issueStatus: RIDE_OPS_ISSUE_STATUSES.MONITORING,
                note: payload.note || `Driver reassigned to ${payload.driver.fullName}`
            }, {
                action: RIDE_OPS_ACTIONS.REASSIGN_DRIVER,
                actor,
                now
            })
        });

        return buildSuccessResponse({
            message: 'Ride driver reassigned successfully',
            data: {
                ride: toRideOpsDetail(updatedRide)
            }
        });
    }

    async cancelRide(authContext, rideId, payload) {
        const actor = await this.getPrivateUserContext(authContext, { write: true });
        const ride = await this.findRide(rideId);
        this.assertCanAccessRide(authContext, actor, ride);

        if (ride.bookingStatus === RIDE_BOOKING_STATUSES.CANCELLED) {
            throw AppError.badRequest('Ride is already cancelled');
        }

        if (ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
            throw AppError.badRequest('Completed rides cannot be cancelled');
        }

        const now = this.now();
        const updatedRide = await this.updateRide(rideId, {
            status: RIDE_BOOKING_STATUSES.CANCELLED,
            cancellation: {
                reason: payload.reason,
                note: payload.note || null,
                cancelledAt: now
            },
            ops: buildNextOpsState(ride.ops, {
                issueStatus: RIDE_OPS_ISSUE_STATUSES.RESOLVED,
                note: payload.note || 'Ride cancelled by ride ops'
            }, {
                action: RIDE_OPS_ACTIONS.CANCEL_RIDE,
                actor,
                now
            })
        });

        return buildSuccessResponse({
            message: 'Ride cancelled by ops successfully',
            data: {
                ride: toRideOpsDetail(updatedRide)
            }
        });
    }

    async findRide(rideId) {
        const booking = toPlainObject(await this.rideOpsDao.findById(rideId));

        if (!booking) {
            throw AppError.notFound('Ride not found');
        }

        return this.toOpsRide(booking);
    }

    async updateRide(rideId, payload) {
        const updatedBooking = toPlainObject(await this.rideOpsDao.updateById(rideId, payload));

        if (!updatedBooking) {
            throw AppError.notFound('Ride not found');
        }

        return this.toOpsRide(updatedBooking);
    }

    async getPrivateUserContext(authContext, { write = false, staffOnly = false } = {}) {
        this.assertRideOpsContext(authContext, { write, staffOnly });

        const privateUser = toPlainObject(await this.rideOpsDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertRideOpsContext(authContext, { write = false, staffOnly = false } = {}) {
        if (staffOnly) {
            if (write) {
                this.assertRideOpsStaffWriteContext(authContext);
            } else {
                this.assertRideOpsStaffReadContext(authContext);
            }
            return;
        }

        if (write) {
            this.assertRideOpsWriteContext(authContext);
        } else {
            this.assertRideOpsReadContext(authContext);
        }
    }

    assertRideOpsReadContext(authContext) {
        if (!authContext?.userId) {
            throw AppError.unauthorized();
        }

        if (authContext.role === PRIVATE_AUTH_ROLES.DRIVER) {
            if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_RIDES_READ)) {
                throw AppError.forbidden('Driver rides read permission is required');
            }
            return authContext;
        }

        this.assertRideOpsStaffReadContext(authContext);

        return authContext;
    }

    assertRideOpsStaffReadContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Ride ops access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ)) {
            throw AppError.forbidden('Ride ops read permission is required');
        }

        return authContext;
    }

    assertRideOpsWriteContext(authContext) {
        this.assertRideOpsReadContext(authContext);

        if (authContext.role === PRIVATE_AUTH_ROLES.DRIVER) {
            if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_RIDES_WRITE)) {
                throw AppError.forbidden('Driver rides write permission is required');
            }
            return;
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_WRITE)) {
            throw AppError.forbidden('Ride ops write permission is required');
        }
    }

    assertRideOpsStaffWriteContext(authContext) {
        this.assertRideOpsStaffReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_WRITE)) {
            throw AppError.forbidden('Ride ops write permission is required');
        }
    }

    toScopedRideQuery(authContext, actor, query = {}) {
        if (authContext.role !== PRIVATE_AUTH_ROLES.DRIVER) {
            return query;
        }

        return {
            ...query,
            driverIdentifiers: getDriverIdentityCandidates(actor),
            driverName: actor.fullName || null
        };
    }

    canAccessRide(authContext, actor, ride = {}) {
        if (authContext.role !== PRIVATE_AUTH_ROLES.DRIVER) {
            return true;
        }

        return isRideAssignedToDriver(actor, ride.driver);
    }

    assertCanAccessRide(authContext, actor, ride = {}) {
        if (!this.canAccessRide(authContext, actor, ride)) {
            throw AppError.forbidden('Ride is not assigned to this driver');
        }
    }

    toOpsRides(bookings = []) {
        return bookings.map((booking) => this.toOpsRide(toPlainObject(booking)));
    }

    toOpsRide(booking = {}) {
        const lifecycle = buildRideLifecycle(booking, { now: this.now() });
        const { timeline, lifecycleStatus, progress } = lifecycle;
        const ops = normalizeOpsState(booking.ops);
        const ride = {
            id: getId(booking),
            bookingCode: booking.bookingCode,
            authUserId: booking.authUserId?.toString?.() || booking.authUserId,
            role: booking.role,
            bookingStatus: booking.status,
            lifecycleStatus,
            pickup: booking.pickup,
            dropoff: booking.dropoff,
            vehicleType: booking.vehicleType,
            driver: booking.selectedDriver,
            fare: booking.fareSnapshot,
            trustSignals: booking.trustSignals,
            paymentMethod: booking.paymentMethod,
            riderNote: booking.riderNote,
            timeline,
            progress,
            cancellation: booking.cancellation || null,
            ops,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
        };

        return {
            ...ride,
            needsAttention: isHighRiskRide(ride)
        };
    }
}

const assertRideIsMutable = (ride = {}, message) => {
    if (!RIDE_OPS_MUTABLE_BOOKING_STATUSES.includes(ride.bookingStatus)) {
        throw AppError.badRequest(message);
    }

    if (ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
        throw AppError.badRequest('Completed rides cannot be changed');
    }
};

const buildTimeline = (booking = {}) => {
    const bookedAt = booking.createdAt || null;
    const confirmedAt = booking.confirmedAt || (booking.status === RIDE_BOOKING_STATUSES.CONFIRMED ? bookedAt : null);
    const driverEtaMinutes = booking.selectedDriver?.etaMinutes || 0;
    const rideDurationMinutes = booking.fareSnapshot?.durationMinutes || 0;
    const driverArrivalEtaAt = confirmedAt ? addMinutes(new Date(confirmedAt), driverEtaMinutes) : null;
    const estimatedDropoffAt = driverArrivalEtaAt ? addMinutes(driverArrivalEtaAt, rideDurationMinutes) : null;

    return {
        bookedAt,
        confirmedAt,
        driverArrivalEtaAt,
        estimatedDropoffAt,
        completedAt: null,
        cancelledAt: booking.cancellation?.cancelledAt || null
    };
};

const resolveLifecycleStatus = (booking = {}, timeline = {}, now = new Date()) => {
    if (booking.status === RIDE_BOOKING_STATUSES.CANCELLED) {
        return RIDE_LIFECYCLE_STATUSES.CANCELLED;
    }

    if (booking.status !== RIDE_BOOKING_STATUSES.CONFIRMED || !timeline.confirmedAt) {
        return RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION;
    }

    if (timeline.driverArrivalEtaAt && now < new Date(timeline.driverArrivalEtaAt)) {
        return RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE;
    }

    if (timeline.estimatedDropoffAt && now < new Date(timeline.estimatedDropoffAt)) {
        return RIDE_LIFECYCLE_STATUSES.IN_PROGRESS;
    }

    return RIDE_LIFECYCLE_STATUSES.COMPLETED;
};

const buildProgress = (lifecycleStatus, timeline = {}, now = new Date()) => {
    const currentStep = RIDE_PROGRESS_STEPS[lifecycleStatus];

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.CANCELLED) {
        return { percentage: 0, currentStep };
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION) {
        return { percentage: 10, currentStep };
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
        return { percentage: 100, currentStep };
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE) {
        return {
            percentage: interpolateProgress({
                startAt: timeline.confirmedAt,
                endAt: timeline.driverArrivalEtaAt,
                now,
                min: 15,
                max: 45
            }),
            currentStep
        };
    }

    return {
        percentage: interpolateProgress({
            startAt: timeline.driverArrivalEtaAt,
            endAt: timeline.estimatedDropoffAt,
            now,
            min: 45,
            max: 95
        }),
        currentStep
    };
};

const buildNextOpsState = (currentOps = {}, payload = {}, { action, actor, now }) => {
    const nextOps = {
        ...normalizeOpsState(currentOps),
        ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
        ...(payload.issueStatus !== undefined ? { issueStatus: payload.issueStatus } : {}),
        ...(payload.assignedOpsUserId !== undefined ? { assignedOpsUserId: payload.assignedOpsUserId || null } : {})
    };
    const actionItem = {
        action,
        note: payload.note?.trim() || null,
        actorId: getId(actor),
        actorRole: actor.role,
        createdAt: now
    };

    return {
        ...nextOps,
        lastAction: action,
        lastActionNote: actionItem.note,
        lastActionAt: now,
        lastActionBy: getId(actor),
        actionLog: [...nextOps.actionLog, actionItem].slice(-25)
    };
};

const normalizeOpsState = (ops = {}) => ({
    priority: ops.priority || RIDE_OPS_PRIORITY_LEVELS.NORMAL,
    issueStatus: ops.issueStatus || RIDE_OPS_ISSUE_STATUSES.NONE,
    assignedOpsUserId: ops.assignedOpsUserId || null,
    lastAction: ops.lastAction || null,
    lastActionNote: ops.lastActionNote || null,
    lastActionAt: ops.lastActionAt || null,
    lastActionBy: ops.lastActionBy || null,
    actionLog: Array.isArray(ops.actionLog) ? ops.actionLog : []
});

const normalizeDriverSnapshot = (driver = {}) => ({
    driverId: driver.driverId.trim(),
    fullName: driver.fullName.trim(),
    rating: driver.rating,
    vehicleName: driver.vehicleName.trim(),
    vehicleNumber: driver.vehicleNumber.trim(),
    vehicleColor: driver.vehicleColor.trim(),
    etaMinutes: driver.etaMinutes,
    distanceKm: driver.distanceKm
});

const resolveOpsStateAction = (payload = {}) => {
    if (payload.assignedOpsUserId !== undefined) {
        return RIDE_OPS_ACTIONS.ASSIGN_OWNER;
    }

    if (payload.issueStatus !== undefined) {
        return RIDE_OPS_ACTIONS.UPDATE_ISSUE_STATUS;
    }

    if (payload.priority !== undefined) {
        return RIDE_OPS_ACTIONS.UPDATE_PRIORITY;
    }

    return RIDE_OPS_ACTIONS.ADD_NOTE;
};

const resolveBookingStatusQuery = (query = {}) => {
    if (query.bookingStatus) {
        return {
            bookingStatus: query.bookingStatus
        };
    }

    if (query.status === RIDE_OPS_FILTERS.PENDING_CONFIRMATION) {
        return {
            bookingStatuses: [RIDE_BOOKING_STATUSES.DRIVER_SELECTED]
        };
    }

    if (query.status === RIDE_OPS_FILTERS.CANCELLED) {
        return {
            bookingStatuses: [RIDE_BOOKING_STATUSES.CANCELLED]
        };
    }

    if ([
        RIDE_OPS_FILTERS.ACTIVE,
        RIDE_OPS_FILTERS.DRIVER_EN_ROUTE,
        RIDE_OPS_FILTERS.DRIVER_ARRIVED,
        RIDE_OPS_FILTERS.IN_PROGRESS,
        RIDE_OPS_FILTERS.COMPLETED
    ].includes(query.status)) {
        return {
            bookingStatuses: [RIDE_BOOKING_STATUSES.CONFIRMED]
        };
    }

    return {};
};

const needsDerivedFiltering = (status) => [
    RIDE_OPS_FILTERS.ACTIVE,
    RIDE_OPS_FILTERS.DRIVER_EN_ROUTE,
    RIDE_OPS_FILTERS.DRIVER_ARRIVED,
    RIDE_OPS_FILTERS.IN_PROGRESS,
    RIDE_OPS_FILTERS.COMPLETED,
    RIDE_OPS_FILTERS.HIGH_RISK
].includes(status);

const matchesRideOpsFilter = (ride = {}, status = RIDE_OPS_FILTERS.ALL) => {
    if (status === RIDE_OPS_FILTERS.ALL || !status) {
        return true;
    }

    if (status === RIDE_OPS_FILTERS.ACTIVE) {
        return [
            RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE,
            RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED,
            RIDE_LIFECYCLE_STATUSES.IN_PROGRESS
        ].includes(ride.lifecycleStatus);
    }

    if (status === RIDE_OPS_FILTERS.HIGH_RISK) {
        return ride.needsAttention === true;
    }

    return ride.lifecycleStatus === status;
};

const buildRideOpsSummary = (rides = []) => {
    const summary = rides.reduce((accumulator, ride) => {
        accumulator.totalRides += 1;
        accumulator.totalFare += ride.fare?.totalFare || 0;

        if (ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION) {
            accumulator.pendingConfirmation += 1;
        }

        if ([
            RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE,
            RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED,
            RIDE_LIFECYCLE_STATUSES.IN_PROGRESS
        ].includes(ride.lifecycleStatus)) {
            accumulator.activeRides += 1;
        }

        if (ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
            accumulator.completedRides += 1;
        }

        if (ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.CANCELLED) {
            accumulator.cancelledRides += 1;
        }

        if (ride.needsAttention) {
            accumulator.highRiskRides += 1;
        }

        if (ride.ops?.issueStatus === RIDE_OPS_ISSUE_STATUSES.ESCALATED) {
            accumulator.escalatedRides += 1;
        }

        if (ride.ops?.priority === RIDE_OPS_PRIORITY_LEVELS.URGENT) {
            accumulator.urgentRides += 1;
        }

        return accumulator;
    }, {
        totalRides: 0,
        pendingConfirmation: 0,
        activeRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        highRiskRides: 0,
        escalatedRides: 0,
        urgentRides: 0,
        totalFare: 0,
        averageFare: 0
    });

    return {
        ...summary,
        averageFare: summary.totalRides ? Math.round(summary.totalFare / summary.totalRides) : 0
    };
};

const isHighRiskRide = (ride = {}) => {
    return ride.trustSignals?.cancellationRiskScore >= RIDE_OPS_HIGH_RISK_THRESHOLD
        || ride.trustSignals?.cancellationRiskLevel === 'high'
        || ride.ops?.priority === RIDE_OPS_PRIORITY_LEVELS.URGENT
        || ride.ops?.issueStatus === RIDE_OPS_ISSUE_STATUSES.ESCALATED;
};

const sortRideOpsQueue = (left, right) => {
    const priorityDelta = priorityWeight(right.ops?.priority) - priorityWeight(left.ops?.priority);

    if (priorityDelta !== 0) {
        return priorityDelta;
    }

    if (left.needsAttention !== right.needsAttention) {
        return left.needsAttention ? -1 : 1;
    }

    return new Date(right.updatedAt || right.createdAt || 0).getTime()
        - new Date(left.updatedAt || left.createdAt || 0).getTime();
};

const priorityWeight = (priority) => ({
    [RIDE_OPS_PRIORITY_LEVELS.URGENT]: 3,
    [RIDE_OPS_PRIORITY_LEVELS.HIGH]: 2,
    [RIDE_OPS_PRIORITY_LEVELS.NORMAL]: 1
}[priority] || 1);

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const interpolateProgress = ({ startAt, endAt, now, min, max }) => {
    if (!startAt || !endAt) {
        return min;
    }

    const startTime = new Date(startAt).getTime();
    const endTime = new Date(endAt).getTime();

    if (endTime <= startTime) {
        return max;
    }

    const elapsedRatio = (now.getTime() - startTime) / (endTime - startTime);

    return Math.round(clamp(min + elapsedRatio * (max - min), min, max));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const getDriverIdentityCandidates = (privateUser = {}) => {
    const employeeCode = normalizeIdentity(privateUser.employeeCode);
    const emailLocalPart = normalizeIdentity(privateUser.email?.split('@')[0]);
    const fullName = normalizeIdentity(privateUser.fullName);
    const candidates = [
        employeeCode,
        emailLocalPart,
        fullName
    ].filter(Boolean);

    return [...new Set(candidates)];
};

const isRideAssignedToDriver = (privateUser = {}, selectedDriver = {}) => {
    const driverId = normalizeIdentity(selectedDriver?.driverId);

    if (driverId && getDriverIdentityCandidates(privateUser).includes(driverId)) {
        return true;
    }

    return normalizeName(selectedDriver?.fullName) === normalizeName(privateUser.fullName);
};

const normalizeIdentity = (value) => (
    value
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        || null
);

const normalizeName = (value) => normalizeIdentity(value);
