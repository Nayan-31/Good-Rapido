import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import PromosController from './promos.controller.js';
import PromosDao from './promos.dao.js';
import PromosService from './promos.service.js';
import {
    applyPromoSchema,
    promoEligibilityQuerySchema,
    promoHistoryQuerySchema
} from './validators/promos.validator.js';

const createPromosDependencies = ({
    promosDao = new PromosDao(),
    tokenService = new TokenService(),
    now = () => new Date()
} = {}) => ({
    promosDao,
    tokenService,
    now
});

export const createPromosRouter = (dependencies = createPromosDependencies()) => {
    const router = Router();
    const { promosDao, tokenService, now } = dependencies;
    const promosService = new PromosService({ promosDao, now });
    const promosController = new PromosController(promosService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/eligible', validate(promoEligibilityQuerySchema), promosController.eligible);
    router.get('/referral-code', promosController.referralCode);
    router.get('/history', validate(promoHistoryQuerySchema), promosController.history);
    router.post('/apply', validate(applyPromoSchema), promosController.apply);

    return router;
};

export default createPromosRouter();
