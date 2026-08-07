import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import PrivateNotificationsController from './notifications.controller.js';
import PrivateNotificationsDao from './notifications.dao.js';
import PrivateNotificationsService from './notifications.service.js';
import {
    cancelPrivateNotificationSchema,
    createPrivateNotificationSchema,
    failPrivateNotificationSchema,
    privateNotificationParamsSchema,
    privateNotificationQuerySchema
} from './validators/notifications.validator.js';

const createPrivateNotificationsDependencies = ({
    notificationsDao = new PrivateNotificationsDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    notificationsDao,
    tokenService,
    now
});

export const createPrivateNotificationsRouter = (dependencies = createPrivateNotificationsDependencies()) => {
    const router = Router();
    const { notificationsDao, tokenService, now } = dependencies;
    const notificationsService = new PrivateNotificationsService({ notificationsDao, now });
    const notificationsController = new PrivateNotificationsController(notificationsService);
    const requireNotificationRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS,
            PRIVATE_AUTH_ROLES.DRIVER
        ]
    });
    const requireNotificationOps = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.OPS_NOTIFICATIONS_WRITE]
    });

    router.get('/options', requireNotificationRead, notificationsController.options);
    router.get('/dashboard', requireNotificationOps, notificationsController.dashboard);
    router.get('/notifications', requireNotificationRead, validate(privateNotificationQuerySchema), notificationsController.list);
    router.post('/notifications', requireNotificationOps, validate(createPrivateNotificationSchema), notificationsController.create);
    router.get('/notifications/:notificationId', requireNotificationRead, validate(privateNotificationParamsSchema), notificationsController.detail);
    router.patch('/notifications/:notificationId/read', requireNotificationRead, validate(privateNotificationParamsSchema), notificationsController.markRead);
    router.post('/notifications/:notificationId/send', requireNotificationOps, validate(privateNotificationParamsSchema), notificationsController.send);
    router.post('/notifications/:notificationId/fail', requireNotificationOps, validate(failPrivateNotificationSchema), notificationsController.fail);
    router.post('/notifications/:notificationId/retry', requireNotificationOps, validate(privateNotificationParamsSchema), notificationsController.retry);
    router.post('/notifications/:notificationId/cancel', requireNotificationOps, validate(cancelPrivateNotificationSchema), notificationsController.cancel);

    return router;
};

export default createPrivateNotificationsRouter();
