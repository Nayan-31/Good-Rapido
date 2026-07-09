import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_DEVICE_PLATFORMS,
    NOTIFICATION_ENTITY_TYPES,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPES
} from './notifications.constants.js';
import { createNotificationsRouter } from './notifications.route.js';

const BASE_PATH = '/api/v1/public/notifications';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createNotificationsRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createNotification = (overrides = {}) => ({
    id: 'notification-id',
    _id: 'notification-id',
    notificationCode: 'NTF-20260101081000-ABC123',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    type: NOTIFICATION_TYPES.RIDE_ALERT,
    category: NOTIFICATION_CATEGORIES.RIDES,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    status: NOTIFICATION_STATUSES.UNREAD,
    channel: NOTIFICATION_CHANNELS.PUSH,
    title: 'Driver is arriving',
    message: 'Rajesh is 2 minutes away from your pickup point',
    actionLabel: 'Track ride',
    actionUrl: '/rides/ride-id',
    relatedEntity: {
        type: NOTIFICATION_ENTITY_TYPES.RIDE,
        id: 'ride-id',
        code: 'GR-TEST-0001'
    },
    delivery: {
        scheduledAt: FIXED_NOW,
        sentAt: FIXED_NOW,
        readAt: null,
        archivedAt: null
    },
    expiresAt: new Date('2026-01-01T09:10:00.000Z'),
    metadata: {
        driverName: 'Rajesh Kumar'
    },
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createPreferences = (overrides = {}) => ({
    id: 'preferences-id',
    _id: 'preferences-id',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    channels: {
        inApp: true,
        push: true,
        sms: false,
        email: true
    },
    categories: {
        rides: true,
        fares: true,
        payments: true,
        promos: true,
        ratings: true,
        disputes: true,
        safety: true,
        system: true
    },
    quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
        timezone: 'Asia/Kolkata'
    },
    devices: [],
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDependencies = () => ({
    notificationsDao: {
        archive: jest.fn(),
        countUnreadForUser: jest.fn(),
        findByIdForUser: jest.fn(),
        findForUser: jest.fn(),
        findPreferencesForUser: jest.fn(),
        findSummaryForUser: jest.fn(),
        markAllRead: jest.fn(),
        markRead: jest.fn(),
        upsertPreferencesForUser: jest.fn()
    },
    tokenService: new TokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public notifications routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('options returns notification metadata', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.types).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: NOTIFICATION_TYPES.RIDE_ALERT,
                category: NOTIFICATION_CATEGORIES.RIDES
            })
        ]));
        expect(response.body.data.options.channels).toContain(NOTIFICATION_CHANNELS.PUSH);
        expect(response.body.data.options.devicePlatforms).toContain(NOTIFICATION_DEVICE_PLATFORMS.ANDROID);
    });

    test('list returns notifications with unread summary', async () => {
        const user = createUser();

        dependencies.notificationsDao.findForUser.mockResolvedValue([
            createNotification({
                authUserId: user.id,
                role: user.role
            }),
            createNotification({
                id: 'payment-notification-id',
                _id: 'payment-notification-id',
                notificationCode: 'NTF-PAYMENT',
                authUserId: user.id,
                role: user.role,
                type: NOTIFICATION_TYPES.PAYMENT_UPDATE,
                category: NOTIFICATION_CATEGORIES.PAYMENTS,
                status: NOTIFICATION_STATUSES.READ,
                priority: NOTIFICATION_PRIORITIES.HIGH,
                delivery: {
                    sentAt: FIXED_NOW,
                    readAt: FIXED_NOW
                }
            })
        ]);
        dependencies.notificationsDao.countUnreadForUser.mockResolvedValue(3);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}?status=${NOTIFICATION_STATUSES.UNREAD}&limit=5`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.notifications).toHaveLength(2);
        expect(response.body.data.summary.totalNotifications).toBe(2);
        expect(response.body.data.summary.unreadCount).toBe(3);
        expect(dependencies.notificationsDao.findForUser).toHaveBeenCalledWith(user.id, user.role, {
            status: NOTIFICATION_STATUSES.UNREAD,
            limit: 5
        });
        expect(dependencies.notificationsDao.countUnreadForUser).toHaveBeenCalledWith(user.id, user.role);
    });

    test('summary returns aggregate notification health', async () => {
        const user = createUser();

        dependencies.notificationsDao.findSummaryForUser.mockResolvedValue({
            totals: [{
                totalNotifications: 4,
                unreadCount: 2,
                readCount: 1,
                archivedCount: 1,
                urgentCount: 1,
                latestNotificationAt: FIXED_NOW
            }],
            statuses: [
                { _id: NOTIFICATION_STATUSES.UNREAD, count: 2 },
                { _id: NOTIFICATION_STATUSES.READ, count: 1 }
            ],
            types: [
                { _id: NOTIFICATION_TYPES.RIDE_ALERT, count: 2 },
                { _id: NOTIFICATION_TYPES.SAFETY_ALERT, count: 1 }
            ],
            categories: [
                { _id: NOTIFICATION_CATEGORIES.RIDES, count: 2 },
                { _id: NOTIFICATION_CATEGORIES.SAFETY, count: 1 }
            ]
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/summary`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.summary.totalNotifications).toBe(4);
        expect(response.body.data.summary.byStatus.unread).toBe(2);
        expect(response.body.data.summary.byType.safety_alert).toBe(1);
    });

    test('notification details can be fetched by id', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);

        dependencies.notificationsDao.findByIdForUser.mockResolvedValue(createNotification({
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/notification-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.notification.notificationCode).toBe('NTF-20260101081000-ABC123');
        expect(response.body.data.notification.relatedEntity.type).toBe(NOTIFICATION_ENTITY_TYPES.RIDE);
        expect(response.body.data.guidance.isUnread).toBe(true);
        expect(dependencies.notificationsDao.findByIdForUser).toHaveBeenCalledWith('notification-id', user.id, user.role);
    });

    test('notification can be marked as read', async () => {
        const user = createUser();
        const notification = createNotification({
            authUserId: user.id,
            role: user.role
        });

        dependencies.notificationsDao.findByIdForUser.mockResolvedValue(notification);
        dependencies.notificationsDao.markRead.mockResolvedValue(createNotification({
            ...notification,
            status: NOTIFICATION_STATUSES.READ,
            delivery: {
                ...notification.delivery,
                readAt: FIXED_NOW
            }
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/notification-id/read`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.notification.status).toBe(NOTIFICATION_STATUSES.READ);
        expect(response.body.data.notification.delivery.readAt).toBe(FIXED_NOW.toISOString());
        expect(dependencies.notificationsDao.markRead).toHaveBeenCalledWith('notification-id', user.id, user.role, FIXED_NOW);
    });

    test('mark all read updates unread notifications with optional filters', async () => {
        const user = createUser();

        dependencies.notificationsDao.markAllRead.mockResolvedValue({
            matchedCount: 4,
            modifiedCount: 3
        });

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/read-all`,
            headers: authHeaderFor(dependencies, user),
            body: {
                category: NOTIFICATION_CATEGORIES.RIDES
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.matchedCount).toBe(4);
        expect(response.body.data.modifiedCount).toBe(3);
        expect(dependencies.notificationsDao.markAllRead).toHaveBeenCalledWith(user.id, user.role, {
            category: NOTIFICATION_CATEGORIES.RIDES,
            readAt: FIXED_NOW
        });
    });

    test('notification can be archived', async () => {
        const user = createUser();
        const notification = createNotification({
            authUserId: user.id,
            role: user.role,
            status: NOTIFICATION_STATUSES.READ
        });

        dependencies.notificationsDao.findByIdForUser.mockResolvedValue(notification);
        dependencies.notificationsDao.archive.mockResolvedValue(createNotification({
            ...notification,
            status: NOTIFICATION_STATUSES.ARCHIVED,
            delivery: {
                ...notification.delivery,
                archivedAt: FIXED_NOW
            }
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/notification-id/archive`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.notification.status).toBe(NOTIFICATION_STATUSES.ARCHIVED);
        expect(response.body.data.guidance.canArchive).toBe(false);
        expect(dependencies.notificationsDao.archive).toHaveBeenCalledWith('notification-id', user.id, user.role, FIXED_NOW);
    });

    test('archiving an archived notification is rejected', async () => {
        const user = createUser();

        dependencies.notificationsDao.findByIdForUser.mockResolvedValue(createNotification({
            authUserId: user.id,
            role: user.role,
            status: NOTIFICATION_STATUSES.ARCHIVED
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/notification-id/archive`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Notification is already archived');
        expect(dependencies.notificationsDao.archive).not.toHaveBeenCalled();
    });

    test('preferences returns defaults when no saved preferences exist', async () => {
        const user = createUser();

        dependencies.notificationsDao.findPreferencesForUser.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/preferences`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.preferences.channels.push).toBe(true);
        expect(response.body.data.preferences.channels.sms).toBe(false);
        expect(response.body.data.preferences.categories.disputes).toBe(true);
    });

    test('preferences can be updated', async () => {
        const user = createUser();
        const existingPreferences = createPreferences({
            authUserId: user.id,
            role: user.role
        });

        dependencies.notificationsDao.findPreferencesForUser.mockResolvedValue(existingPreferences);
        dependencies.notificationsDao.upsertPreferencesForUser.mockImplementation(async (_userId, _role, payload) => createPreferences({
            ...existingPreferences,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/preferences`,
            headers: authHeaderFor(dependencies, user),
            body: {
                channels: {
                    sms: true
                },
                categories: {
                    promos: false
                },
                quietHours: {
                    enabled: true,
                    start: '23:00',
                    end: '06:30'
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.preferences.channels.sms).toBe(true);
        expect(response.body.data.preferences.categories.promos).toBe(false);
        expect(response.body.data.preferences.quietHours.enabled).toBe(true);
        expect(dependencies.notificationsDao.upsertPreferencesForUser).toHaveBeenCalledWith(user.id, user.role, expect.objectContaining({
            channels: expect.objectContaining({
                sms: true
            }),
            categories: expect.objectContaining({
                promos: false
            })
        }));
    });

    test('device registration stores masked device response and preferences', async () => {
        const user = createUser();
        const existingPreferences = createPreferences({
            authUserId: user.id,
            role: user.role,
            devices: [{
                token: 'old-device-token',
                platform: NOTIFICATION_DEVICE_PLATFORMS.WEB,
                appVersion: '1.0.0',
                enabled: true,
                lastSeenAt: new Date('2025-12-31T08:10:00.000Z')
            }]
        });

        dependencies.notificationsDao.findPreferencesForUser.mockResolvedValue(existingPreferences);
        dependencies.notificationsDao.upsertPreferencesForUser.mockImplementation(async (_userId, _role, payload) => createPreferences({
            ...existingPreferences,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/devices`,
            headers: authHeaderFor(dependencies, user),
            body: {
                token: 'android-device-token-123456',
                platform: NOTIFICATION_DEVICE_PLATFORMS.ANDROID,
                appVersion: '2.1.0'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.device.token).toBe('androi...3456');
        expect(response.body.data.preferences.devices).toHaveLength(2);
        expect(dependencies.notificationsDao.upsertPreferencesForUser).toHaveBeenCalledWith(user.id, user.role, expect.objectContaining({
            devices: expect.arrayContaining([
                expect.objectContaining({
                    token: 'android-device-token-123456',
                    platform: NOTIFICATION_DEVICE_PLATFORMS.ANDROID,
                    lastSeenAt: FIXED_NOW
                })
            ])
        }));
    });

    test('notifications routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('notifications routes return validation errors for invalid preferences', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/preferences`,
            headers: authHeaderFor(dependencies, user),
            body: {
                quietHours: {
                    enabled: true,
                    start: '25:00'
                }
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });
});
