import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    NOTIFICATION_CHANNELS,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPE_CATALOG,
    NOTIFICATION_TYPES
} from '../../public/notifications/notifications.constants.js';
import {
    PRIVATE_NOTIFICATION_ACTION_LOG_LIMIT,
    PRIVATE_NOTIFICATION_ACTIONS,
    PRIVATE_NOTIFICATION_DASHBOARD_LIMIT,
    PRIVATE_NOTIFICATION_DEFAULT_LIMIT
} from './notifications.constants.js';
import {
    toPrivateNotificationCreateResult,
    toPrivateNotificationDashboard,
    toPrivateNotificationDetail,
    toPrivateNotificationList,
    toPrivateNotificationOptions
} from './dto/notifications.dto.js';

export default class PrivateNotificationsService {
    constructor({ notificationsDao, now = () => new Date() }) {
        this.notificationsDao = notificationsDao;
        this.now = now;
    }

    options(authContext) {
        this.assertNotificationOpsContext(authContext);

        return buildSuccessResponse({
            message: 'Private notification options fetched successfully',
            data: {
                options: toPrivateNotificationOptions()
            }
        });
    }

    async dashboard(authContext) {
        await this.getNotificationOpsUserContext(authContext);
        const notifications = toPlainArray(await this.notificationsDao.findDashboardNotifications({
            limit: PRIVATE_NOTIFICATION_DASHBOARD_LIMIT
        })).map(normalizeNotification);

        return buildSuccessResponse({
            message: 'Private notification dashboard fetched successfully',
            data: {
                dashboard: toPrivateNotificationDashboard(notifications)
            }
        });
    }

    async list(authContext, query = {}) {
        await this.getNotificationOpsUserContext(authContext);
        const notifications = toPlainArray(await this.notificationsDao.findNotifications({
            ...query,
            limit: query.limit || PRIVATE_NOTIFICATION_DEFAULT_LIMIT
        })).map(normalizeNotification);

        return buildSuccessResponse({
            message: 'Private notifications fetched successfully',
            data: {
                notifications: toPrivateNotificationList(notifications)
            }
        });
    }

    async detail(authContext, notificationId) {
        await this.getNotificationOpsUserContext(authContext);
        const notification = await this.findNotification(notificationId);

        return buildSuccessResponse({
            message: 'Private notification fetched successfully',
            data: {
                notification: toPrivateNotificationDetail(notification)
            }
        });
    }

    async create(authContext, payload) {
        const actor = await this.getNotificationOpsUserContext(authContext);
        const recipients = normalizeRecipients(payload);
        const now = this.now();
        const notificationsPayload = recipients.map((recipient) => normalizeCreatePayload(payload, {
            actor,
            now,
            recipient
        }));
        const notifications = toPlainArray(await this.notificationsDao.createNotifications(notificationsPayload))
            .map(normalizeNotification);

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Private notification created successfully',
            data: {
                result: toPrivateNotificationCreateResult(notifications)
            }
        });
    }

    async send(authContext, notificationId) {
        const actor = await this.getNotificationOpsUserContext(authContext);
        const notification = await this.findNotification(notificationId);

        assertNotArchived(notification, 'Archived notifications cannot be sent');

        const now = this.now();
        const updatedNotification = await this.updateNotification(notificationId, {
            delivery: {
                ...notification.delivery,
                sentAt: now,
                failedAt: null,
                failureReason: null
            },
            metadata: buildMetadata(notification, {
                action: PRIVATE_NOTIFICATION_ACTIONS.SEND,
                note: 'Notification sent',
                actor,
                now
            })
        });

        return buildSuccessResponse({
            message: 'Private notification sent successfully',
            data: {
                notification: toPrivateNotificationDetail(updatedNotification)
            }
        });
    }

    async fail(authContext, notificationId, payload) {
        const actor = await this.getNotificationOpsUserContext(authContext);
        const notification = await this.findNotification(notificationId);

        assertNotArchived(notification, 'Archived notifications cannot be marked failed');

        const now = this.now();
        const note = payload.note || payload.failureReason;
        const updatedNotification = await this.updateNotification(notificationId, {
            delivery: {
                ...notification.delivery,
                failedAt: now,
                failureReason: payload.failureReason,
                sentAt: notification.delivery?.sentAt || null
            },
            metadata: buildMetadata(notification, {
                action: PRIVATE_NOTIFICATION_ACTIONS.FAIL,
                note,
                actor,
                now
            })
        });

        return buildSuccessResponse({
            message: 'Private notification marked failed successfully',
            data: {
                notification: toPrivateNotificationDetail(updatedNotification)
            }
        });
    }

    async retry(authContext, notificationId) {
        const actor = await this.getNotificationOpsUserContext(authContext);
        const notification = await this.findNotification(notificationId);

        assertNotArchived(notification, 'Archived notifications cannot be retried');

        if (!notification.delivery?.failedAt) {
            throw AppError.badRequest('Only failed notifications can be retried');
        }

        const now = this.now();
        const updatedNotification = await this.updateNotification(notificationId, {
            delivery: {
                ...notification.delivery,
                sentAt: now,
                failedAt: null,
                failureReason: null
            },
            metadata: buildMetadata(notification, {
                action: PRIVATE_NOTIFICATION_ACTIONS.RETRY,
                note: 'Notification delivery retried',
                actor,
                now
            })
        });

        return buildSuccessResponse({
            message: 'Private notification retried successfully',
            data: {
                notification: toPrivateNotificationDetail(updatedNotification)
            }
        });
    }

    async cancel(authContext, notificationId, payload = {}) {
        const actor = await this.getNotificationOpsUserContext(authContext);
        const notification = await this.findNotification(notificationId);

        if (notification.status === NOTIFICATION_STATUSES.ARCHIVED) {
            throw AppError.badRequest('Notification is already archived');
        }

        const now = this.now();
        const updatedNotification = await this.updateNotification(notificationId, {
            status: NOTIFICATION_STATUSES.ARCHIVED,
            delivery: {
                ...notification.delivery,
                archivedAt: now
            },
            metadata: buildMetadata(notification, {
                action: PRIVATE_NOTIFICATION_ACTIONS.CANCEL,
                note: payload.note || 'Notification cancelled by ops',
                actor,
                now
            })
        });

        return buildSuccessResponse({
            message: 'Private notification cancelled successfully',
            data: {
                notification: toPrivateNotificationDetail(updatedNotification)
            }
        });
    }

    async findNotification(notificationId) {
        const notification = normalizeNotification(toPlainObject(await this.notificationsDao.findById(notificationId)));

        if (!notification) {
            throw AppError.notFound('Notification not found');
        }

        return notification;
    }

    async updateNotification(notificationId, payload) {
        const notification = normalizeNotification(toPlainObject(await this.notificationsDao.updateNotification(notificationId, payload)));

        if (!notification) {
            throw AppError.notFound('Notification not found');
        }

        return notification;
    }

    async getNotificationOpsUserContext(authContext) {
        this.assertNotificationOpsContext(authContext);
        const privateUser = toPlainObject(await this.notificationsDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertNotificationOpsContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Notification private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.OPS_NOTIFICATIONS_WRITE)) {
            throw AppError.forbidden('Notification ops permission is required');
        }

        return authContext;
    }
}

