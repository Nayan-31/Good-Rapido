import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
    RATING_DIMENSIONS,
    RATING_EDIT_WINDOW_DAYS,
    RATING_SENTIMENTS,
    RATING_STATUSES
} from './ratings.constants.js';
import {
    toPublicRating,
    toPublicRatingEligibility,
    toPublicRatingHistoryItem,
    toPublicRatingImpact,
    toPublicRatingOptions,
    toPublicRatingSummary
} from './dto/ratings.dto.js';

export default class RatingsService {
    constructor({ ratingsDao, ridesDao, now = () => new Date() }) {
        this.ratingsDao = ratingsDao;
        this.ridesDao = ridesDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthContext(authContext);

        return buildSuccessResponse({
            message: 'Rating options fetched successfully',
            data: {
                options: toPublicRatingOptions()
            }
        });
    }

    async summary(authContext) {
        const { userId, role } = this.assertAuthContext(authContext);
        const summary = await this.ratingsDao.findSummaryForUser(userId, role);

        return buildSuccessResponse({
            message: 'Rating summary fetched successfully',
            data: {
                summary: toPublicRatingSummary(normalizeSummary(summary))
            }
        });
    }

    async history(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const ratings = await this.ratingsDao.findHistoryForUser(userId, role, query);
        const plainRatings = ratings.map(toPlainObject);

        return buildSuccessResponse({
            message: 'Rating history fetched successfully',
            data: {
                history: plainRatings.map(toPublicRatingHistoryItem),
                summary: toPublicRatingSummary(buildSummaryFromRatings(plainRatings))
            }
        });
    }

    async getRating(authContext, ratingId) {
        const rating = await this.findRating(authContext, ratingId);

        return buildSuccessResponse({
            message: 'Rating fetched successfully',
            data: {
                rating: toPublicRating(rating)
            }
        });
    }

    async getRideRating(authContext, rideId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const ride = await this.findRideForRating(rideId, userId, role);
        const rideObject = toPlainObject(ride);
        const existingRating = await this.ratingsDao.findByRideForUser(rideId, userId, role);
        const rating = existingRating ? toPlainObject(existingRating) : null;

        return buildSuccessResponse({
            message: 'Ride rating status fetched successfully',
            data: {
                rating: rating ? toPublicRating(rating) : null,
                eligibility: toPublicRatingEligibility(this.buildEligibility(rideObject, rating))
            }
        });
    }

    async submitRideRating(authContext, rideId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const ride = await this.findRideForRating(rideId, userId, role);
        const rideObject = toPlainObject(ride);

        if (!this.isCompletedRide(rideObject)) {
            throw AppError.badRequest('Only completed rides can be rated');
        }

        const existingRating = await this.ratingsDao.findByRideForUser(rideId, userId, role);

        if (existingRating) {
            throw AppError.conflict('Ride is already rated');
        }

        const submittedAt = this.now();
        const ratingPayload = {
            ratingCode: createRatingCode(submittedAt),
            authUserId: userId,
            role,
            rideId: getId(rideObject),
            rideSnapshot: this.toRideSnapshot(rideObject),
            score: payload.score,
            sentiment: resolveSentiment(payload.score),
            status: RATING_STATUSES.SUBMITTED,
            tags: uniqueArray(payload.tags || []),
            dimensions: normalizeDimensions(payload.dimensions),
            comment: normalizeComment(payload.comment),
            isAnonymous: Boolean(payload.isAnonymous),
            submittedAt,
            editableUntil: addDays(submittedAt, RATING_EDIT_WINDOW_DAYS),
            editCount: 0
        };

        let rating;

        try {
            rating = await this.ratingsDao.create(ratingPayload);
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('Ride is already rated');
            }

            throw err;
        }

