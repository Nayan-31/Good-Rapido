import mongoose from 'mongoose';
import Dispute from './disputes.model.js';
import {
    DISPUTE_OPEN_STATUSES,
    DISPUTE_PRIORITIES,
    DISPUTE_STATUSES
} from './disputes.constants.js';

export default class DisputesDao {
    constructor(model = Dispute) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findByIdForUser(disputeId, authUserId, role) {
        if (!mongoose.isValidObjectId(disputeId)) {
            return null;
        }

        return this.model.findOne({ _id: disputeId, authUserId, role });
    }

    findActiveByRideAndTypeForUser(rideId, authUserId, role, type) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.model.findOne({
            rideId,
            authUserId,
            role,
            type,
            status: { $in: DISPUTE_OPEN_STATUSES }
        });
    }

    findRideDisputesForUser(rideId, authUserId, role) {
        if (!mongoose.isValidObjectId(rideId)) {
            return [];
        }

        return this.model
            .find({ rideId, authUserId, role })
            .sort({ createdAt: -1 });
    }

    findHistoryForUser(authUserId, role, { status, type, limit = 10 } = {}) {
        const filter = { authUserId, role };

        if (status) {
            filter.status = status;
        }

        if (type) {
            filter.type = type;
        }

        return this.model.find(filter).sort({ createdAt: -1 }).limit(limit);
    }

    updateByIdForUser(disputeId, authUserId, role, payload) {
        if (!mongoose.isValidObjectId(disputeId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: disputeId, authUserId, role },
            { $set: payload },
            { new: true, runValidators: true }
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
                                totalDisputes: { $sum: 1 },
                                openCount: {
                                    $sum: {
                                        $cond: [{ $in: ['$status', DISPUTE_OPEN_STATUSES] }, 1, 0]
                                    }
                                },
                                resolvedCount: countStatus(DISPUTE_STATUSES.RESOLVED),
                                cancelledCount: countStatus(DISPUTE_STATUSES.CANCELLED),
                                urgentCount: countPriority(DISPUTE_PRIORITIES.URGENT),
                                latestSubmittedAt: { $max: '$timeline.submittedAt' }
                            }
                        }
                    ],
                    statuses: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    types: [
                        {
                            $group: {
                                _id: '$type',
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        return summary || { totals: [], statuses: [], types: [] };
    }
}

const countStatus = (status) => ({
    $sum: {
        $cond: [{ $eq: ['$status', status] }, 1, 0]
    }
});

const countPriority = (priority) => ({
    $sum: {
        $cond: [{ $eq: ['$priority', priority] }, 1, 0]
    }
});

const normalizeObjectId = (id) => mongoose.isValidObjectId(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
