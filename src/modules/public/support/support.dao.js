import mongoose from 'mongoose';
import SupportTicket from './support.model.js';
import {
    SUPPORT_OPEN_STATUSES,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} from './support.constants.js';

export default class SupportDao {
    constructor(model = SupportTicket) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findForUser(authUserId, role, { status, category, priority, limit = 20 } = {}) {
        const filter = { authUserId, role };

        if (status) {
            filter.status = status;
        }

        if (category) {
            filter.category = category;
        }

        if (priority) {
            filter.priority = priority;
        }

        return this.model.find(filter).sort({ latestActivityAt: -1 }).limit(limit);
    }

    findByIdForUser(ticketId, authUserId, role) {
        if (!mongoose.isValidObjectId(ticketId)) {
            return null;
        }

        return this.model.findOne({ _id: ticketId, authUserId, role });
    }

    addMessage(ticketId, authUserId, role, { message, status, latestActivityAt }) {
        if (!mongoose.isValidObjectId(ticketId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: ticketId, authUserId, role },
            {
                $push: {
                    messages: message
                },
                $set: {
                    status,
                    latestActivityAt,
                    'timeline.lastUserMessageAt': latestActivityAt
                }
            },
            { new: true, runValidators: true }
        );
    }

    updateByIdForUser(ticketId, authUserId, role, payload) {
        if (!mongoose.isValidObjectId(ticketId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: ticketId, authUserId, role },
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
                                totalTickets: { $sum: 1 },
                                openCount: {
                                    $sum: {
                                        $cond: [{ $in: ['$status', SUPPORT_OPEN_STATUSES] }, 1, 0]
                                    }
                                },
                                resolvedCount: countStatus(SUPPORT_STATUSES.RESOLVED),
                                closedCount: countStatus(SUPPORT_STATUSES.CLOSED),
                                urgentCount: countPriority(SUPPORT_PRIORITIES.URGENT),
                                latestActivityAt: { $max: '$latestActivityAt' }
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
                    categories: [
                        {
                            $group: {
                                _id: '$category',
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        return summary || { totals: [], statuses: [], categories: [] };
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
