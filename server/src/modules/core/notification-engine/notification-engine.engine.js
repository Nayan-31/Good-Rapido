import {
    NOTIFICATION_ENGINE_ACTION_LOG_LIMIT,
    NOTIFICATION_ENGINE_CHANNELS,
    NOTIFICATION_ENGINE_CATEGORIES,
    NOTIFICATION_ENGINE_DEFAULT_PREFERENCES,
    NOTIFICATION_ENGINE_DELIVERY_STATUSES,
    NOTIFICATION_ENGINE_OPS_ACTIONS,
    NOTIFICATION_ENGINE_PRIORITIES,
    NOTIFICATION_ENGINE_STATUSES,
    NOTIFICATION_ENGINE_SUPPRESSION_REASONS,
    NOTIFICATION_ENGINE_TYPE_CATALOG,
    NOTIFICATION_ENGINE_TYPES
} from './notification-engine.constants.js';

export const buildNotificationDeliveryPlan = ({
    type,
    category,
    priority,
    channel,
    preferences,
    scheduledAt = null,
    expiresAt = null,
    requestedAt = new Date()
} = {}) => {
    const profile = resolveNotificationTypeProfile(type);
    const resolvedCategory = category || profile.category;
    const resolvedPriority = priority || profile.defaultPriority || NOTIFICATION_ENGINE_PRIORITIES.MEDIUM;
    const resolvedChannel = channel || profile.defaultChannel || NOTIFICATION_ENGINE_CHANNELS.IN_APP;
    const normalizedPreferences = normalizeNotificationPreferences(preferences);
    const normalizedRequestedAt = normalizeDate(requestedAt);
    const suppressionReason = resolveSuppressionReason({
        category: resolvedCategory,
        channel: resolvedChannel,
        priority: resolvedPriority,
        preferences: normalizedPreferences,
        expiresAt,
        requestedAt: normalizedRequestedAt
    });
    const isSuppressed = suppressionReason !== NOTIFICATION_ENGINE_SUPPRESSION_REASONS.NONE;
    const isScheduled = Boolean(scheduledAt);

    return {
        type: profile.type,
        category: resolvedCategory,
        priority: resolvedPriority,
        channel: resolvedChannel,
        deliveryStatus: isSuppressed
            ? NOTIFICATION_ENGINE_DELIVERY_STATUSES.PENDING
            : isScheduled
                ? NOTIFICATION_ENGINE_DELIVERY_STATUSES.SCHEDULED
                : NOTIFICATION_ENGINE_DELIVERY_STATUSES.SENT,
        deliverNow: !isSuppressed && !isScheduled,
        suppressed: isSuppressed,
        suppressionReason,
        scheduledAt: scheduledAt || null,
        sentAt: !isSuppressed && !isScheduled ? normalizedRequestedAt : null,
        expiresAt: expiresAt || null,
        quietHoursActive: isWithinQuietHours(normalizedPreferences.quietHours, normalizedRequestedAt),
        preferences: normalizedPreferences,
        guidance: buildDeliveryGuidance({
            suppressed: isSuppressed,
            suppressionReason,
            scheduledAt,
            priority: resolvedPriority
        })
    };
};

