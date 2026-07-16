import {
    NOTIFICATION_ENGINE_AUDIENCES,
    NOTIFICATION_ENGINE_CATEGORIES,
    NOTIFICATION_ENGINE_CHANNELS,
    NOTIFICATION_ENGINE_DELIVERY_STATUSES,
    NOTIFICATION_ENGINE_DEVICE_PLATFORMS,
    NOTIFICATION_ENGINE_ENTITY_TYPES,
    NOTIFICATION_ENGINE_FLOW_TYPES,
    NOTIFICATION_ENGINE_OPS_ACTIONS,
    NOTIFICATION_ENGINE_PRIORITIES,
    NOTIFICATION_ENGINE_STATUSES,
    NOTIFICATION_ENGINE_SUPPRESSION_REASONS,
    NOTIFICATION_ENGINE_TYPE_CATALOG,
    NOTIFICATION_ENGINE_TYPES
} from '../notification-engine.constants.js';

export const toNotificationEngineOptions = () => ({
    flowTypes: Object.values(NOTIFICATION_ENGINE_FLOW_TYPES),
    audiences: Object.values(NOTIFICATION_ENGINE_AUDIENCES),
    deliveryStatuses: Object.values(NOTIFICATION_ENGINE_DELIVERY_STATUSES),
    statuses: Object.values(NOTIFICATION_ENGINE_STATUSES),
    types: NOTIFICATION_ENGINE_TYPE_CATALOG,
    categories: Object.values(NOTIFICATION_ENGINE_CATEGORIES),
    priorities: Object.values(NOTIFICATION_ENGINE_PRIORITIES),
    channels: Object.values(NOTIFICATION_ENGINE_CHANNELS),
    devicePlatforms: Object.values(NOTIFICATION_ENGINE_DEVICE_PLATFORMS),
    entityTypes: Object.values(NOTIFICATION_ENGINE_ENTITY_TYPES),
    opsActions: Object.values(NOTIFICATION_ENGINE_OPS_ACTIONS),
    suppressionReasons: Object.values(NOTIFICATION_ENGINE_SUPPRESSION_REASONS)
});

export const toNotificationEngineDeliveryPlan = (plan = {}) => ({
    type: plan.type || NOTIFICATION_ENGINE_TYPES.SYSTEM,
    category: plan.category || NOTIFICATION_ENGINE_CATEGORIES.SYSTEM,
    priority: plan.priority || NOTIFICATION_ENGINE_PRIORITIES.MEDIUM,
    channel: plan.channel || NOTIFICATION_ENGINE_CHANNELS.IN_APP,
    deliveryStatus: plan.deliveryStatus || NOTIFICATION_ENGINE_DELIVERY_STATUSES.PENDING,
    deliverNow: Boolean(plan.deliverNow),
    suppressed: Boolean(plan.suppressed),
    suppressionReason: plan.suppressionReason || NOTIFICATION_ENGINE_SUPPRESSION_REASONS.NONE,
    scheduledAt: plan.scheduledAt || null,
    sentAt: plan.sentAt || null,
    expiresAt: plan.expiresAt || null,
    quietHoursActive: Boolean(plan.quietHoursActive),
    guidance: plan.guidance || null
});

export const toNotificationEngineComposition = (notification = {}) => ({
    notificationCode: notification.notificationCode || null,
    authUserId: notification.authUserId || null,
    role: notification.role || null,
    type: notification.type || NOTIFICATION_ENGINE_TYPES.SYSTEM,
    category: notification.category || NOTIFICATION_ENGINE_CATEGORIES.SYSTEM,
    priority: notification.priority || NOTIFICATION_ENGINE_PRIORITIES.MEDIUM,
    status: notification.status || NOTIFICATION_ENGINE_STATUSES.UNREAD,
    channel: notification.channel || NOTIFICATION_ENGINE_CHANNELS.IN_APP,
    title: notification.title || null,
    message: notification.message || null,
    action: {
        label: notification.actionLabel || null,
        url: notification.actionUrl || null
    },
    relatedEntity: notification.relatedEntity || null,
    delivery: {
        scheduledAt: notification.delivery?.scheduledAt || null,
        sentAt: notification.delivery?.sentAt || null,
        readAt: notification.delivery?.readAt || null,
        archivedAt: notification.delivery?.archivedAt || null,
        failedAt: notification.delivery?.failedAt || null,
        failureReason: notification.delivery?.failureReason || null
    },
    expiresAt: notification.expiresAt || null,
    metadata: notification.metadata || {},
    deliveryPlan: toNotificationEngineDeliveryPlan(notification.deliveryPlan)
});
