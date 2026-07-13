import { FARE_VEHICLE_TYPES } from '../../../public/fare/fare.constants.js';
import {
    RIDE_BOOKING_CANCELLATION_REASONS,
    RIDE_BOOKING_RISK_LEVELS,
    RIDE_BOOKING_STATUSES
} from '../../../public/ride-booking/ride-booking.constants.js';
import { RIDE_LIFECYCLE_STATUSES } from '../../../public/rides/rides.constants.js';
import {
    RIDE_OPS_ACTIONS,
    RIDE_OPS_FILTERS,
    RIDE_OPS_ISSUE_STATUSES,
    RIDE_OPS_PRIORITY_LEVELS
} from '../ride-ops.constants.js';

export const toRideOpsOptions = () => ({
    filters: Object.values(RIDE_OPS_FILTERS),
    bookingStatuses: Object.values(RIDE_BOOKING_STATUSES),
    lifecycleStatuses: Object.values(RIDE_LIFECYCLE_STATUSES),
    vehicleTypes: Object.values(FARE_VEHICLE_TYPES),
    cancellationReasons: Object.values(RIDE_BOOKING_CANCELLATION_REASONS),
    riskLevels: Object.values(RIDE_BOOKING_RISK_LEVELS),
    priorityLevels: Object.values(RIDE_OPS_PRIORITY_LEVELS),
    issueStatuses: Object.values(RIDE_OPS_ISSUE_STATUSES),
    actions: Object.values(RIDE_OPS_ACTIONS)
});

export const toRideOpsDashboard = (summary = {}, rides = []) => ({
    summary: {
        totalRides: summary.totalRides || 0,
        pendingConfirmation: summary.pendingConfirmation || 0,
        activeRides: summary.activeRides || 0,
        completedRides: summary.completedRides || 0,
        cancelledRides: summary.cancelledRides || 0,
        highRiskRides: summary.highRiskRides || 0,
        escalatedRides: summary.escalatedRides || 0,
        urgentRides: summary.urgentRides || 0,
        averageFare: numberOrZero(summary.averageFare)
    },
    queue: rides.map(toRideOpsQueueItem)
});

export const toRideOpsQueue = (rides = [], summary = {}) => ({
    rides: rides.map(toRideOpsQueueItem),
    summary: {
        totalRides: summary.totalRides || rides.length,
        activeRides: summary.activeRides || 0,
        highRiskRides: summary.highRiskRides || 0,
        escalatedRides: summary.escalatedRides || 0,
        urgentRides: summary.urgentRides || 0
    }
});

export const toRideOpsQueueItem = (ride = {}) => ({
    id: ride.id,
    bookingCode: ride.bookingCode,
    bookingStatus: ride.bookingStatus,
    lifecycleStatus: ride.lifecycleStatus,
    pickup: toLocation(ride.pickup),
    dropoff: toLocation(ride.dropoff),
    vehicleType: ride.vehicleType,
    driver: toDriver(ride.driver),
    fare: {
        currency: ride.fare?.currency || 'INR',
        totalFare: numberOrZero(ride.fare?.totalFare),
        distanceKm: numberOrZero(ride.fare?.distanceKm),
        durationMinutes: numberOrZero(ride.fare?.durationMinutes)
    },
    risk: toRiskSummary(ride),
    ops: toOpsState(ride.ops),
    timeline: toTimeline(ride.timeline),
    guidance: toOpsGuidance(ride),
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt
});

export const toRideOpsDetail = (ride = {}) => ({
    ...toRideOpsQueueItem(ride),
    authUserId: ride.authUserId || null,
    role: ride.role || null,
    fare: toFare(ride.fare),
    trustSignals: toTrustSignals(ride.trustSignals),
    paymentMethod: ride.paymentMethod || null,
    riderNote: ride.riderNote || null,
    cancellation: ride.cancellation || null,
    ops: toOpsState(ride.ops, true)
});

const toLocation = (location = {}) => ({
    address: location.address || null,
    latitude: numberOrZero(location.latitude),
    longitude: numberOrZero(location.longitude)
});

const toDriver = (driver = {}) => ({
    driverId: driver.driverId || null,
    fullName: driver.fullName || null,
    rating: numberOrZero(driver.rating),
    vehicleName: driver.vehicleName || null,
    vehicleNumber: driver.vehicleNumber || null,
    vehicleColor: driver.vehicleColor || null,
    etaMinutes: numberOrZero(driver.etaMinutes),
    distanceKm: numberOrZero(driver.distanceKm)
});

