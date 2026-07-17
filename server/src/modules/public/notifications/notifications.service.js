import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    NOTIFICATION_STATUSES
} from './notifications.constants.js';
import {
    toPublicDevice,
    toPublicNotification,
    toPublicNotificationGuidance,
    toPublicNotificationHistoryItem,
    toPublicNotificationOptions,
    toPublicNotificationPreferences,
    toPublicNotificationSummary
} from './dto/notifications.dto.js';
import {
    buildNotificationSummaryFromNotifications,
    mergeNotificationPreferences,
    normalizeNotificationDevice,
    normalizeNotificationPreferences,
    normalizeNotificationSummary
} from '../../core/notification-engine/notification-engine.engine.js';

export default class NotificationsService {
    constructor({ notificationsDao, now = () => new Date() }) {
        this.notificationsDao = notificationsDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthContext(authContext);

        return buildSuccessResponse({
            message: 'Notification options fetched successfully',
            data: {
                options: toPublicNotificationOptions()
            }
        });
    }

    async summary(authContext) {
        const { userId, role } = this.assertAuthContext(authContext);
        const summary = await this.notificationsDao.findSummaryForUser(userId, role);

        return buildSuccessResponse({
            message: 'Notification summary fetched successfully',
            data: {
                summary: toPublicNotificationSummary(normalizeSummary(summary))
            }
        });
    }

    async list(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const notifications = await this.notificationsDao.findForUser(userId, role, query);
        const unreadCount = await this.notificationsDao.countUnreadForUser(userId, role);
        const plainNotifications = notifications.map(toPlainObject);

        return buildSuccessResponse({
            message: 'Notifications fetched successfully',
            data: {
                notifications: plainNotifications.map(toPublicNotificationHistoryItem),
                summary: toPublicNotificationSummary({
                    ...buildSummaryFromNotifications(plainNotifications),
                    unreadCount
                })
            }
        });
    }

    async getNotification(authContext, notificationId) {
        const notification = await this.findNotification(authContext, notificationId);

        return buildSuccessResponse({
            message: 'Notification fetched successfully',
            data: {
                notification: toPublicNotification(notification),
                guidance: toPublicNotificationGuidance(notification)
            }
        });
    }

    async markRead(authContext, notificationId) {
        const { userId, role } = this.assertAuthContext(authContext);
        await this.findNotification(authContext, notificationId);
        const notification = await this.notificationsDao.markRead(notificationId, userId, role, this.now());

        if (!notification) {
            throw AppError.notFound('Notification not found');
        }

        const notificationObject = toPlainObject(notification);

        return buildSuccessResponse({
            message: 'Notification marked as read',
            data: {
                notification: toPublicNotification(notificationObject),
                guidance: toPublicNotificationGuidance(notificationObject)
            }
        });
    }

    async markAllRead(authContext, payload = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const result = await this.notificationsDao.markAllRead(userId, role, {
            ...payload,
            readAt: this.now()
        });

        return buildSuccessResponse({
            message: 'Notifications marked as read',
            data: {
                matchedCount: numberOrZero(result.matchedCount),
                modifiedCount: numberOrZero(result.modifiedCount)
            }
        });
    }

    async archive(authContext, notificationId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const existingNotification = await this.findNotification(authContext, notificationId);

        if (existingNotification.status === NOTIFICATION_STATUSES.ARCHIVED) {
            throw AppError.badRequest('Notification is already archived');
        }

        const notification = await this.notificationsDao.archive(notificationId, userId, role, this.now());

        if (!notification) {
            throw AppError.notFound('Notification not found');
        }

        const notificationObject = toPlainObject(notification);

        return buildSuccessResponse({
            message: 'Notification archived successfully',
            data: {
                notification: toPublicNotification(notificationObject),
                guidance: toPublicNotificationGuidance(notificationObject)
            }
        });
    }

    async getPreferences(authContext) {
        const { userId, role } = this.assertAuthContext(authContext);
        const preferences = await this.notificationsDao.findPreferencesForUser(userId, role);

        return buildSuccessResponse({
            message: 'Notification preferences fetched successfully',
            data: {
                preferences: toPublicNotificationPreferences(toPreferencesObject(preferences))
            }
        });
    }

    async updatePreferences(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const existingPreferences = toPreferencesObject(
            await this.notificationsDao.findPreferencesForUser(userId, role)
        );
        const preferencesPayload = mergePreferences(existingPreferences, payload);
        const preferences = await this.notificationsDao.upsertPreferencesForUser(userId, role, preferencesPayload);

        return buildSuccessResponse({
            message: 'Notification preferences updated successfully',
            data: {
                preferences: toPublicNotificationPreferences(toPlainObject(preferences))
            }
        });
    }

    async registerDevice(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const existingPreferences = toPreferencesObject(
            await this.notificationsDao.findPreferencesForUser(userId, role)
        );
        const device = normalizeNotificationDevice(payload, this.now());
        const preferencesPayload = {
            ...existingPreferences,
            devices: [
                device,
                ...existingPreferences.devices.filter((item) => item.token !== device.token)
            ].slice(0, 5)
        };
        const preferences = await this.notificationsDao.upsertPreferencesForUser(userId, role, preferencesPayload);
        const preferencesObject = toPlainObject(preferences);

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Notification device registered successfully',
            data: {
                device: toPublicDevice(device),
                preferences: toPublicNotificationPreferences(preferencesObject)
            }
        });
    }

    async findNotification(authContext, notificationId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const notification = await this.notificationsDao.findByIdForUser(notificationId, userId, role);

        if (!notification) {
            throw AppError.notFound('Notification not found');
        }

        return toPlainObject(notification);
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPreferencesObject = (preferences) => normalizeNotificationPreferences(toPlainObject(preferences) || {});

const mergePreferences = (existingPreferences, payload = {}) => mergeNotificationPreferences(existingPreferences, payload);

const normalizeSummary = (summary = {}) => normalizeNotificationSummary(summary);

const buildSummaryFromNotifications = (notifications = []) => buildNotificationSummaryFromNotifications(notifications);

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
