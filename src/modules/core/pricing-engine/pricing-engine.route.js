import { Router } from 'express';
import AppError from '../../../shared/utils/appError.js';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { PRIVATE_AUTH_ROLES } from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import PricingEngineController from './pricing-engine.controller.js';
import PricingEngineDao from './pricing-engine.dao.js';
import PricingEngineService from './pricing-engine.service.js';
import {
    comparePricingEngineSchema,
    quotePricingEngineSchema
} from './validators/pricing-engine.validator.js';

const createPricingEngineDependencies = ({
    pricingEngineDao = new PricingEngineDao(),
    publicTokenService = new PublicTokenService(),
    privateTokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    pricingEngineDao,
    publicTokenService,
    privateTokenService,
    now
});

export const createPricingEngineRouter = (dependencies = createPricingEngineDependencies()) => {
    const router = Router();
    const {
        pricingEngineDao,
        publicTokenService,
        privateTokenService,
        now
    } = dependencies;
    const pricingEngineService = new PricingEngineService({ pricingEngineDao, now });
    const pricingEngineController = new PricingEngineController(pricingEngineService);
    const requirePricingEngineAccess = createCorePricingEngineAuthGuard({
        publicTokenService,
        privateTokenService,
        allowedRoles: [
            ...Object.values(AUTH_ROLES),
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });

    router.use(requirePricingEngineAccess);

    router.get('/options', pricingEngineController.options);
    router.post('/quote', validate(quotePricingEngineSchema), pricingEngineController.quote);
    router.post('/compare', validate(comparePricingEngineSchema), pricingEngineController.compare);

    return router;
};

const createCorePricingEngineAuthGuard = ({
    publicTokenService,
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCorePricingEngineAccess({
                accessToken,
                publicTokenService,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to pricing engine routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCorePricingEngineAccess = ({
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

export default createPricingEngineRouter();