const toFare = (fare = {}) => ({
    currency: fare.currency || 'INR',
    totalFare: numberOrZero(fare.totalFare),
    distanceKm: numberOrZero(fare.distanceKm),
    durationMinutes: numberOrZero(fare.durationMinutes),
    surgeMultiplier: numberOrZero(fare.surgeMultiplier),
    confidenceScore: numberOrZero(fare.confidenceScore),
    validUntil: fare.validUntil || null,
    lockedUntil: fare.lockedUntil || null
});

const toTrustSignals = (signals = {}) => ({
    driverTrustScore: numberOrZero(signals.driverTrustScore),
    driverReliabilityScore: numberOrZero(signals.driverReliabilityScore),
    routeFairnessScore: numberOrZero(signals.routeFairnessScore),
    routeAccuracyScore: numberOrZero(signals.routeAccuracyScore),
    cancellationRiskScore: numberOrZero(signals.cancellationRiskScore),
    cancellationRiskLevel: signals.cancellationRiskLevel || null,
    cancellationRatio: numberOrZero(signals.cancellationRatio),
    detourPercentage: numberOrZero(signals.detourPercentage),
    onTimeArrivalScore: numberOrZero(signals.onTimeArrivalScore),
    fairPriceScore: numberOrZero(signals.fairPriceScore)
});

const toRiskSummary = (ride = {}) => ({
    cancellationRiskScore: numberOrZero(ride.trustSignals?.cancellationRiskScore),
    cancellationRiskLevel: ride.trustSignals?.cancellationRiskLevel || null,
    routeAccuracyScore: numberOrZero(ride.trustSignals?.routeAccuracyScore),
    fairPriceScore: numberOrZero(ride.trustSignals?.fairPriceScore),
    needsAttention: ride.needsAttention === true
});

const toTimeline = (timeline = {}) => ({
    bookedAt: timeline.bookedAt || null,
    confirmedAt: timeline.confirmedAt || null,
    driverArrivalEtaAt: timeline.driverArrivalEtaAt || null,
    estimatedDropoffAt: timeline.estimatedDropoffAt || null,
    completedAt: timeline.completedAt || null,
    cancelledAt: timeline.cancelledAt || null
});

const toOpsState = (ops = {}, includeLog = false) => ({
    priority: ops.priority || RIDE_OPS_PRIORITY_LEVELS.NORMAL,
    issueStatus: ops.issueStatus || RIDE_OPS_ISSUE_STATUSES.NONE,
    assignedOpsUserId: toId(ops.assignedOpsUserId),
    lastAction: ops.lastAction || null,
    lastActionNote: ops.lastActionNote || null,
    lastActionAt: ops.lastActionAt || null,
    lastActionBy: toId(ops.lastActionBy),
    ...(includeLog ? { actionLog: toActionLog(ops.actionLog) } : {})
});

const toActionLog = (actionLog = []) => (Array.isArray(actionLog) ? actionLog : []).map((action) => ({
    action: action.action || null,
    note: action.note || null,
    actorId: toId(action.actorId),
    actorRole: action.actorRole || null,
    createdAt: action.createdAt || null
}));

const toOpsGuidance = (ride = {}) => ({
    canConfirm: ride.bookingStatus === RIDE_BOOKING_STATUSES.DRIVER_SELECTED,
    canCancel: ride.bookingStatus !== RIDE_BOOKING_STATUSES.CANCELLED
        && ride.lifecycleStatus !== RIDE_LIFECYCLE_STATUSES.COMPLETED,
    canReassignDriver: [
        RIDE_BOOKING_STATUSES.DRIVER_SELECTED,
        RIDE_BOOKING_STATUSES.CONFIRMED
    ].includes(ride.bookingStatus),
    needsAttention: ride.needsAttention === true,
    nextAction: resolveNextAction(ride)
});

const resolveNextAction = (ride = {}) => {
    if (ride.bookingStatus === RIDE_BOOKING_STATUSES.CANCELLED) {
        return 'Review cancellation details';
    }

    if (ride.lifecycleStatus === RIDE_LIFECYCLE_STATUSES.COMPLETED) {
        return 'Review ride outcome';
    }

    if (ride.ops?.issueStatus === RIDE_OPS_ISSUE_STATUSES.ESCALATED) {
        return 'Resolve escalated ride issue';
    }

    if (ride.needsAttention) {
        return 'Monitor risk signals';
    }

    if (ride.bookingStatus === RIDE_BOOKING_STATUSES.DRIVER_SELECTED) {
        return 'Confirm ride or help rider reselect driver';
    }

    return 'Monitor ride progress';
};

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;
