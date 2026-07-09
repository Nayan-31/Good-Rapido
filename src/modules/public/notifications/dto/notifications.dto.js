import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_DEVICE_PLATFORMS,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPE_CATALOG,
    NOTIFICATION_TYPES
} from '../notifications.constants.js';

export const toPublicNotificationOptions = () => ({
    types: NOTIFICATION_TYPE_CATALOG,
    statuses: Object.values(NOTIFICATION_STATUSES),
    priorities: Object.values(NOTIFICATION_PRIORITIES),
    channels: Object.values(NOTIFICATION_CHANNELS),
    categories: Object.values(NOTIFICATION_CATEGORIES),
    devicePlatforms: Object.values(NOTIFICATION_DEVICE_PLATFORMS)
});

export const toPublicNotification = (notification = {}) => ({
    id: getId(notification),
    notificationCode: notification.notificationCode,
    type: notification.type,
    category: notification.category,
    priority: notification.priority,
    status: notification.status,
    channel: notification.channel,
    title: notification.title || null,
    message: notification.message || null,
    action: {
        label: notification.actionLabel || null,
        url: notification.actionUrl || null
    },
    relatedEntity: toPublicRelatedEntity(notification.relatedEntity),
    delivery: toPublicDelivery(notification.delivery),
    expiresAt: notification.expiresAt || null,
    metadata: notification.metadata || {},
    createdAt: notification.createdAt || null,
    updatedAt: notification.updatedAt || null
});

export const toPublicNotificationHistoryItem = (notification = {}) => ({
    id: getId(notification),
    notificationCode: notification.notificationCode,
    type: notification.type,
    category: notification.category,
    priority: notification.priority,
    status: notification.status,
    channel: notification.channel,
    title: notification.title || null,
    message: notification.message || null,
    actionUrl: notification.actionUrl || null,
    readAt: notification.delivery?.readAt || null,
    sentAt: notification.delivery?.sentAt || null,
    expiresAt: notification.expiresAt || null,
    createdAt: notification.createdAt || null
});

export const toPublicNotificationSummary = (summary = {}) => ({
    totalNotifications: numberOrZero(summary.totalNotifications),
    unreadCount: numberOrZero(summary.unreadCount),
    readCount: numberOrZero(summary.readCount),
    archivedCount: numberOrZero(summary.archivedCount),
    urgentCount: numberOrZero(summary.urgentCount),
    byStatus: normalizeEnumCounts(summary.byStatus, Object.values(NOTIFICATION_STATUSES)),
    byType: normalizeEnumCounts(summary.byType, Object.values(NOTIFICATION_TYPES)),
    byCategory: normalizeEnumCounts(summary.byCategory, Object.values(NOTIFICATION_CATEGORIES)),
    latestNotificationAt: summary.latestNotificationAt || null
});

export const toPublicNotificationPreferences = (preferences = {}) => ({
    channels: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
        ...(preferences.channels || {})
    },
    categories: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
        ...(preferences.categories || {})
    },
    quietHours: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
        ...(preferences.quietHours || {})
    },
    devices: Array.isArray(preferences.devices) ? preferences.devices.map(toPublicDevice) : [],
    updatedAt: preferences.updatedAt || null
});

export const toPublicDevice = (device = {}) => ({
    token: maskToken(device.token),
    platform: device.platform || null,
    appVersion: device.appVersion || null,
    enabled: device.enabled !== false,
    lastSeenAt: device.lastSeenAt || null
});

export const toPublicNotificationGuidance = (notification = {}) => ({
    isUnread: notification.status === NOTIFICATION_STATUSES.UNREAD,
    isExpired: notification.expiresAt ? new Date(notification.expiresAt) < new Date() : false,
    canArchive: notification.status !== NOTIFICATION_STATUSES.ARCHIVED,
    nextAction: resolveNextAction(notification)
});

const toPublicRelatedEntity = (entity = {}) => ({
    type: entity?.type || null,
    id: entity?.id || null,
    code: entity?.code || null
});

const toPublicDelivery = (delivery = {}) => ({
    scheduledAt: delivery?.scheduledAt || null,
    sentAt: delivery?.sentAt || null,
    readAt: delivery?.readAt || null,
    archivedAt: delivery?.archivedAt || null,
    failedAt: delivery?.failedAt || null,
    failureReason: delivery?.failureReason || null
});

const resolveNextAction = (notification = {}) => {
    if (notification.status === NOTIFICATION_STATUSES.ARCHIVED) {
        return 'Notification is archived';
    }

    if (notification.status === NOTIFICATION_STATUSES.UNREAD) {
        return notification.actionUrl ? 'Open notification action or mark it as read' : 'Mark notification as read';
    }

    return notification.actionUrl ? 'Open notification action' : 'No action required';
};

const normalizeEnumCounts = (counts = {}, keys = []) => keys.reduce((result, key) => ({
    ...result,
    [key]: numberOrZero(counts[key])
}), {});

const maskToken = (token = '') => {
    if (!token) {
        return null;
    }

    if (token.length <= 10) {
        return token;
    }

    return `${token.slice(0, 6)}...${token.slice(-4)}`;
};

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
