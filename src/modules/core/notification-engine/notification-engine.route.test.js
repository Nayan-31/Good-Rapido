import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    NOTIFICATION_ENGINE_CHANNELS,
    NOTIFICATION_ENGINE_DELIVERY_STATUSES,
    NOTIFICATION_ENGINE_ENTITY_TYPES,
    NOTIFICATION_ENGINE_OPS_ACTIONS,
    NOTIFICATION_ENGINE_PRIORITIES,
    NOTIFICATION_ENGINE_SUPPRESSION_REASONS,
    NOTIFICATION_ENGINE_TYPES
} from './notification-engine.constants.js';
import { createNotificationEngineRouter } from './notification-engine.route.js';

const BASE_PATH = '/api/v1/core/notification-engine';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createNotificationEngineRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPublicUser = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: '+919111111111',
    accountStatus: AUTH_ACCOUNT_STATUSES.ACTIVE,
    ...overrides
});

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.ADMIN, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: '+919222222222',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    ...overrides
});

const createDependencies = () => ({
    notificationEngineDao: {
        findPublicUserById: jest.fn(),
        findPrivateUserById: jest.fn()
    },
    publicTokenService: new PublicTokenService(),
    privateTokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const publicAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.publicTokenService.signAccessToken(user)}`
});

const privateAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.privateTokenService.signAccessToken(user)}`
});

describe('core notification engine routes', () => {
    let dependencies;
    let app;
    let riderUser;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        riderUser = createPublicUser();
        adminUser = createPrivateUser();
    });

    test('options returns notification engine metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.types).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: NOTIFICATION_ENGINE_TYPES.RIDE_ALERT
            })
        ]));
        expect(response.body.data.options.channels).toContain(NOTIFICATION_ENGINE_CHANNELS.PUSH);
        expect(response.body.data.options.opsActions).toContain(NOTIFICATION_ENGINE_OPS_ACTIONS.RETRY);
    });

    test('public user can plan notification delivery with quiet hour suppression', async () => {
        dependencies.notificationEngineDao.findPublicUserById.mockResolvedValue(riderUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/delivery/plan`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: {
                type: NOTIFICATION_ENGINE_TYPES.PROMO_OFFER,
                channel: NOTIFICATION_ENGINE_CHANNELS.PUSH,
                preferences: {
                    quietHours: {
                        enabled: true,
                        start: '22:00',
                        end: '07:00',
                        timezone: 'Asia/Kolkata'
                    }
                },
                requestedAt: '2026-01-01T23:10:00.000Z'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.plan.deliveryStatus).toBe(NOTIFICATION_ENGINE_DELIVERY_STATUSES.PENDING);
        expect(response.body.data.plan.suppressed).toBe(true);
        expect(response.body.data.plan.suppressionReason).toBe(NOTIFICATION_ENGINE_SUPPRESSION_REASONS.QUIET_HOURS);
    });

    test('private admin can compose an ops notification', async () => {
        dependencies.notificationEngineDao.findPrivateUserById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/compose`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                recipient: {
                    authUserId: 'rider-001',
                    role: AUTH_ROLES.RIDER
                },
                type: NOTIFICATION_ENGINE_TYPES.SAFETY_ALERT,
                title: 'Safety update',
                message: 'Please review safety guidance for your ride.',
                actionLabel: 'Open',
                actionUrl: '/safety',
                relatedEntity: {
                    type: NOTIFICATION_ENGINE_ENTITY_TYPES.RIDE,
                    id: 'ride-001',
                    code: 'BOOK-001'
                },
                metadata: {
                    campaign: 'safety'
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.notification.notificationCode).toContain('NTF-SAFETY-ALERT');
        expect(response.body.data.notification.priority).toBe(NOTIFICATION_ENGINE_PRIORITIES.URGENT);
        expect(response.body.data.notification.delivery.sentAt).toBeTruthy();
        expect(response.body.data.notification.metadata.lastOpsAction).toBe(NOTIFICATION_ENGINE_OPS_ACTIONS.CREATE);
    });

    test('private compose requires notification ops permission', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
            permissions: []
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/compose`,
            headers: privateAuthHeaderFor(dependencies, opsUser),
            body: {
                recipient: {
                    authUserId: 'rider-001',
                    role: AUTH_ROLES.RIDER
                },
                type: NOTIFICATION_ENGINE_TYPES.SYSTEM,
                title: 'System notice',
                message: 'Your account settings were updated.'
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Notification ops permission is required');
    });

    test('delivery plan validates missing type', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/delivery/plan`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: {
                channel: NOTIFICATION_ENGINE_CHANNELS.PUSH
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });
});
