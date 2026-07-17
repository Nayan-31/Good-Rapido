import { Router } from 'express';
import AppError from '../../../shared/utils/appError.js';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { PRIVATE_AUTH_ROLES } from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import NotificationEngineController from './notification-engine.controller.js';
import NotificationEngineDao from './notification-engine.dao.js';
import NotificationEngineService from './notification-engine.service.js';
import {
    composeNotificationSchema,
    planNotificationDeliverySchema
} from './validators/notification-engine.validator.js';

const createNotificationEngineDependencies = ({
    notificationEngineDao = new NotificationEngineDao(),
    publicTokenService = new PublicTokenService(),
    privateTokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    notificationEngineDao,
    publicTokenService,
    privateTokenService,
    now
});

export const createNotificationEngineRouter = (dependencies = createNotificationEngineDependencies()) => {
    const router = Router();
    const {
        notificationEngineDao,
        publicTokenService,
        privateTokenService,
        now
    } = dependencies;
    const notificationEngineService = new NotificationEngineService({ notificationEngineDao, now });
    const notificationEngineController = new NotificationEngineController(notificationEngineService);
    const requireNotificationEngineAccess = createCoreNotificationEngineAuthGuard({
        publicTokenService,
        privateTokenService,
        allowedRoles: [
            ...Object.values(AUTH_ROLES),
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });

    router.use(requireNotificationEngineAccess);

    router.get('/options', notificationEngineController.options);
    router.post('/delivery/plan', validate(planNotificationDeliverySchema), notificationEngineController.planDelivery);
    router.post('/compose', validate(composeNotificationSchema), notificationEngineController.compose);

    return router;
};

const createCoreNotificationEngineAuthGuard = ({
    publicTokenService,
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCoreNotificationEngineAccess({
                accessToken,
                publicTokenService,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to notification engine routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCoreNotificationEngineAccess = ({
    accessToken,
    publicTokenService,
    privateTokenService
}) => {
    try {
        const payload = privateTokenService.verifyAccessToken(accessToken);

        return {
            userId: payload.sub,
            role: payload.role,
            permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
            scope: 'private'
        };
    } catch (_privateErr) {
        const payload = publicTokenService.verifyAccessToken(accessToken);

        return {
            userId: payload.sub,
            role: payload.role,
            permissions: [],
            scope: 'public'
        };
    }
};

const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        throw AppError.unauthorized('Access token is required');
    }

    return authorizationHeader.replace('Bearer ', '').trim();
};

export default createNotificationEngineRouter();