export const buildNotificationPayload = (payload = {}, { actor, now = new Date(), recipient } = {}) => {
    const profile = resolveNotificationTypeProfile(payload.type);
    const normalizedRecipient = normalizeRecipient(recipient);
    const deliveryPlan = buildNotificationDeliveryPlan({
        type: payload.type,
        category: payload.category,
        priority: payload.priority,
        channel: payload.channel,
        scheduledAt: payload.scheduledAt,
        expiresAt: payload.expiresAt,
        requestedAt: now
    });
    const metadata = buildOpsActionMetadata({ metadata: payload.metadata || {} }, {
        action: NOTIFICATION_ENGINE_OPS_ACTIONS.CREATE,
        note: payload.scheduledAt ? 'Notification scheduled by ops' : 'Notification created by ops',
        actor,
        now
    });

    return {
        notificationCode: createNotificationCode(payload.type, now, normalizedRecipient.authUserId),
        authUserId: normalizedRecipient.authUserId,
        role: normalizedRecipient.role,
        type: profile.type,
        category: payload.category || profile.category,
        priority: payload.priority || profile.defaultPriority || NOTIFICATION_ENGINE_PRIORITIES.MEDIUM,
        status: NOTIFICATION_ENGINE_STATUSES.UNREAD,
        channel: payload.channel || profile.defaultChannel || NOTIFICATION_ENGINE_CHANNELS.IN_APP,
        title: trimText(payload.title),
        message: trimText(payload.message),
        actionLabel: trimToNull(payload.actionLabel),
        actionUrl: trimToNull(payload.actionUrl),
        relatedEntity: payload.relatedEntity || null,
        delivery: {
            scheduledAt: payload.scheduledAt || null,
            sentAt: payload.scheduledAt ? null : now
        },
        expiresAt: payload.expiresAt || null,
        metadata,
        deliveryPlan
    };
};

export const normalizeNotification = (notification) => {
    if (!notification) {
        return null;
    }

    return {
        ...notification,
        delivery: notification.delivery || {},
        metadata: notification.metadata || {}
    };
};

export const normalizeNotificationRecipients = (payload = {}) => {
    if (payload.recipient) {
        return [normalizeRecipient(payload.recipient)];
    }

    return (payload.recipients || []).map(normalizeRecipient);
};

export const normalizeNotificationPreferences = (preferences = {}) => ({
    channels: {
        ...NOTIFICATION_ENGINE_DEFAULT_PREFERENCES.channels,
        ...(preferences.channels || {})
    },
    categories: {
        ...NOTIFICATION_ENGINE_DEFAULT_PREFERENCES.categories,
        ...(preferences.categories || {})
    },
    quietHours: {
        ...NOTIFICATION_ENGINE_DEFAULT_PREFERENCES.quietHours,
        ...(preferences.quietHours || {})
    },
    devices: Array.isArray(preferences.devices) ? preferences.devices : [],
    updatedAt: preferences.updatedAt || null
});

export const mergeNotificationPreferences = (existingPreferences = {}, payload = {}) => {
    const normalizedExisting = normalizeNotificationPreferences(existingPreferences);

    return normalizeNotificationPreferences({
        channels: {
            ...normalizedExisting.channels,
            ...(payload.channels || {})
        },
        categories: {
            ...normalizedExisting.categories,
            ...(payload.categories || {})
        },
        quietHours: {
            ...normalizedExisting.quietHours,
            ...(payload.quietHours || {})
        },
        devices: normalizedExisting.devices
    });
};

export const normalizeNotificationDevice = (payload = {}, now = new Date()) => ({
    token: trimText(payload.token),
    platform: payload.platform,
    appVersion: trimToNull(payload.appVersion),
    enabled: payload.enabled !== false,
    lastSeenAt: now
});

export const buildNotificationSummaryFromNotifications = (notifications = []) => notifications.reduce((summary, notification) => {
    const normalizedNotification = normalizeNotification(notification);

    summary.totalNotifications += 1;
    summary.byStatus[normalizedNotification.status] = (summary.byStatus[normalizedNotification.status] || 0) + 1;
    summary.byType[normalizedNotification.type] = (summary.byType[normalizedNotification.type] || 0) + 1;
    summary.byCategory[normalizedNotification.category] = (summary.byCategory[normalizedNotification.category] || 0) + 1;
    summary.latestNotificationAt = maxDate(summary.latestNotificationAt, normalizedNotification.createdAt);

    if (normalizedNotification.status === NOTIFICATION_ENGINE_STATUSES.READ) {
        summary.readCount += 1;
    }

    if (normalizedNotification.status === NOTIFICATION_ENGINE_STATUSES.UNREAD) {
        summary.unreadCount += 1;
    }

    if (normalizedNotification.status === NOTIFICATION_ENGINE_STATUSES.ARCHIVED) {
        summary.archivedCount += 1;
    }

    if (normalizedNotification.priority === NOTIFICATION_ENGINE_PRIORITIES.URGENT) {
        summary.urgentCount += 1;
    }

    return summary;
}, {
    totalNotifications: 0,
    unreadCount: 0,
    readCount: 0,
    archivedCount: 0,
    urgentCount: 0,
    byStatus: {},
    byType: {},
    byCategory: {},
    latestNotificationAt: null
});

