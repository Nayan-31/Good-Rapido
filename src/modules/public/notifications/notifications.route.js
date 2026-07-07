import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import NotificationsController from './notifications.controller.js';
import NotificationsDao from './notifications.dao.js';
import NotificationsService from './notifications.service.js';
import {
    markAllReadSchema,
    notificationParamsSchema,
    notificationQuerySchema,
    registerNotificationDeviceSchema,
    updateNotificationPreferencesSchema
} from './validators/notifications.validator.js';

const createNotificationsDependencies = ({
    notificationsDao = new NotificationsDao(),
    tokenService = new TokenService(),
    now = () => new Date()
} = {}) => ({
    notificationsDao,
    tokenService,
    now
});

export const createNotificationsRouter = (dependencies = createNotificationsDependencies()) => {
    const router = Router();
    const { notificationsDao, tokenService, now } = dependencies;
    const notificationsService = new NotificationsService({ notificationsDao, now });
    const notificationsController = new NotificationsController(notificationsService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/options', notificationsController.options);
    router.get('/summary', notificationsController.summary);
    router.get('/preferences', notificationsController.getPreferences);
    router.patch('/preferences', validate(updateNotificationPreferencesSchema), notificationsController.updatePreferences);
    router.post('/devices', validate(registerNotificationDeviceSchema), notificationsController.registerDevice);
    router.patch('/read-all', validate(markAllReadSchema), notificationsController.markAllRead);
    router.get('/', validate(notificationQuerySchema), notificationsController.list);
    router.patch('/:notificationId/read', validate(notificationParamsSchema), notificationsController.markRead);
    router.patch('/:notificationId/archive', validate(notificationParamsSchema), notificationsController.archive);
    router.get('/:notificationId', validate(notificationParamsSchema), notificationsController.getNotification);

    return router;
};

export default createNotificationsRouter();
