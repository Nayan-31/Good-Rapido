import {
    RIDE_LIFECYCLE_EVENTS,
    RIDE_LIFECYCLE_STATUSES
} from '../ride-lifecycle.constants.js';

export const toRideLifecycleOptions = ({ bookingStatuses = [], cancellationReasons = [] } = {}) => ({
    bookingStatuses,
    lifecycleStatuses: Object.values(RIDE_LIFECYCLE_STATUSES),
    lifecycleEvents: Object.values(RIDE_LIFECYCLE_EVENTS),
    cancellationReasons
});

export const toRideLifecycleView = (ride = {}, lifecycle = {}) => ({
    ride: {
        id: getId(ride),
        bookingCode: ride.bookingCode || null,
        bookingStatus: ride.status || null,
        authUserId: toId(ride.authUserId),
        role: ride.role || null,
        vehicleType: ride.vehicleType || null,
        pickup: toLocation(ride.pickup),
        dropoff: toLocation(ride.dropoff),
        driver: toDriver(ride.selectedDriver),
        fare: toFare(ride.fareSnapshot),
        trustSignals: toTrustSignals(ride.trustSignals)
    },
    lifecycleStatus: lifecycle.lifecycleStatus,
    timeline: toTimeline(lifecycle.timeline),
    progress: toProgress(lifecycle.progress),
    guidance: lifecycle.guidance || {},
    availableEvents: lifecycle.availableEvents || [],
    transitionLog: toTransitionLog(ride.lifecycle?.transitionLog),
    generatedAt: lifecycle.generatedAt || null,
    createdAt: ride.createdAt || null,
    updatedAt: ride.updatedAt || null
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

const toTimeline = (timeline = {}) => ({
    bookedAt: timeline.bookedAt || null,
    confirmedAt: timeline.confirmedAt || null,
    driverArrivalEtaAt: timeline.driverArrivalEtaAt || null,
    driverArrivedAt: timeline.driverArrivedAt || null,
    rideStartedAt: timeline.rideStartedAt || null,
    estimatedDropoffAt: timeline.estimatedDropoffAt || null,
    completedAt: timeline.completedAt || null,
    cancelledAt: timeline.cancelledAt || null
});

const toProgress = (progress = {}) => ({
    percentage: numberOrZero(progress.percentage),
    currentStep: progress.currentStep || null,
    nextAction: progress.nextAction || null
});

const toTransitionLog = (transitionLog = []) => (Array.isArray(transitionLog) ? transitionLog : []).map((entry) => ({
    event: entry.event || null,
    note: entry.note || null,
    actorId: entry.actorId || null,
    actorRole: entry.actorRole || null,
    occurredAt: entry.occurredAt || null,
    createdAt: entry.createdAt || null
}));

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;
