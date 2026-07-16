import { Router } from 'express';
import AppError from '../../../shared/utils/appError.js';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { PRIVATE_AUTH_ROLES } from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import RouteEngineController from './route-engine.controller.js';
import RouteEngineDao from './route-engine.dao.js';
import RouteEngineService from './route-engine.service.js';
import { planRouteSchema } from './validators/route-engine.validator.js';

const createRouteEngineDependencies = ({
    routeEngineDao = new RouteEngineDao(),
    publicTokenService = new PublicTokenService(),
    privateTokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    routeEngineDao,
    publicTokenService,
    privateTokenService,
    now
});

export const createRouteEngineRouter = (dependencies = createRouteEngineDependencies()) => {
    const router = Router();
    const {
        routeEngineDao,
        publicTokenService,
        privateTokenService,
        now
    } = dependencies;
    const routeEngineService = new RouteEngineService({ routeEngineDao, now });
    const routeEngineController = new RouteEngineController(routeEngineService);
    const requireRouteEngineAccess = createCoreRouteEngineAuthGuard({
        publicTokenService,
        privateTokenService,
        allowedRoles: [
            ...Object.values(AUTH_ROLES),
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });

    router.use(requireRouteEngineAccess);

    router.get('/options', routeEngineController.options);
    router.post('/plan', validate(planRouteSchema), routeEngineController.plan);

    return router;
};

const createCoreRouteEngineAuthGuard = ({
    publicTokenService,
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCoreRouteEngineAccess({
                accessToken,
                publicTokenService,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to route engine routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCoreRouteEngineAccess = ({
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

export default createRouteEngineRouter();