export const normalizeNotificationSummary = (summary = {}) => {
    const totals = summary.totals?.[0] || summary;

    return {
        totalNotifications: totals.totalNotifications || 0,
        unreadCount: totals.unreadCount || 0,
        readCount: totals.readCount || 0,
        archivedCount: totals.archivedCount || 0,
        urgentCount: totals.urgentCount || 0,
        byStatus: rowsToCounts(summary.statuses),
        byType: rowsToCounts(summary.types),
        byCategory: rowsToCounts(summary.categories),
        latestNotificationAt: totals.latestNotificationAt || null
    };
};

export const buildNotificationGuidance = (notification = {}, now = new Date()) => ({
    isUnread: notification.status === NOTIFICATION_ENGINE_STATUSES.UNREAD,
    isExpired: notification.expiresAt ? new Date(notification.expiresAt) < normalizeDate(now) : false,
    canArchive: notification.status !== NOTIFICATION_ENGINE_STATUSES.ARCHIVED,
    nextAction: resolvePublicNextAction(notification)
});

export const buildOpsActionMetadata = (notification = {}, {
    action,
    note,
    actor,
    now = new Date(),
    limit = NOTIFICATION_ENGINE_ACTION_LOG_LIMIT
} = {}) => {
    const metadata = {
        ...(notification.metadata || {})
    };
    const actionLog = Array.isArray(metadata.opsActionLog) ? metadata.opsActionLog : [];

    return {
        ...metadata,
        lastOpsAction: action,
        lastOpsNote: note || null,
        lastOpsActionAt: now,
        lastOpsActionBy: getId(actor),
        opsActionLog: [
            ...actionLog.slice(-(limit - 1)),
            {
                action,
                note: note || null,
                actorId: getId(actor),
                actorRole: actor?.role || null,
                createdAt: now
            }
        ]
    };
};

export const resolveNotificationDeliveryStatus = (notification = {}) => {
    if (notification.status === NOTIFICATION_ENGINE_STATUSES.ARCHIVED) {
        return NOTIFICATION_ENGINE_DELIVERY_STATUSES.ARCHIVED;
    }

    if (notification.status === NOTIFICATION_ENGINE_STATUSES.READ) {
        return NOTIFICATION_ENGINE_DELIVERY_STATUSES.READ;
    }

    if (notification.delivery?.failedAt) {
        return NOTIFICATION_ENGINE_DELIVERY_STATUSES.FAILED;
    }

    if (notification.delivery?.sentAt) {
        return NOTIFICATION_ENGINE_DELIVERY_STATUSES.SENT;
    }

    if (notification.delivery?.scheduledAt) {
        return NOTIFICATION_ENGINE_DELIVERY_STATUSES.SCHEDULED;
    }

    return NOTIFICATION_ENGINE_DELIVERY_STATUSES.PENDING;
};

export const resolveNotificationTypeProfile = (type) => (
    NOTIFICATION_ENGINE_TYPE_CATALOG.find((item) => item.type === type)
    || NOTIFICATION_ENGINE_TYPE_CATALOG.find((item) => item.type === NOTIFICATION_ENGINE_TYPES.SYSTEM)
);

export const createNotificationCode = (type, date, authUserId) => {
    const compactTimestamp = normalizeDate(date).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const normalizedType = type.replace(/[^a-z0-9]+/gi, '-').toUpperCase();
    const normalizedUser = authUserId.replace(/[^a-z0-9]+/gi, '').slice(-6).toUpperCase() || 'USER';

    return `NTF-${normalizedType}-${normalizedUser}-${compactTimestamp}`;
};