        const ratingObject = toPlainObject(rating);

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Ride rating submitted successfully',
            data: {
                rating: toPublicRating(ratingObject),
                impact: toPublicRatingImpact(ratingObject)
            }
        });
    }

    async updateRating(authContext, ratingId, payload) {
        const existingRating = await this.findRating(authContext, ratingId);

        if (!this.canEdit(existingRating)) {
            throw AppError.badRequest('Rating edit window has expired');
        }

        const updatePayload = this.buildUpdatePayload(existingRating, payload);
        const { userId, role } = this.assertAuthContext(authContext);
        const updatedRating = await this.ratingsDao.updateByIdForUser(ratingId, userId, role, updatePayload);

        if (!updatedRating) {
            throw AppError.notFound('Rating not found');
        }

        const ratingObject = toPlainObject(updatedRating);

        return buildSuccessResponse({
            message: 'Rating updated successfully',
            data: {
                rating: toPublicRating(ratingObject),
                impact: toPublicRatingImpact(ratingObject)
            }
        });
    }

    async findRating(authContext, ratingId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const rating = await this.ratingsDao.findByIdForUser(ratingId, userId, role);

        if (!rating) {
            throw AppError.notFound('Rating not found');
        }

        return toPlainObject(rating);
    }

    async findRideForRating(rideId, userId, role) {
        const ride = await this.ridesDao.findByIdForUser(rideId, userId, role);

        if (!ride) {
            throw AppError.notFound('Ride not found');
        }

        return ride;
    }

    buildEligibility(ride, rating = null) {
        const completedAt = this.getRideCompletedAt(ride);

        if (rating) {
            return {
                canRate: false,
                reason: 'Ride is already rated',
                completedAt,
                editableUntil: rating.editableUntil || null
            };
        }

        if (!this.isCompletedRide(ride)) {
            return {
                canRate: false,
                reason: 'Only completed rides can be rated',
                completedAt,
                editableUntil: null
            };
        }

        return {
            canRate: true,
            reason: null,
            completedAt,
            editableUntil: addDays(this.now(), RATING_EDIT_WINDOW_DAYS)
        };
    }

    buildUpdatePayload(existingRating, payload) {
        const updatePayload = {
            status: RATING_STATUSES.UPDATED,
            editCount: (existingRating.editCount || 0) + 1
        };

        if (payload.score !== undefined) {
            updatePayload.score = payload.score;
            updatePayload.sentiment = resolveSentiment(payload.score);
        }

        if (payload.tags !== undefined) {
            updatePayload.tags = uniqueArray(payload.tags);
        }

        if (payload.dimensions !== undefined) {
            updatePayload.dimensions = {
                ...normalizeDimensions(existingRating.dimensions),
                ...normalizeDimensions(payload.dimensions)
            };
        }

        if (payload.comment !== undefined) {
            updatePayload.comment = normalizeComment(payload.comment);
        }

        if (payload.isAnonymous !== undefined) {
            updatePayload.isAnonymous = Boolean(payload.isAnonymous);
        }

        return updatePayload;
    }

    isCompletedRide(ride) {
        const completedAt = this.getRideCompletedAt(ride);

        return ride.status === RIDE_BOOKING_STATUSES.CONFIRMED
            && Boolean(completedAt)
            && completedAt <= this.now();
    }

    getRideCompletedAt(ride) {
        if (!ride.confirmedAt) {
            return null;
        }

        const confirmedAt = new Date(ride.confirmedAt);

        if (Number.isNaN(confirmedAt.getTime())) {
            return null;
        }

        const etaMinutes = ride.selectedDriver?.etaMinutes || 0;
        const durationMinutes = ride.fareSnapshot?.durationMinutes || 0;

        return addMinutes(addMinutes(confirmedAt, etaMinutes), durationMinutes);
    }

    canEdit(rating) {
        if (!rating.editableUntil) {
            return false;
        }

        return new Date(rating.editableUntil) >= this.now();
    }

    toRideSnapshot(ride) {
        return {
            bookingCode: ride.bookingCode,
            pickup: ride.pickup,
            dropoff: ride.dropoff,
            vehicleType: ride.vehicleType,
            driver: {
                driverId: ride.selectedDriver?.driverId || null,
                fullName: ride.selectedDriver?.fullName || null,
                vehicleName: ride.selectedDriver?.vehicleName || null,
                vehicleNumber: ride.selectedDriver?.vehicleNumber || null
            }
        };
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const resolveSentiment = (score) => {
    if (score >= 4) {
        return RATING_SENTIMENTS.POSITIVE;
    }

    if (score === 3) {
        return RATING_SENTIMENTS.NEUTRAL;
    }

    return RATING_SENTIMENTS.NEGATIVE;
};

const normalizeDimensions = (dimensions = {}) => {
    if (!dimensions) {
        return null;
    }

    return Object.values(RATING_DIMENSIONS).reduce((result, key) => {
        if (Number.isFinite(dimensions[key])) {
            result[key] = dimensions[key];
        }

        return result;
    }, {});
};

const normalizeComment = (comment) => {
    if (comment === undefined || comment === null) {
        return null;
    }

    const trimmed = comment.trim();

    return trimmed || null;
};

const uniqueArray = (values = []) => [...new Set(values)];

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const createRatingCode = (date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `RTG-${compactTimestamp}-${randomSuffix}`;
};

const normalizeSummary = (summary = {}) => {
    const totals = summary.totals?.[0] || summary;

    return {
        totalRatings: totals.totalRatings || 0,
        averageScore: totals.averageScore || 0,
        positiveCount: totals.positiveCount || 0,
        neutralCount: totals.neutralCount || 0,
        negativeCount: totals.negativeCount || 0,
        scoreDistribution: scoreDistributionFromRows(summary.scores),
        topTags: tagRows(summary.tags),
        lastRatedAt: totals.lastRatedAt || null
    };
};

const buildSummaryFromRatings = (ratings = []) => {
    const summary = ratings.reduce((result, rating) => {
        result.totalRatings += 1;
        result.totalScore += rating.score || 0;
        result.scoreDistribution[rating.score] = (result.scoreDistribution[rating.score] || 0) + 1;
        result.lastRatedAt = maxDate(result.lastRatedAt, rating.createdAt);

        if (rating.sentiment === RATING_SENTIMENTS.POSITIVE) {
            result.positiveCount += 1;
        } else if (rating.sentiment === RATING_SENTIMENTS.NEUTRAL) {
            result.neutralCount += 1;
        } else if (rating.sentiment === RATING_SENTIMENTS.NEGATIVE) {
            result.negativeCount += 1;
        }

        for (const tag of rating.tags || []) {
            result.tagCounts[tag] = (result.tagCounts[tag] || 0) + 1;
        }

        return result;
    }, {
        totalRatings: 0,
        totalScore: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        scoreDistribution: {},
        tagCounts: {},
        lastRatedAt: null
    });

    return {
        ...summary,
        averageScore: summary.totalRatings ? summary.totalScore / summary.totalRatings : 0,
        topTags: Object.entries(summary.tagCounts)
            .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
            .slice(0, 5)
            .map(([tag, count]) => ({ tag, count }))
    };
};

const scoreDistributionFromRows = (rows = []) => rows.reduce((result, row) => ({
    ...result,
    [row._id]: row.count
}), {});

const tagRows = (rows = []) => rows.map((row) => ({
    tag: row._id,
    count: row.count
}));

const maxDate = (left, right) => {
    if (!left) {
        return right || null;
    }

    if (!right) {
        return left;
    }

    return new Date(left) > new Date(right) ? left : right;
};
