import { RIDE_BOOKING_STATUSES } from '../../public/ride-booking/ride-booking.constants.js';
import {
    RIDE_LIFECYCLE_ACTIVE_STATUSES,
    RIDE_LIFECYCLE_EVENTS,
    RIDE_LIFECYCLE_STATUSES,
    RIDE_PROGRESS_STEPS
} from './ride-lifecycle.constants.js';

export const buildRideLifecycle = (booking = {}, { now = new Date() } = {}) => {
    const resolvedNow = toDate(now);
    const timeline = buildRideTimeline(booking);
    const lifecycleStatus = resolveRideLifecycleStatus(booking, timeline, resolvedNow);
    const resolvedTimeline = {
        ...timeline,
        completedAt: lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED
            ? timeline.completedAt || timeline.estimatedDropoffAt
            : timeline.completedAt
    };

    return {
        lifecycleStatus,
        timeline: resolvedTimeline,
        progress: buildRideProgress(lifecycleStatus, resolvedTimeline, resolvedNow),
        guidance: buildRideGuidance(booking, lifecycleStatus),
        availableEvents: resolveAvailableLifecycleEvents(booking, lifecycleStatus),
        generatedAt: resolvedNow
    };
};

export const buildRideTimeline = (booking = {}) => {
    const lifecycle = normalizeLifecycle(booking.lifecycle);
    const bookedAt = booking.createdAt || null;
    const confirmedAt = lifecycle.confirmedAt || booking.confirmedAt || (
        booking.status === RIDE_BOOKING_STATUSES.CONFIRMED ? bookedAt : null
    );
    const driverEtaMinutes = booking.selectedDriver?.etaMinutes || 0;
    const rideDurationMinutes = booking.fareSnapshot?.durationMinutes || 0;
    const driverArrivalEtaAt = confirmedAt ? addMinutes(toDate(confirmedAt), driverEtaMinutes) : null;
    const driverArrivedAt = lifecycle.driverArrivedAt || null;
    const rideStartedAt = lifecycle.rideStartedAt || null;
    const estimatedDropoffBase = rideStartedAt || driverArrivedAt || driverArrivalEtaAt;
    const estimatedDropoffAt = estimatedDropoffBase
        ? addMinutes(toDate(estimatedDropoffBase), rideDurationMinutes)
        : null;

    return {
        bookedAt,
        confirmedAt,
        driverArrivalEtaAt,
        driverArrivedAt,
        rideStartedAt,
        estimatedDropoffAt,
        completedAt: lifecycle.completedAt || null,
        cancelledAt: lifecycle.cancelledAt || booking.cancellation?.cancelledAt || null
    };
};

export const resolveRideLifecycleStatus = (booking = {}, timeline = {}, now = new Date()) => {
    if (booking.status === RIDE_BOOKING_STATUSES.CANCELLED || timeline.cancelledAt) {
        return RIDE_LIFECYCLE_STATUSES.CANCELLED;
    }

    if (booking.status !== RIDE_BOOKING_STATUSES.CONFIRMED || !timeline.confirmedAt) {
        return RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION;
    }

    if (timeline.completedAt) {
        return RIDE_LIFECYCLE_STATUSES.COMPLETED;
    }

    if (timeline.rideStartedAt) {
        if (timeline.estimatedDropoffAt && toDate(now) < toDate(timeline.estimatedDropoffAt)) {
            return RIDE_LIFECYCLE_STATUSES.IN_PROGRESS;
        }

        return RIDE_LIFECYCLE_STATUSES.COMPLETED;
    }

    if (timeline.driverArrivedAt) {
        return RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED;
    }

    if (timeline.driverArrivalEtaAt && toDate(now) < toDate(timeline.driverArrivalEtaAt)) {
        return RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE;
    }

    if (timeline.estimatedDropoffAt && toDate(now) < toDate(timeline.estimatedDropoffAt)) {
        return RIDE_LIFECYCLE_STATUSES.IN_PROGRESS;
    }

    return RIDE_LIFECYCLE_STATUSES.COMPLETED;
};

