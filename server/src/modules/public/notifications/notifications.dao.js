import mongoose from 'mongoose';
import Notification, { NotificationPreference } from './notifications.model.js';
import {
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES
} from './notifications.constants.js';

export default class NotificationsDao {
    constructor(notificationModel = Notification, preferenceModel = NotificationPreference) {
        this.notificationModel = notificationModel;
        this.preferenceModel = preferenceModel;
    }

    findForUser(authUserId, role, { status, type, category, priority, limit = 10 } = {}) {
        const filter = { authUserId, role };

        if (status) {
            filter.status = status;
        }

        if (type) {
            filter.type = type;
        }

        if (category) {
            filter.category = category;
        }

        if (priority) {
            filter.priority = priority;
        }

        return this.notificationModel.find(filter).sort({ createdAt: -1 }).limit(limit);
    }

    findByIdForUser(notificationId, authUserId, role) {
        if (!mongoose.isValidObjectId(notificationId)) {
            return null;
        }

        return this.notificationModel.findOne({ _id: notificationId, authUserId, role });
    }

    countUnreadForUser(authUserId, role) {
        return this.notificationModel.countDocuments({
            authUserId,
            role,
            status: NOTIFICATION_STATUSES.UNREAD
        });
    }

    markRead(notificationId, authUserId, role, readAt) {
        if (!mongoose.isValidObjectId(notificationId)) {
            return null;
        }

        return this.notificationModel.findOneAndUpdate(
            { _id: notificationId, authUserId, role },
            {
                $set: {
                    status: NOTIFICATION_STATUSES.READ,
                    'delivery.readAt': readAt
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
    }

    archive(notificationId, authUserId, role, archivedAt) {
        if (!mongoose.isValidObjectId(notificationId)) {
            return null;
        }

        return this.notificationModel.findOneAndUpdate(
            { _id: notificationId, authUserId, role },
            {
                $set: {
                    status: NOTIFICATION_STATUSES.ARCHIVED,
                    'delivery.archivedAt': archivedAt
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
    }

    markAllRead(authUserId, role, { type, category, readAt } = {}) {
        const filter = {
            authUserId,
            role,
            status: NOTIFICATION_STATUSES.UNREAD
        };

        if (type) {
            filter.type = type;
        }

        if (category) {
            filter.category = category;
        }

        return this.notificationModel.updateMany(
            filter,
            {
                $set: {
                    status: NOTIFICATION_STATUSES.READ,
                    'delivery.readAt': readAt
                }
            },
            { runValidators: true }
        );
    }

    findPreferencesForUser(authUserId, role) {
        return this.preferenceModel.findOne({ authUserId, role });
    }

    upsertPreferencesForUser(authUserId, role, payload) {
        return this.preferenceModel.findOneAndUpdate(
            { authUserId, role },
            {
                $set: {
                    ...payload,
                    authUserId,
                    role
                }
            },
            {
                upsert: true,
                returnDocument: 'after',
                setDefaultsOnInsert: true,
                runValidators: true
            }
        );
    }

    async findSummaryForUser(authUserId, role) {
        const [summary] = await this.notificationModel.aggregate([
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
                                totalNotifications: { $sum: 1 },
                                unreadCount: countStatus(NOTIFICATION_STATUSES.UNREAD),
                                readCount: countStatus(NOTIFICATION_STATUSES.READ),
                                archivedCount: countStatus(NOTIFICATION_STATUSES.ARCHIVED),
                                urgentCount: countPriority(NOTIFICATION_PRIORITIES.URGENT),
                                latestNotificationAt: { $max: '$createdAt' }
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

        return summary || { totals: [], statuses: [], types: [], categories: [] };
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
