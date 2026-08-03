import { AUTH_ACCOUNT_STATUSES } from '../../public/auth/auth.constants.js';
import {
    RIDE_BOOKING_CANCELLATION_REASONS,
    RIDE_BOOKING_STATUSES
} from '../../public/ride-booking/ride-booking.constants.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    RIDE_LIFECYCLE_EVENTS,
    RIDE_LIFECYCLE_STATUSES,
    RIDE_LIFECYCLE_TRANSITION_LOG_LIMIT
} from './ride-lifecycle.constants.js';
import { buildRideLifecycle } from './ride-lifecycle.engine.js';
import {
    toRideLifecycleOptions,
    toRideLifecycleView
} from './dto/ride-lifecycle.dto.js';

export default class RideLifecycleService {
    constructor({ rideLifecycleDao, now = () => new Date() }) {
        this.rideLifecycleDao = rideLifecycleDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthenticatedContext(authContext);

        return buildSuccessResponse({
            message: 'Ride lifecycle options fetched successfully',
            data: {
                options: toRideLifecycleOptions({
                    bookingStatuses: Object.values(RIDE_BOOKING_STATUSES),
                    cancellationReasons: Object.values(RIDE_BOOKING_CANCELLATION_REASONS)
                })
            }
        });
    }

    async getRideLifecycle(authContext, rideId) {
        const ride = await this.findVisibleRide(authContext, rideId);
        const lifecycle = buildRideLifecycle(ride, { now: this.now() });

        return buildSuccessResponse({
            message: 'Ride lifecycle fetched successfully',
            data: {
                lifecycle: toRideLifecycleView(ride, lifecycle)
            }
        });
    }

    async transitionRide(authContext, rideId, payload) {
        const actor = await this.getPrivateUserContext(authContext, { write: true });
        const ride = toPlainObject(await this.rideLifecycleDao.findRideById(rideId));

        if (!ride) {
            throw AppError.notFound('Ride not found');
        }

        this.assertPrivateRideAccess(authContext, actor, ride);

        const currentLifecycle = buildRideLifecycle(ride, { now: this.now() });

        assertTransitionAllowed(currentLifecycle, payload.event);

        const occurredAt = payload.occurredAt || this.now();
        const nextLifecycle = buildNextLifecycleState(ride.lifecycle, payload, {
            actor,
            occurredAt,
            now: this.now()
        });
        const updatePayload = {
            lifecycle: nextLifecycle
        };

        if (payload.event === RIDE_LIFECYCLE_EVENTS.RIDE_CANCELLED) {
            updatePayload.status = RIDE_BOOKING_STATUSES.CANCELLED;
            updatePayload.cancellation = {
                reason: payload.reason,
                note: payload.note || null,
                cancelledAt: occurredAt
            };
        }

        const updatedRide = toPlainObject(await this.rideLifecycleDao.updateRideById(rideId, updatePayload));

        if (!updatedRide) {
            throw AppError.notFound('Ride not found');
        }

        return buildSuccessResponse({
            message: 'Ride lifecycle updated successfully',
            data: {
                lifecycle: toRideLifecycleView(
                    updatedRide,
                    buildRideLifecycle(updatedRide, { now: this.now() })
                )
            }
        });
    }

    async findVisibleRide(authContext, rideId) {
        this.assertAuthenticatedContext(authContext);

        if (authContext.scope === 'private') {
            const privateUser = await this.getPrivateUserContext(authContext, { write: false });
            const ride = toPlainObject(await this.rideLifecycleDao.findRideById(rideId));

            if (!ride) {
                throw AppError.notFound('Ride not found');
            }

            this.assertPrivateRideAccess(authContext, privateUser, ride);

            return ride;
        }

        await this.getPublicUserContext(authContext);
        const ride = toPlainObject(await this.rideLifecycleDao.findRideByIdForUser(
            rideId,
            authContext.userId,
            authContext.role
        ));

        if (!ride) {
            throw AppError.notFound('Ride not found');
        }

        return ride;
    }