export const buildRideProgress = (lifecycleStatus, timeline = {}, now = new Date()) => {
    const currentStep = RIDE_PROGRESS_STEPS[lifecycleStatus];
    const nextAction = getRideNextAction(lifecycleStatus);

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.CANCELLED) {
        return { percentage: 0, currentStep, nextAction };
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION) {
        return { percentage: 10, currentStep, nextAction };
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED) {
        return { percentage: 45, currentStep, nextAction };
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
        return { percentage: 100, currentStep, nextAction };
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
            currentStep,
            nextAction
        };
    }

    return {
        percentage: interpolateProgress({
            startAt: timeline.rideStartedAt || timeline.driverArrivedAt || timeline.driverArrivalEtaAt,
            endAt: timeline.estimatedDropoffAt,
            now,
            min: 45,
            max: 95
        }),
        currentStep,
        nextAction
    };
};

export const resolveAvailableLifecycleEvents = (_booking = {}, lifecycleStatus) => {
    if ([
        RIDE_LIFECYCLE_STATUSES.CANCELLED,
        RIDE_LIFECYCLE_STATUSES.COMPLETED,
        RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION
    ].includes(lifecycleStatus)) {
        return [];
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE) {
        return [
            RIDE_LIFECYCLE_EVENTS.DRIVER_ARRIVED,
            RIDE_LIFECYCLE_EVENTS.RIDE_STARTED,
            RIDE_LIFECYCLE_EVENTS.RIDE_CANCELLED
        ];
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED) {
        return [
            RIDE_LIFECYCLE_EVENTS.RIDE_STARTED,
            RIDE_LIFECYCLE_EVENTS.RIDE_CANCELLED
        ];
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.IN_PROGRESS) {
        return [
            RIDE_LIFECYCLE_EVENTS.RIDE_COMPLETED,
            RIDE_LIFECYCLE_EVENTS.RIDE_CANCELLED
        ];
    }

    return [];
};

export const buildRideGuidance = (booking = {}, lifecycleStatus) => ({
    isActive: RIDE_LIFECYCLE_ACTIVE_STATUSES.includes(lifecycleStatus),
    canTrack: RIDE_LIFECYCLE_ACTIVE_STATUSES.includes(lifecycleStatus),
    canCancel: lifecycleStatus !== RIDE_LIFECYCLE_STATUSES.CANCELLED
        && lifecycleStatus !== RIDE_LIFECYCLE_STATUSES.COMPLETED,
    requiresOpsAttention: booking.trustSignals?.cancellationRiskLevel === 'high'
        || booking.trustSignals?.cancellationRiskScore >= 70
        || booking.ops?.issueStatus === 'escalated',
    nextAction: getRideNextAction(lifecycleStatus)
});

export const getRideNextAction = (lifecycleStatus) => {
    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE) {
        return 'Meet the driver at the pickup point';
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED) {
        return 'Start the ride after pickup verification';
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.IN_PROGRESS) {
        return 'Track the route and review trip safety signals';
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
        return 'Review receipt and share ride feedback';
    }

    if (lifecycleStatus === RIDE_LIFECYCLE_STATUSES.CANCELLED) {
        return 'Check cancellation details and rebook if needed';
    }

    return 'Confirm the booking to start ride tracking';
};

const normalizeLifecycle = (lifecycle = {}) => lifecycle || {};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const interpolateProgress = ({ startAt, endAt, now, min, max }) => {
    if (!startAt || !endAt) {
        return min;
    }

    const startTime = toDate(startAt).getTime();
    const endTime = toDate(endAt).getTime();

    if (endTime <= startTime) {
        return max;
    }

    const elapsedRatio = (toDate(now).getTime() - startTime) / (endTime - startTime);

    return Math.round(clamp(min + elapsedRatio * (max - min), min, max));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toDate = (value) => value instanceof Date ? value : new Date(value);
