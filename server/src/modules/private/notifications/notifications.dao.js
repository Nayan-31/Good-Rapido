import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import Notification from '../../public/notifications/notifications.model.js';
import { NOTIFICATION_STATUSES } from '../../public/notifications/notifications.constants.js';
import { PRIVATE_NOTIFICATION_DELIVERY_STATUSES } from './notifications.constants.js';

export default class PrivateNotificationsDao {
    constructor(notificationModel = Notification, privateAuthModel = PrivateAuthUser) {
        this.notificationModel = notificationModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }

    findDashboardNotifications({ limit = 50 } = {}) {
        return this.notificationModel
            .find({})
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    findNotifications(query = {}) {
        const filter = buildNotificationFilter(query);

        return this.notificationModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(query.limit || 25);
    }

    findNotificationsForUser(authUserId, role, query = {}) {
        const filter = {
            ...buildNotificationFilter(query),
            authUserId,
            role
        };

        return this.notificationModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(query.limit || 25);
    }

    findById(notificationId) {
        if (!mongoose.isValidObjectId(notificationId)) {
            return null;
        }

        return this.notificationModel.findById(notificationId);
    }

    findByIdForUser(notificationId, authUserId, role) {
        if (!mongoose.isValidObjectId(notificationId)) {
            return null;
        }

        return this.notificationModel.findOne({
            _id: notificationId,
            authUserId,
            role
        });
    }

    createNotifications(payloads = []) {
        return this.notificationModel.insertMany(payloads);
    }

    updateNotification(notificationId, payload) {
        if (!mongoose.isValidObjectId(notificationId)) {
            return null;
        }

        return this.notificationModel.findByIdAndUpdate(
            notificationId,
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }

    markReadForUser(notificationId, authUserId, role, readAt) {
        if (!mongoose.isValidObjectId(notificationId)) {
            return null;
        }

        return this.notificationModel.findOneAndUpdate(
            {
                _id: notificationId,
                authUserId,
                role
            },
            {
                $set: {
                    status: NOTIFICATION_STATUSES.READ,
                    'delivery.readAt': readAt
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
    }
}

const buildNotificationFilter = (query = {}) => {
    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.type) {
        filter.type = query.type;
    }

    if (query.category) {
        filter.category = query.category;
    }

    if (query.priority) {
        filter.priority = query.priority;
    }

    if (query.channel) {
        filter.channel = query.channel;
    }

    if (query.role) {
        filter.role = query.role;
    }

    applyDeliveryStatusFilter(filter, query.deliveryStatus);

    if (query.q) {
        const searchPattern = new RegExp(escapeRegExp(query.q), 'i');

        filter.$or = [
            { notificationCode: searchPattern },
            { title: searchPattern },
            { message: searchPattern },
            { 'relatedEntity.id': searchPattern },
            { 'relatedEntity.code': searchPattern }
        ];
    }

    return filter;
};

const applyDeliveryStatusFilter = (filter, deliveryStatus) => {
    if (!deliveryStatus) {
        return;
    }

    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.READ) {
        filter.status = NOTIFICATION_STATUSES.READ;
        return;
    }

    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.ARCHIVED) {
        filter.status = NOTIFICATION_STATUSES.ARCHIVED;
        return;
    }

    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.FAILED) {
        filter['delivery.failedAt'] = { $exists: true };
        return;
    }

    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SENT) {
        filter['delivery.sentAt'] = { $exists: true };
        filter['delivery.failedAt'] = { $exists: false };
        return;
    }

    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SCHEDULED) {
        filter['delivery.scheduledAt'] = { $exists: true };
        filter['delivery.sentAt'] = { $exists: false };
        filter['delivery.failedAt'] = { $exists: false };
        return;
    }

    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.PENDING) {
        filter['delivery.scheduledAt'] = { $exists: false };
        filter['delivery.sentAt'] = { $exists: false };
        filter['delivery.failedAt'] = { $exists: false };
    }
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