const normalizeCreatePayload = (payload = {}, { actor, now, recipient }) => {
    const typeProfile = resolveTypeProfile(payload.type);
    const scheduledAt = payload.scheduledAt || null;
    const metadata = buildMetadata({ metadata: payload.metadata || {} }, {
        action: PRIVATE_NOTIFICATION_ACTIONS.CREATE,
        note: scheduledAt ? 'Notification scheduled by ops' : 'Notification created by ops',
        actor,
        now
    });

    return {
        notificationCode: createNotificationCode(payload.type, now, recipient.authUserId),
        authUserId: recipient.authUserId,
        role: recipient.role,
        type: payload.type,
        category: payload.category || typeProfile.category,
        priority: payload.priority || typeProfile.defaultPriority || NOTIFICATION_PRIORITIES.MEDIUM,
        status: NOTIFICATION_STATUSES.UNREAD,
        channel: payload.channel || typeProfile.defaultChannel || NOTIFICATION_CHANNELS.IN_APP,
        title: payload.title.trim(),
        message: payload.message.trim(),
        actionLabel: payload.actionLabel?.trim() || null,
        actionUrl: payload.actionUrl?.trim() || null,
        relatedEntity: payload.relatedEntity || null,
        delivery: {
            scheduledAt,
            sentAt: scheduledAt ? null : now
        },
        expiresAt: payload.expiresAt || null,
        metadata
    };
};

const normalizeNotification = (notification) => {
    if (!notification) {
        return null;
    }

    return {
        ...notification,
        delivery: notification.delivery || {},
        metadata: notification.metadata || {}
    };
};

const normalizeRecipients = (payload = {}) => {
    if (payload.recipient) {
        return [payload.recipient];
    }

    return payload.recipients || [];
};

const buildMetadata = (notification = {}, { action, note, actor, now }) => {
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
            ...actionLog.slice(-(PRIVATE_NOTIFICATION_ACTION_LOG_LIMIT - 1)),
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

const resolveTypeProfile = (type) => NOTIFICATION_TYPE_CATALOG.find((item) => item.type === type)
    || NOTIFICATION_TYPE_CATALOG.find((item) => item.type === NOTIFICATION_TYPES.SYSTEM);

const assertNotArchived = (notification = {}, message) => {
    if (notification.status === NOTIFICATION_STATUSES.ARCHIVED) {
        throw AppError.badRequest(message);
    }
};

const createNotificationCode = (type, date, authUserId) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const normalizedType = type.replace(/[^a-z0-9]+/gi, '-').toUpperCase();
    const normalizedUser = authUserId.replace(/[^a-z0-9]+/gi, '').slice(-6).toUpperCase() || 'USER';

    return `NTF-${normalizedType}-${normalizedUser}-${compactTimestamp}`;
};

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
