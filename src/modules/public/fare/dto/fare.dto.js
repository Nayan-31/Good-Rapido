import { FARE_CURRENCY } from '../fare.constants.js';

export const toPublicFareEstimate = (estimate) => {
    const estimateObject = estimate.toObject ? estimate.toObject() : estimate;

    return {
        id: estimateObject._id?.toString() || estimateObject.id,
        authUserId: estimateObject.authUserId?.toString() || estimateObject.authUserId,
        role: estimateObject.role,
        pickup: toPublicLocation(estimateObject.pickup),
        dropoff: toPublicLocation(estimateObject.dropoff),
        vehicleType: estimateObject.vehicleType,
        requestedAt: estimateObject.requestedAt,
        distanceKm: numberOrZero(estimateObject.distanceKm),
        durationMinutes: numberOrZero(estimateObject.durationMinutes),
        breakdown: toPublicBreakdown(estimateObject.breakdown),
        surge: toPublicSurge(estimateObject.surge),
        confidence: toPublicConfidence(estimateObject.confidence),
        alternativePickups: (estimateObject.alternativePickups || []).map(toPublicAlternativePickup),
        validUntil: estimateObject.validUntil,
        lock: {
            isLocked: Boolean(estimateObject.lock?.isLocked),
            lockedUntil: estimateObject.lock?.lockedUntil || null
        },
        createdAt: estimateObject.createdAt,
        updatedAt: estimateObject.updatedAt
    };
};

export const toPublicFareHistoryItem = (estimate) => {
    const estimateObject = estimate.toObject ? estimate.toObject() : estimate;

    return {
        id: estimateObject._id?.toString() || estimateObject.id,
        vehicleType: estimateObject.vehicleType,
        totalFare: numberOrZero(estimateObject.breakdown?.totalFare),
        currency: estimateObject.breakdown?.currency || FARE_CURRENCY,
        distanceKm: numberOrZero(estimateObject.distanceKm),
        requestedAt: estimateObject.requestedAt,
        createdAt: estimateObject.createdAt
    };
};

const toPublicLocation = (location = {}) => ({
    address: location.address || null,
    latitude: numberOrZero(location.latitude),
    longitude: numberOrZero(location.longitude)
});

const toPublicBreakdown = (breakdown = {}) => ({
    currency: breakdown.currency || FARE_CURRENCY,
    baseFare: numberOrZero(breakdown.baseFare),
    distanceFare: numberOrZero(breakdown.distanceFare),
    timeFare: numberOrZero(breakdown.timeFare),
    minFareAdjustment: numberOrZero(breakdown.minFareAdjustment),
    surgeFare: numberOrZero(breakdown.surgeFare),
    platformFee: numberOrZero(breakdown.platformFee),
    taxes: numberOrZero(breakdown.taxes),
    totalFare: numberOrZero(breakdown.totalFare)
});

const toPublicSurge = (surge = {}) => ({
    multiplier: numberOrZero(surge.multiplier),
    level: surge.level || null,
    reason: surge.reason || null
});

const toPublicConfidence = (confidence = {}) => ({
    score: numberOrZero(confidence.score),
    level: confidence.level || null,
    factors: confidence.factors || []
});

const toPublicAlternativePickup = (alternative = {}) => ({
    label: alternative.label,
    pickup: toPublicLocation(alternative.pickup),
    walkingDistanceMeters: numberOrZero(alternative.walkingDistanceMeters),
    estimatedSavings: numberOrZero(alternative.estimatedSavings),
    estimatedFare: numberOrZero(alternative.estimatedFare),
    reason: alternative.reason
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
