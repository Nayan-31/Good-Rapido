import mongoose from 'mongoose';
import Rating from './ratings.model.js';
import { RATING_SENTIMENTS } from './ratings.constants.js';

export default class RatingsDao {
    constructor(model = Rating) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findByIdForUser(ratingId, authUserId, role) {
        if (!mongoose.isValidObjectId(ratingId)) {
            return null;
        }

        return this.model.findOne({ _id: ratingId, authUserId, role });
    }

    findByRideForUser(rideId, authUserId, role) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.model.findOne({ rideId, authUserId, role });
    }

    findHistoryForUser(authUserId, role, { score, sentiment, limit = 10 } = {}) {
        const filter = { authUserId, role };

        if (score) {
            filter.score = score;
        }

        if (sentiment) {
            filter.sentiment = sentiment;
        }

        return this.model.find(filter).sort({ createdAt: -1 }).limit(limit);
    }

    updateByIdForUser(ratingId, authUserId, role, payload) {
        if (!mongoose.isValidObjectId(ratingId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: ratingId, authUserId, role },
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }

    async findSummaryForUser(authUserId, role) {
        const [summary] = await this.model.aggregate([
            {
                $match: {
                    authUserId: normalizeObjectId(authUserId),
                    role
                }
            },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                totalRatings: { $sum: 1 },
                                averageScore: { $avg: '$score' },
                                positiveCount: countSentiment(RATING_SENTIMENTS.POSITIVE),
                                neutralCount: countSentiment(RATING_SENTIMENTS.NEUTRAL),
                                negativeCount: countSentiment(RATING_SENTIMENTS.NEGATIVE),
                                lastRatedAt: { $max: '$createdAt' }
                            }
                        }
                    ],
                    scores: [
                        {
                            $group: {
                                _id: '$score',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    tags: [
                        { $unwind: '$tags' },
                        {
                            $group: {
                                _id: '$tags',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1, _id: 1 } },
                        { $limit: 5 }
                    ]
                }
            }
        ]);

        return summary || { totals: [], scores: [], tags: [] };
    }
}

const countSentiment = (sentiment) => ({
    $sum: {
        $cond: [{ $eq: ['$sentiment', sentiment] }, 1, 0]
    }
});

const normalizeObjectId = (id) => mongoose.isValidObjectId(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