const resolveSuppressionReason = ({ category, channel, priority, preferences, expiresAt, requestedAt }) => {
    if (expiresAt && new Date(expiresAt) < requestedAt) {
        return NOTIFICATION_ENGINE_SUPPRESSION_REASONS.EXPIRED;
    }

    if (!preferences.categories?.[category]) {
        return NOTIFICATION_ENGINE_SUPPRESSION_REASONS.CATEGORY_DISABLED;
    }

    if (!isChannelEnabled(channel, preferences)) {
        return NOTIFICATION_ENGINE_SUPPRESSION_REASONS.CHANNEL_DISABLED;
    }

    if (
        priority !== NOTIFICATION_ENGINE_PRIORITIES.URGENT
        && isWithinQuietHours(preferences.quietHours, requestedAt)
    ) {
        return NOTIFICATION_ENGINE_SUPPRESSION_REASONS.QUIET_HOURS;
    }

    return NOTIFICATION_ENGINE_SUPPRESSION_REASONS.NONE;
};

const isChannelEnabled = (channel, preferences = {}) => {
    if (channel === NOTIFICATION_ENGINE_CHANNELS.IN_APP) {
        return preferences.channels?.inApp !== false;
    }

    return preferences.channels?.[channel] !== false;
};

const isWithinQuietHours = (quietHours = {}, date = new Date()) => {
    if (!quietHours.enabled) {
        return false;
    }

    const currentMinutes = normalizeDate(date).getHours() * 60 + normalizeDate(date).getMinutes();
    const startMinutes = parseTimeToMinutes(quietHours.start);
    const endMinutes = parseTimeToMinutes(quietHours.end);

    if (startMinutes === endMinutes) {
        return false;
    }

    if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const buildDeliveryGuidance = ({ suppressed, suppressionReason, scheduledAt, priority }) => {
    if (suppressed) {
        if (suppressionReason === NOTIFICATION_ENGINE_SUPPRESSION_REASONS.QUIET_HOURS) {
            return 'Hold non-urgent notification until quiet hours end';
        }

        if (suppressionReason === NOTIFICATION_ENGINE_SUPPRESSION_REASONS.CHANNEL_DISABLED) {
            return 'Use an enabled channel or ask the user to update notification preferences';
        }

        if (suppressionReason === NOTIFICATION_ENGINE_SUPPRESSION_REASONS.CATEGORY_DISABLED) {
            return 'Do not send because this notification category is disabled';
        }

        return 'Do not send because the notification is expired';
    }

    if (scheduledAt) {
        return 'Notification is scheduled for later delivery';
    }

    if (priority === NOTIFICATION_ENGINE_PRIORITIES.URGENT) {
        return 'Send immediately through the selected channel';
    }

    return 'Notification can be delivered now';
};

const resolvePublicNextAction = (notification = {}) => {
    if (notification.status === NOTIFICATION_ENGINE_STATUSES.ARCHIVED) {
        return 'Notification is archived';
    }

    if (notification.status === NOTIFICATION_ENGINE_STATUSES.UNREAD) {
        return notification.actionUrl ? 'Open notification action or mark it as read' : 'Mark notification as read';
    }

    return notification.actionUrl ? 'Open notification action' : 'No action required';
};

const normalizeRecipient = (recipient = {}) => ({
    authUserId: trimText(recipient.authUserId),
    role: recipient.role
});

const parseTimeToMinutes = (time = '00:00') => {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
};

const rowsToCounts = (rows = []) => rows.reduce((result, row) => ({
    ...result,
    [row._id]: row.count
}), {});

const maxDate = (left, right) => {
    if (!left) {
        return right || null;
    }

    if (!right) {
        return left;
    }

    return new Date(left) > new Date(right) ? left : right;
};

const normalizeDate = (value) => value instanceof Date ? value : new Date(value);

const trimText = (value = '') => value.trim();

const trimToNull = (value) => {
    if (typeof value !== 'string') {
        return value || null;
    }

    return value.trim() || null;
};

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
