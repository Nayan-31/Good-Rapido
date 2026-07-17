import {
    RATING_DIMENSIONS,
    RATING_GUIDANCE,
    RATING_MAX_SCORE,
    RATING_MIN_SCORE,
    RATING_SCALE_LABELS,
    RATING_TAGS
} from '../ratings.constants.js';

export const toPublicRatingOptions = () => ({
    scale: {
        min: RATING_MIN_SCORE,
        max: RATING_MAX_SCORE,
        labels: RATING_SCALE_LABELS
    },
    dimensions: Object.values(RATING_DIMENSIONS),
    tags: Object.values(RATING_TAGS)
});

export const toPublicRating = (rating) => ({
    id: getId(rating),
    ratingCode: rating.ratingCode,
    rideId: getRideId(rating),
    ride: toPublicRideSnapshot(rating.rideSnapshot),
    score: numberOrZero(rating.score),
    sentiment: rating.sentiment || null,
    status: rating.status || null,
    tags: Array.isArray(rating.tags) ? rating.tags : [],
    dimensions: toPublicDimensions(rating.dimensions),
    comment: rating.comment || null,
    isAnonymous: Boolean(rating.isAnonymous),
    submittedAt: rating.submittedAt || null,
    editableUntil: rating.editableUntil || null,
    editCount: numberOrZero(rating.editCount),
    createdAt: rating.createdAt || null,
    updatedAt: rating.updatedAt || null
});

export const toPublicRatingHistoryItem = (rating) => ({
    id: getId(rating),
    ratingCode: rating.ratingCode,
    rideId: getRideId(rating),
    bookingCode: rating.rideSnapshot?.bookingCode || null,
    driverName: rating.isAnonymous ? null : rating.rideSnapshot?.driver?.fullName || null,
    vehicleType: rating.rideSnapshot?.vehicleType || null,
    score: numberOrZero(rating.score),
    sentiment: rating.sentiment || null,
    status: rating.status || null,
    tags: Array.isArray(rating.tags) ? rating.tags : [],
    submittedAt: rating.submittedAt || null,
    createdAt: rating.createdAt || null
});

export const toPublicRatingEligibility = (eligibility = {}) => ({
    canRate: Boolean(eligibility.canRate),
    reason: eligibility.reason || null,
    completedAt: eligibility.completedAt || null,
    editableUntil: eligibility.editableUntil || null
});

export const toPublicRatingImpact = (rating = {}) => ({
    sentiment: rating.sentiment || null,
    guidance: RATING_GUIDANCE[rating.sentiment] || null,
    contributesToTrustScore: Number.isFinite(rating.score) && rating.score >= 4,
    needsReview: Number.isFinite(rating.score) && rating.score <= 2
});

export const toPublicRatingSummary = (summary = {}) => ({
    totalRatings: numberOrZero(summary.totalRatings),
    averageScore: roundOne(summary.averageScore),
    positiveCount: numberOrZero(summary.positiveCount),
    neutralCount: numberOrZero(summary.neutralCount),
    negativeCount: numberOrZero(summary.negativeCount),
    scoreDistribution: normalizeScoreDistribution(summary.scoreDistribution),
    topTags: Array.isArray(summary.topTags) ? summary.topTags : [],
    lastRatedAt: summary.lastRatedAt || null
});

const toPublicRideSnapshot = (ride = {}) => ({
    bookingCode: ride?.bookingCode || null,
    pickup: toPublicLocation(ride?.pickup),
    dropoff: toPublicLocation(ride?.dropoff),
    vehicleType: ride?.vehicleType || null,
    driver: {
        driverId: ride?.driver?.driverId || null,
        fullName: ride?.driver?.fullName || null,
        vehicleName: ride?.driver?.vehicleName || null,
        vehicleNumber: ride?.driver?.vehicleNumber || null
    }
});

const toPublicLocation = (location = {}) => ({
    address: location?.address || null,
    latitude: numberOrZero(location?.latitude),
    longitude: numberOrZero(location?.longitude)
});

const toPublicDimensions = (dimensions = {}) => Object.values(RATING_DIMENSIONS).reduce((result, key) => ({
    ...result,
    [key]: nullableNumber(dimensions?.[key])
}), {});

const normalizeScoreDistribution = (distribution = {}) => {
    const normalized = {};

    for (let score = RATING_MIN_SCORE; score <= RATING_MAX_SCORE; score += 1) {
        normalized[score] = numberOrZero(distribution[score]);
    }

    return normalized;
};

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const getRideId = (rating = {}) => rating.rideId?._id?.toString?.()
    || rating.rideId?.toString?.()
    || rating.rideId
    || null;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const nullableNumber = (value) => Number.isFinite(value) ? value : null;

const roundOne = (value) => Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
