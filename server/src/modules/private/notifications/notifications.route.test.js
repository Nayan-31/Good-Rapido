import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import PrivateTokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_ENTITY_TYPES,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPES
} from '../../public/notifications/notifications.constants.js';
import {
    PRIVATE_NOTIFICATION_ACTIONS,
    PRIVATE_NOTIFICATION_DELIVERY_STATUSES
} from './notifications.constants.js';
import { createPrivateNotificationsRouter } from './notifications.route.js';

const BASE_PATH = '/api/v1/private/notifications';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createPrivateNotificationsRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.ADMIN, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: role === PRIVATE_AUTH_ROLES.DRIVER ? '+919111111111' : '+919222222222',
    employeeCode: `${role.toUpperCase()}-001`,
    department: role === PRIVATE_AUTH_ROLES.DRIVER ? 'driver_network' : 'operations',
    serviceZone: 'kolkata',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createNotification = (overrides = {}) => ({
    id: 'notification-id',
    _id: 'notification-id',
    notificationCode: 'NTF-SYSTEM-RIDER1-20260101081000',
    authUserId: 'rider-001',
    role: AUTH_ROLES.RIDER,
    type: NOTIFICATION_TYPES.SYSTEM,
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    status: NOTIFICATION_STATUSES.UNREAD,
    channel: NOTIFICATION_CHANNELS.IN_APP,
    title: 'System notice',
    message: 'Your account settings were updated.',
    actionLabel: 'View',
    actionUrl: '/notifications/notification-id',
    relatedEntity: {
        type: NOTIFICATION_ENTITY_TYPES.SYSTEM,
        id: 'system',
        code: 'SYS-001'
    },
    delivery: {
        scheduledAt: null,
        sentAt: FIXED_NOW,
        readAt: null,
        archivedAt: null,
        failedAt: null,
        failureReason: null
    },
    expiresAt: null,
    metadata: {
        source: 'ops'
    },
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createNotificationPayload = (overrides = {}) => ({
    recipient: {
        authUserId: 'rider-001',
        role: AUTH_ROLES.RIDER
    },
    type: NOTIFICATION_TYPES.SAFETY_ALERT,
    title: 'Safety update',
    message: 'Please review safety guidance for your ride.',
    actionLabel: 'Open',
    actionUrl: '/safety',
    relatedEntity: {
        type: NOTIFICATION_ENTITY_TYPES.RIDE,
        id: 'ride-001',
        code: 'BOOK-001'
    },
    metadata: {
        campaign: 'safety'
    },
    ...overrides
});

const createDependencies = () => ({
    notificationsDao: {
        findPrivateUserById: jest.fn(),
        findDashboardNotifications: jest.fn(),
        findNotifications: jest.fn(),
        findNotificationsForUser: jest.fn(),
        findById: jest.fn(),
        findByIdForUser: jest.fn(),
        createNotifications: jest.fn(),
        updateNotification: jest.fn(),
        markReadForUser: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private notification routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser();
    });

    test('options returns private notification metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.deliveryStatuses).toContain(PRIVATE_NOTIFICATION_DELIVERY_STATUSES.FAILED);
        expect(response.body.data.options.types).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: NOTIFICATION_TYPES.SAFETY_ALERT
            })
        ]));
        expect(response.body.data.options.actions).toContain(PRIVATE_NOTIFICATION_ACTIONS.RETRY);
    });

    test('dashboard returns notification delivery summaries', async () => {
        dependencies.notificationsDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.notificationsDao.findDashboardNotifications.mockResolvedValue([
            createNotification({
                priority: NOTIFICATION_PRIORITIES.URGENT
            }),
            createNotification({
                id: 'failed-notification-id',
                _id: 'failed-notification-id',
                notificationCode: 'NTF-FAILED',
                delivery: {
                    failedAt: FIXED_NOW,
                    failureReason: 'Push provider timeout'
                }
            }),
            createNotification({
                id: 'scheduled-notification-id',
                _id: 'scheduled-notification-id',
                notificationCode: 'NTF-SCHEDULED',
                delivery: {
                    scheduledAt: new Date('2026-01-02T08:10:00.000Z')
                }
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dashboard.summary.totalNotifications).toBe(3);
        expect(response.body.data.dashboard.summary.urgentCount).toBe(1);
        expect(response.body.data.dashboard.summary.failedCount).toBe(1);
        expect(response.body.data.dashboard.summary.scheduledCount).toBe(1);
        expect(response.body.data.dashboard.failedNotifications).toHaveLength(1);
    });

    test('list passes notification filters to the dao', async () => {
        dependencies.notificationsDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.notificationsDao.findNotifications.mockResolvedValue([
            createNotification()
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/notifications?status=${NOTIFICATION_STATUSES.UNREAD}&deliveryStatus=${PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SENT}&type=${NOTIFICATION_TYPES.SYSTEM}&category=${NOTIFICATION_CATEGORIES.SYSTEM}&priority=${NOTIFICATION_PRIORITIES.MEDIUM}&channel=${NOTIFICATION_CHANNELS.IN_APP}&role=${AUTH_ROLES.RIDER}&q=system&limit=5`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.notifications.notifications).toHaveLength(1);
        expect(dependencies.notificationsDao.findNotifications).toHaveBeenCalledWith({
            status: NOTIFICATION_STATUSES.UNREAD,
            deliveryStatus: PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SENT,
            type: NOTIFICATION_TYPES.SYSTEM,
            category: NOTIFICATION_CATEGORIES.SYSTEM,
            priority: NOTIFICATION_PRIORITIES.MEDIUM,
            channel: NOTIFICATION_CHANNELS.IN_APP,
            role: AUTH_ROLES.RIDER,
            q: 'system',
            limit: 5
        });
    });

    test('detail returns notification content and metadata', async () => {
        dependencies.notificationsDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.notificationsDao.findById.mockResolvedValue(createNotification());

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/notifications/notification-id`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.notification.notificationCode).toBe('NTF-SYSTEM-RIDER1-20260101081000');
        expect(response.body.data.notification.message).toBe('Your account settings were updated.');
        expect(response.body.data.notification.metadata.source).toBe('ops');
    });

    test('admin can create an immediate notification for one user', async () => {
        dependencies.notificationsDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.notificationsDao.createNotifications.mockImplementation(async (payloads) => payloads.map((payload, index) => ({
            ...createNotification({
                id: `notification-${index}`,
                _id: `notification-${index}`
            }),
            ...payload,
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        })));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/notifications`,
            headers: authHeaderFor(dependencies, adminUser),
            body: createNotificationPayload()
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.result.createdCount).toBe(1);
        expect(response.body.data.result.notifications[0].type).toBe(NOTIFICATION_TYPES.SAFETY_ALERT);
        expect(response.body.data.result.notifications[0].category).toBe(NOTIFICATION_CATEGORIES.SAFETY);
        expect(response.body.data.result.notifications[0].priority).toBe(NOTIFICATION_PRIORITIES.URGENT);
        expect(response.body.data.result.notifications[0].delivery.sentAt).toBe(FIXED_NOW.toISOString());
        expect(dependencies.notificationsDao.createNotifications).toHaveBeenCalledWith([
            expect.objectContaining({
                notificationCode: expect.stringMatching(/^NTF-SAFETY-ALERT-/),
                authUserId: 'rider-001',
                metadata: expect.objectContaining({
                    lastOpsAction: PRIVATE_NOTIFICATION_ACTIONS.CREATE
                })
            })
        ]);
    });

    test('admin can schedule a multi-user notification', async () => {
        dependencies.notificationsDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.notificationsDao.createNotifications.mockImplementation(async (payloads) => payloads.map((payload, index) => ({
            ...createNotification({
                id: `notification-${index}`,
                _id: `notification-${index}`
            }),
            ...payload,
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        })));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/notifications`,
            headers: authHeaderFor(dependencies, adminUser),
            body: createNotificationPayload({
                recipient: undefined,
                recipients: [
                    {
                        authUserId: 'rider-001',
                        role: AUTH_ROLES.RIDER
                    },
                    {
                        authUserId: 'passenger-001',
                        role: AUTH_ROLES.PASSENGER
                    }
                ],
                scheduledAt: '2026-01-02T08:10:00.000Z'
            })
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.result.createdCount).toBe(2);
        expect(response.body.data.result.notifications[0].deliveryStatus).toBe(PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SCHEDULED);
        expect(dependencies.notificationsDao.createNotifications).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                authUserId: 'rider-001',
                delivery: expect.objectContaining({
                    scheduledAt: new Date('2026-01-02T08:10:00.000Z'),
                    sentAt: null
                })
            }),
            expect.objectContaining({
                authUserId: 'passenger-001'
            })
        ]));
    });

    test('admin can send, fail, retry, and cancel notifications', async () => {
        const notification = createNotification({
            delivery: {}
        });

        dependencies.notificationsDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.notificationsDao.findById.mockResolvedValue(notification);
        dependencies.notificationsDao.updateNotification.mockImplementation(async (_notificationId, payload) => ({
            ...notification,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const sendResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/notifications/notification-id/send`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(sendResponse.statusCode).toBe(200);
        expect(sendResponse.body.data.notification.deliveryStatus).toBe(PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SENT);

        const failResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/notifications/notification-id/fail`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                failureReason: 'Push provider timeout'
            }
        });

        expect(failResponse.statusCode).toBe(200);
        expect(failResponse.body.data.notification.deliveryStatus).toBe(PRIVATE_NOTIFICATION_DELIVERY_STATUSES.FAILED);
        expect(failResponse.body.data.notification.delivery.failureReason).toBe('Push provider timeout');

        dependencies.notificationsDao.findById.mockResolvedValue(createNotification({
            delivery: {
                failedAt: FIXED_NOW,
                failureReason: 'Push provider timeout'
            }
        }));

        const retryResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/notifications/notification-id/retry`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(retryResponse.statusCode).toBe(200);
        expect(retryResponse.body.data.notification.deliveryStatus).toBe(PRIVATE_NOTIFICATION_DELIVERY_STATUSES.SENT);

        const cancelResponse = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/notifications/notification-id/cancel`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                note: 'Campaign paused'
            }
        });

        expect(cancelResponse.statusCode).toBe(200);
        expect(cancelResponse.body.data.notification.status).toBe(NOTIFICATION_STATUSES.ARCHIVED);
        expect(cancelResponse.body.data.notification.deliveryStatus).toBe(PRIVATE_NOTIFICATION_DELIVERY_STATUSES.ARCHIVED);
    });

    test('retry rejects notifications that have not failed', async () => {
        dependencies.notificationsDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.notificationsDao.findById.mockResolvedValue(createNotification());

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/notifications/notification-id/retry`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only failed notifications can be retried');
        expect(dependencies.notificationsDao.updateNotification).not.toHaveBeenCalled();
    });

    test('driver users can read and mark their scoped notification inbox', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);
        const driverNotification = createNotification({
            authUserId: 'driver-id',
            role: PRIVATE_AUTH_ROLES.DRIVER,
            title: 'Driver request update'
        });

        dependencies.notificationsDao.findPrivateUserById.mockResolvedValue(driverUser);
        dependencies.notificationsDao.findNotificationsForUser.mockResolvedValue([driverNotification]);
        dependencies.notificationsDao.findByIdForUser.mockResolvedValue(driverNotification);
        dependencies.notificationsDao.markReadForUser.mockResolvedValue({
            ...driverNotification,
            status: NOTIFICATION_STATUSES.READ,
            delivery: {
                ...driverNotification.delivery,
                readAt: FIXED_NOW
            }
        });

        const optionsResponse = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(optionsResponse.statusCode).toBe(200);

        const listResponse = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/notifications`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(listResponse.statusCode).toBe(200);
        expect(listResponse.body.data.notifications.notifications[0].role).toBe(PRIVATE_AUTH_ROLES.DRIVER);
        expect(dependencies.notificationsDao.findNotificationsForUser).toHaveBeenCalledWith('driver-id', PRIVATE_AUTH_ROLES.DRIVER, {
            limit: 25
        });

        const detailResponse = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/notifications/notification-id`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(detailResponse.statusCode).toBe(200);
        expect(dependencies.notificationsDao.findByIdForUser).toHaveBeenCalledWith(
            'notification-id',
            'driver-id',
            PRIVATE_AUTH_ROLES.DRIVER
        );

        const readResponse = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/notifications/notification-id/read`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(readResponse.statusCode).toBe(200);
        expect(readResponse.body.data.notification.status).toBe(NOTIFICATION_STATUSES.READ);
        expect(dependencies.notificationsDao.markReadForUser).toHaveBeenCalledWith(
            'notification-id',
            'driver-id',
            PRIVATE_AUTH_ROLES.DRIVER,
            FIXED_NOW
        );
    });

    test('driver users cannot access ops notification dashboard', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
    });

    test('ops users without notification ops permission are rejected', async () => {
        const limitedOps = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: DEFAULT_PRIVATE_ROLE_PERMISSIONS[PRIVATE_AUTH_ROLES.OPS]
                .filter((permission) => permission !== PRIVATE_AUTH_PERMISSIONS.OPS_NOTIFICATIONS_WRITE)
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, limitedOps)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('create notification validates recipient requirement', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/notifications`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                type: NOTIFICATION_TYPES.SYSTEM,
                title: 'System notice',
                message: 'Missing recipient should fail'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({
                path: 'body'
            })
        ]));
    });
});
