import { Router } from 'express';
import AppError from '../../../shared/utils/appError.js';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { PRIVATE_AUTH_ROLES } from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import RideLifecycleController from './ride-lifecycle.controller.js';
import RideLifecycleDao from './ride-lifecycle.dao.js';
import RideLifecycleService from './ride-lifecycle.service.js';
import {
    rideLifecycleParamsSchema,
    transitionRideLifecycleSchema
} from './validators/ride-lifecycle.validator.js';

const createRideLifecycleDependencies = ({
    rideLifecycleDao = new RideLifecycleDao(),
    publicTokenService = new PublicTokenService(),
    privateTokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    rideLifecycleDao,
    publicTokenService,
    privateTokenService,
    now
});

export const createRideLifecycleRouter = (dependencies = createRideLifecycleDependencies()) => {
    const router = Router();
    const {
        rideLifecycleDao,
        publicTokenService,
        privateTokenService,
        now
    } = dependencies;
    const rideLifecycleService = new RideLifecycleService({ rideLifecycleDao, now });
    const rideLifecycleController = new RideLifecycleController(rideLifecycleService);
    const requireRideLifecycleAccess = createCoreRideLifecycleAuthGuard({
        publicTokenService,
        privateTokenService,
        allowedRoles: [
            ...Object.values(AUTH_ROLES),
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS,
            PRIVATE_AUTH_ROLES.DRIVER
        ]
    });

    router.use(requireRideLifecycleAccess);

    router.get('/options', rideLifecycleController.options);
    router.get('/rides/:rideId', validate(rideLifecycleParamsSchema), rideLifecycleController.getRideLifecycle);
    router.post('/rides/:rideId/events', validate(transitionRideLifecycleSchema), rideLifecycleController.transitionRide);

    return router;
};

const createCoreRideLifecycleAuthGuard = ({
    publicTokenService,
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCoreRideLifecycleAccess({
                accessToken,
                publicTokenService,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to ride lifecycle routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCoreRideLifecycleAccess = ({
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

export default createRideLifecycleRouter();
