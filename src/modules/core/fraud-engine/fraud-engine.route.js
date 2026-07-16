import { Router } from 'express';
import AppError from '../../../shared/utils/appError.js';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { PRIVATE_AUTH_ROLES } from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import FraudEngineController from './fraud-engine.controller.js';
import FraudEngineDao from './fraud-engine.dao.js';
import FraudEngineService from './fraud-engine.service.js';
import { assessFraudEngineSchema } from './validators/fraud-engine.validator.js';

const createFraudEngineDependencies = ({
    fraudEngineDao = new FraudEngineDao(),
    privateTokenService = new PrivateTokenService()
} = {}) => ({
    fraudEngineDao,
    privateTokenService
});

export const createFraudEngineRouter = (dependencies = createFraudEngineDependencies()) => {
    const router = Router();
    const {
        fraudEngineDao,
        privateTokenService
    } = dependencies;
    const fraudEngineService = new FraudEngineService({ fraudEngineDao });
    const fraudEngineController = new FraudEngineController(fraudEngineService);
    const requireFraudEngineAccess = createCoreFraudEngineAuthGuard({
        privateTokenService,
        allowedRoles: [
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });

    router.use(requireFraudEngineAccess);

    router.get('/options', fraudEngineController.options);
    router.post('/assess', validate(assessFraudEngineSchema), fraudEngineController.assess);

    return router;
};

const createCoreFraudEngineAuthGuard = ({
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCoreFraudEngineAccess({
                accessToken,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to fraud engine routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCoreFraudEngineAccess = ({
    accessToken,
    privateTokenService
}) => {
    const payload = privateTokenService.verifyAccessToken(accessToken);

    return {
        userId: payload.sub,
        role: payload.role,
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
        scope: 'private'
    };
};

const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        throw AppError.unauthorized('Access token is required');
    }

    return authorizationHeader.replace('Bearer ', '').trim();
};

export default createFraudEngineRouter();
