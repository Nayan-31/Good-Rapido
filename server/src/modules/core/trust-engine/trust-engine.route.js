import { Router } from 'express';
import AppError from '../../../shared/utils/appError.js';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { PRIVATE_AUTH_ROLES } from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import TrustEngineController from './trust-engine.controller.js';
import TrustEngineDao from './trust-engine.dao.js';
import TrustEngineService from './trust-engine.service.js';
import {
    assessTrustSchema,
    evaluateDriverTrustSchema
} from './validators/trust-engine.validator.js';

const createTrustEngineDependencies = ({
    trustEngineDao = new TrustEngineDao(),
    publicTokenService = new PublicTokenService(),
    privateTokenService = new PrivateTokenService()
} = {}) => ({
    trustEngineDao,
    publicTokenService,
    privateTokenService
});

export const createTrustEngineRouter = (dependencies = createTrustEngineDependencies()) => {
    const router = Router();
    const {
        trustEngineDao,
        publicTokenService,
        privateTokenService
    } = dependencies;
    const trustEngineService = new TrustEngineService({ trustEngineDao });
    const trustEngineController = new TrustEngineController(trustEngineService);
    const requireTrustEngineAccess = createCoreTrustEngineAuthGuard({
        publicTokenService,
        privateTokenService,
        allowedRoles: [
            ...Object.values(AUTH_ROLES),
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });

    router.use(requireTrustEngineAccess);

    router.get('/options', trustEngineController.options);
    router.post('/assess', validate(assessTrustSchema), trustEngineController.assess);
    router.post('/drivers/evaluate', validate(evaluateDriverTrustSchema), trustEngineController.evaluateDriver);

    return router;
};

const createCoreTrustEngineAuthGuard = ({
    publicTokenService,
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCoreTrustEngineAccess({
                accessToken,
                publicTokenService,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to trust engine routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCoreTrustEngineAccess = ({
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

export default createTrustEngineRouter();
