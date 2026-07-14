import {
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_ENTITY_TYPES,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPE_CATALOG,
    NOTIFICATION_TYPES
} from '../../../public/notifications/notifications.constants.js';
import {
    PRIVATE_NOTIFICATION_ACTIONS,
    PRIVATE_NOTIFICATION_AUDIENCES,
    PRIVATE_NOTIFICATION_DELIVERY_STATUSES
} from '../notifications.constants.js';

export const toPrivateNotificationOptions = () => ({
    audiences: Object.values(PRIVATE_NOTIFICATION_AUDIENCES),
    deliveryStatuses: Object.values(PRIVATE_NOTIFICATION_DELIVERY_STATUSES),
    statuses: Object.values(NOTIFICATION_STATUSES),
    types: NOTIFICATION_TYPE_CATALOG,
    categories: Object.values(NOTIFICATION_CATEGORIES),
    priorities: Object.values(NOTIFICATION_PRIORITIES),
    channels: Object.values(NOTIFICATION_CHANNELS),
    entityTypes: Object.values(NOTIFICATION_ENTITY_TYPES),
    actions: Object.values(PRIVATE_NOTIFICATION_ACTIONS)
});

export const toPrivateNotificationDashboard = (notifications = []) => ({
    summary: toPrivateNotificationSummary(notifications),
    urgentNotifications: notifications
        .filter((notification) => notification.priority === NOTIFICATION_PRIORITIES.URGENT)
        .map(toPrivateNotificationListItem),
    failedNotifications: notifications
        .filter((notification) => resolveDeliveryStatus(notification) === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.FAILED)
        .map(toPrivateNotificationListItem),
    scheduledNotifications: notifications
        .filter((notification) => resolveDeliveryStatus(notification) === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SCHEDULED)
        .map(toPrivateNotificationListItem),
    recentNotifications: [...notifications]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 8)
        .map(toPrivateNotificationListItem)
});

export const toPrivateNotificationList = (notifications = []) => ({
    notifications: notifications.map(toPrivateNotificationListItem),
    summary: toPrivateNotificationSummary(notifications)
});

export const toPrivateNotificationListItem = (notification = {}) => ({
    id: getId(notification),
    notificationCode: notification.notificationCode || null,
    authUserId: toId(notification.authUserId),
    role: notification.role || null,
    type: notification.type || null,
    category: notification.category || null,
    priority: notification.priority || NOTIFICATION_PRIORITIES.MEDIUM,
    status: notification.status || NOTIFICATION_STATUSES.UNREAD,
    deliveryStatus: resolveDeliveryStatus(notification),
    channel: notification.channel || NOTIFICATION_CHANNELS.IN_APP,
    title: notification.title || null,
    actionLabel: notification.actionLabel || null,
    relatedEntity: toRelatedEntity(notification.relatedEntity),
    delivery: toDelivery(notification.delivery),
    expiresAt: notification.expiresAt || null,
    createdAt: notification.createdAt || null,
    updatedAt: notification.updatedAt || null,
    guidance: toNotificationGuidance(notification)
});

export const toPrivateNotificationDetail = (notification = {}) => ({
    ...toPrivateNotificationListItem(notification),
    message: notification.message || null,
    actionUrl: notification.actionUrl || null,
    metadata: notification.metadata || {}
});

export const toPrivateNotificationCreateResult = (notifications = []) => ({
    createdCount: notifications.length,
    notifications: notifications.map(toPrivateNotificationListItem),
    summary: toPrivateNotificationSummary(notifications)
});

const toPrivateNotificationSummary = (notifications = []) => ({
    totalNotifications: notifications.length,
    unreadCount: countByStatus(notifications, NOTIFICATION_STATUSES.UNREAD),
    readCount: countByStatus(notifications, NOTIFICATION_STATUSES.READ),
    archivedCount: countByStatus(notifications, NOTIFICATION_STATUSES.ARCHIVED),
    urgentCount: countByPriority(notifications, NOTIFICATION_PRIORITIES.URGENT),
    scheduledCount: countByDeliveryStatus(notifications, PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SCHEDULED),
    sentCount: countByDeliveryStatus(notifications, PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SENT),
    failedCount: countByDeliveryStatus(notifications, PRIVATE_NOTIFICATION_DELIVERY_STATUSES.FAILED),
    byType: countByEnum(notifications, 'type', Object.values(NOTIFICATION_TYPES)),
    byCategory: countByEnum(notifications, 'category', Object.values(NOTIFICATION_CATEGORIES)),
    byChannel: countByEnum(notifications, 'channel', Object.values(NOTIFICATION_CHANNELS))
});

const toRelatedEntity = (relatedEntity = {}) => relatedEntity ? {
    type: relatedEntity.type || null,
    id: relatedEntity.id || null,
    code: relatedEntity.code || null
} : null;

const toDelivery = (delivery = {}) => ({
    scheduledAt: delivery?.scheduledAt || null,
    sentAt: delivery?.sentAt || null,
    readAt: delivery?.readAt || null,
    archivedAt: delivery?.archivedAt || null,
    failedAt: delivery?.failedAt || null,
    failureReason: delivery?.failureReason || null
});

const toNotificationGuidance = (notification = {}) => {
    const deliveryStatus = resolveDeliveryStatus(notification);

    return {
        canSend: [
            PRIVATE_NOTIFICATION_DELIVERY_STATUSES.PENDING,
            PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SCHEDULED
        ].includes(deliveryStatus),
        canRetry: deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.FAILED,
        canCancel: ![
            PRIVATE_NOTIFICATION_DELIVERY_STATUSES.READ,
            PRIVATE_NOTIFICATION_DELIVERY_STATUSES.ARCHIVED
        ].includes(deliveryStatus),
        nextAction: resolveNextAction(deliveryStatus)
    };
};

const resolveNextAction = (deliveryStatus) => {
    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.FAILED) {
        return 'Review failure reason and retry delivery';
    }

    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SCHEDULED) {
        return 'Wait for scheduled delivery or send now';
    }

    if (deliveryStatus === PRIVATE_NOTIFICATION_DELIVERY_STATUSES.PENDING) {
        return 'Send notification when ready';
    }

    return 'No action needed';
};

const resolveDeliveryStatus = (notification = {}) => {
    if (notification.status === NOTIFICATION_STATUSES.ARCHIVED) {
        return PRIVATE_NOTIFICATION_DELIVERY_STATUSES.ARCHIVED;
    }

    if (notification.status === NOTIFICATION_STATUSES.READ) {
        return PRIVATE_NOTIFICATION_DELIVERY_STATUSES.READ;
    }

    if (notification.delivery?.failedAt) {
        return PRIVATE_NOTIFICATION_DELIVERY_STATUSES.FAILED;
    }

    if (notification.delivery?.sentAt) {
        return PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SENT;
    }

    if (notification.delivery?.scheduledAt) {
        return PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SCHEDULED;
    }

    return PRIVATE_NOTIFICATION_DELIVERY_STATUSES.PENDING;
};

const countByStatus = (notifications = [], status) => notifications.filter((item) => item.status === status).length;

const countByPriority = (notifications = [], priority) => notifications.filter((item) => item.priority === priority).length;

const countByDeliveryStatus = (notifications = [], deliveryStatus) => (
    notifications.filter((item) => resolveDeliveryStatus(item) === deliveryStatus).length
);

const countByEnum = (notifications = [], field, keys = []) => keys.reduce((result, key) => ({
    ...result,
    [key]: notifications.filter((item) => item[field] === key).length
}), {});

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;
