import { Router } from 'express';
import AppError from '../../../shared/utils/appError.js';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { PRIVATE_AUTH_ROLES } from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import PaymentEngineController from './payment-engine.controller.js';
import PaymentEngineDao from './payment-engine.dao.js';
import PaymentEngineService from './payment-engine.service.js';
import {
    previewPaymentIntentSchema,
    previewRefundSchema
} from './validators/payment-engine.validator.js';

const createPaymentEngineDependencies = ({
    paymentEngineDao = new PaymentEngineDao(),
    publicTokenService = new PublicTokenService(),
    privateTokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    paymentEngineDao,
    publicTokenService,
    privateTokenService,
    now
});

export const createPaymentEngineRouter = (dependencies = createPaymentEngineDependencies()) => {
    const router = Router();
    const {
        paymentEngineDao,
        publicTokenService,
        privateTokenService,
        now
    } = dependencies;
    const paymentEngineService = new PaymentEngineService({ paymentEngineDao, now });
    const paymentEngineController = new PaymentEngineController(paymentEngineService);
    const requirePaymentEngineAccess = createCorePaymentEngineAuthGuard({
        publicTokenService,
        privateTokenService,
        allowedRoles: [
            ...Object.values(AUTH_ROLES),
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });

    router.use(requirePaymentEngineAccess);

    router.get('/options', paymentEngineController.options);
    router.post('/intents/preview', validate(previewPaymentIntentSchema), paymentEngineController.previewIntent);
    router.post('/refunds/preview', validate(previewRefundSchema), paymentEngineController.previewRefund);

    return router;
};

const createCorePaymentEngineAuthGuard = ({
    publicTokenService,
    privateTokenService,
    allowedRoles = []
}) => {
    return (req, _res, next) => {
        try {
            const accessToken = extractBearerToken(req.headers.authorization);
            const authContext = verifyCorePaymentEngineAccess({
                accessToken,
                publicTokenService,
                privateTokenService
            });

            if (allowedRoles.length && !allowedRoles.includes(authContext.role)) {
                throw AppError.forbidden('You do not have access to payment engine routes');
            }

            req.auth = authContext;

            return next();
        } catch (err) {
            return next(err);
        }
    };
};

const verifyCorePaymentEngineAccess = ({
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

export default createPaymentEngineRouter();
