import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    NOTIFICATION_STATUSES
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
import {
    buildNotificationPayload,
    buildOpsActionMetadata,
    normalizeNotification as normalizeCoreNotification,
    normalizeNotificationRecipients
} from '../../core/notification-engine/notification-engine.engine.js';

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
    const notificationPayload = buildNotificationPayload(payload, {
        actor,
        now,
        recipient
    });
    const { deliveryPlan: _deliveryPlan, ...persistedPayload } = notificationPayload;

    return persistedPayload;
};

const normalizeNotification = (notification) => {
    return normalizeCoreNotification(notification);
};

const normalizeRecipients = (payload = {}) => normalizeNotificationRecipients(payload);

const buildMetadata = (notification = {}, { action, note, actor, now }) => {
    return buildOpsActionMetadata(notification, {
        action,
        note,
        actor,
        now,
        limit: PRIVATE_NOTIFICATION_ACTION_LOG_LIMIT
    });
};

const assertNotArchived = (notification = {}, message) => {
    if (notification.status === NOTIFICATION_STATUSES.ARCHIVED) {
        throw AppError.badRequest(message);
    }
};

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
