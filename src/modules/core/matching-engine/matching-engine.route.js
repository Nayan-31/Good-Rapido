import { Router } from 'express';
import AppError from '../../../shared/utils/appError.js';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { PRIVATE_AUTH_ROLES } from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import MatchingEngineController from './matching-engine.controller.js';
import MatchingEngineDao from './matching-engine.dao.js';
import MatchingEngineService from './matching-engine.service.js';
import { matchDriversSchema } from './validators/matching-engine.validator.js';

const createMatchingEngineDependencies = ({
    matchingEngineDao = new MatchingEngineDao(),
    publicTokenService = new PublicTokenService(),
    privateTokenService = new PrivateTokenService(),
    fallbackDrivers,
    now = () => new Date()
} = {}) => ({
    matchingEngineDao,
    publicTokenService,
    privateTokenService,
    fallbackDrivers,
    now
});

export const createMatchingEngineRouter = (dependencies = createMatchingEngineDependencies()) => {
    const router = Router();
    const {
        matchingEngineDao,
        publicTokenService,
        privateTokenService,
        fallbackDrivers,
        now
    } = dependencies;
    const matchingEngineService = new MatchingEngineService({ matchingEngineDao, fallbackDrivers, now });
    const matchingEngineController = new MatchingEngineController(matchingEngineService);
    const requireMatchingEngineAccess = createCoreMatchingEngineAuthGuard({
        publicTokenService,
        privateTokenService,
        allowedRoles: [
            ...Object.values(AUTH_ROLES),
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });

    router.use(requireMatchingEngineAccess);

    router.get('/options', matchingEngineController.options);
    router.post('/match', validate(matchDriversSchema), matchingEngineController.match);

    return router;
};

const createCoreMatchingEngineAuthGuard = ({
    publicTokenService,
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCoreMatchingEngineAccess({
                accessToken,
                publicTokenService,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to matching engine routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCoreMatchingEngineAccess = ({
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

export default createMatchingEngineRouter();