    async getPublicUserContext(authContext) {
        const publicUser = toPlainObject(await this.rideLifecycleDao.findPublicUserById(authContext.userId));

        if (!publicUser) {
            throw AppError.notFound('Public user account not found');
        }

        if (publicUser.accountStatus !== AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Public user account is ${publicUser.accountStatus}`);
        }

        return publicUser;
    }

    async getPrivateUserContext(authContext, { write = false } = {}) {
        if (write) {
            this.assertRideLifecycleWriteContext(authContext);
        } else {
            this.assertRideLifecycleReadContext(authContext);
        }

        const privateUser = toPlainObject(await this.rideLifecycleDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertAuthenticatedContext(authContext) {
        if (!authContext?.userId || !authContext?.role || !authContext?.scope) {
            throw AppError.unauthorized();
        }
    }

    assertRideLifecycleReadContext(authContext) {
        this.assertAuthenticatedContext(authContext);

        if (authContext.scope !== 'private' || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS,
            PRIVATE_AUTH_ROLES.DRIVER
        ].includes(authContext.role)) {
            throw AppError.forbidden('Ride lifecycle private access is required');
        }

        if (authContext.role === PRIVATE_AUTH_ROLES.DRIVER) {
            if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_RIDES_READ)) {
                throw AppError.forbidden('Driver rides read permission is required');
            }
            return;
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ)) {
            throw AppError.forbidden('Ride ops read permission is required');
        }
    }

    assertRideLifecycleWriteContext(authContext) {
        this.assertRideLifecycleReadContext(authContext);

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

    assertPrivateRideAccess(authContext, privateUser, ride = {}) {
        if (authContext.role !== PRIVATE_AUTH_ROLES.DRIVER) {
            return;
        }

        if (!isRideAssignedToDriver(privateUser, ride.selectedDriver)) {
            throw AppError.forbidden('Ride is not assigned to this driver');
        }
    }
}

const buildNextLifecycleState = (currentLifecycle = {}, payload, { actor, occurredAt, now }) => {
    const lifecycle = normalizeLifecycle(currentLifecycle);
    const nextLifecycle = {
        ...lifecycle,
        lastTransition: payload.event,
        lastTransitionAt: occurredAt,
        lastTransitionBy: getId(actor)
    };

    if (payload.event === RIDE_LIFECYCLE_EVENTS.DRIVER_ARRIVED) {
        nextLifecycle.driverArrivedAt = occurredAt;
    }

    if (payload.event === RIDE_LIFECYCLE_EVENTS.RIDE_STARTED) {
        nextLifecycle.driverArrivedAt = nextLifecycle.driverArrivedAt || occurredAt;
        nextLifecycle.rideStartedAt = occurredAt;
    }

    if (payload.event === RIDE_LIFECYCLE_EVENTS.RIDE_COMPLETED) {
        nextLifecycle.driverArrivedAt = nextLifecycle.driverArrivedAt || occurredAt;
        nextLifecycle.rideStartedAt = nextLifecycle.rideStartedAt || occurredAt;
        nextLifecycle.completedAt = occurredAt;
    }

    if (payload.event === RIDE_LIFECYCLE_EVENTS.RIDE_CANCELLED) {
        nextLifecycle.cancelledAt = occurredAt;
    }

    nextLifecycle.transitionLog = appendTransitionLog(lifecycle.transitionLog, {
        event: payload.event,
        note: payload.note?.trim() || null,
        actorId: getId(actor),
        actorRole: actor.role,
        occurredAt,
        createdAt: now
    });

    return nextLifecycle;
};

const assertTransitionAllowed = (currentLifecycle, event) => {
    if ([
        RIDE_LIFECYCLE_STATUSES.CANCELLED,
        RIDE_LIFECYCLE_STATUSES.COMPLETED,
        RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION
    ].includes(currentLifecycle.lifecycleStatus)) {
        throw AppError.badRequest('Ride lifecycle cannot be changed from its current state');
    }

    if (!currentLifecycle.availableEvents.includes(event)) {
        throw AppError.badRequest('Ride lifecycle event is not allowed from the current state');
    }
};

const appendTransitionLog = (currentLog = [], transition) => (
    [...(Array.isArray(currentLog) ? currentLog : []), transition].slice(-RIDE_LIFECYCLE_TRANSITION_LOG_LIMIT)
);

const normalizeLifecycle = (lifecycle = {}) => ({
    driverArrivedAt: lifecycle?.driverArrivedAt || null,
    rideStartedAt: lifecycle?.rideStartedAt || null,
    completedAt: lifecycle?.completedAt || null,
    cancelledAt: lifecycle?.cancelledAt || null,
    lastTransition: lifecycle?.lastTransition || null,
    lastTransitionAt: lifecycle?.lastTransitionAt || null,
    lastTransitionBy: lifecycle?.lastTransitionBy || null,
    transitionLog: Array.isArray(lifecycle?.transitionLog) ? lifecycle.transitionLog : []
});

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const getDriverIdentityCandidates = (privateUser = {}) => {
    const employeeCode = normalizeIdentity(privateUser.employeeCode);
    const emailLocalPart = normalizeIdentity(privateUser.email?.split('@')[0]);
    const fullName = normalizeIdentity(privateUser.fullName);

    return [...new Set([
        employeeCode,
        emailLocalPart,
        fullName
    ].filter(Boolean))];
};

const isRideAssignedToDriver = (privateUser = {}, selectedDriver = {}) => {
    const driverId = normalizeIdentity(selectedDriver?.driverId);

    if (driverId && getDriverIdentityCandidates(privateUser).includes(driverId)) {
        return true;
    }

    return normalizeIdentity(selectedDriver?.fullName) === normalizeIdentity(privateUser.fullName);
};

const normalizeIdentity = (value) => (
    value
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        || null
);
