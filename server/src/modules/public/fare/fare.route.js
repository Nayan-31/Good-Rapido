import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import FareController from './fare.controller.js';
import FareDao from './fare.dao.js';
import FareService from './fare.service.js';
import {
    createFareEstimateSchema,
    fareEstimateParamsSchema,
    fareHistoryQuerySchema
} from './validators/fare.validator.js';

const createFareDependencies = ({
    fareDao = new FareDao(),
    tokenService = new TokenService()
} = {}) => ({
    fareDao,
    tokenService
});

export const createFareRouter = (dependencies = createFareDependencies()) => {
    const router = Router();
    const { fareDao, tokenService } = dependencies;
    const fareService = new FareService({ dao: fareDao });
    const fareController = new FareController(fareService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.post('/estimate', validate(createFareEstimateSchema), fareController.createEstimate);
    router.get('/history', validate(fareHistoryQuerySchema), fareController.history);
    router.get('/estimates/:estimateId', validate(fareEstimateParamsSchema), fareController.getEstimate);
    router.post('/estimates/:estimateId/lock', validate(fareEstimateParamsSchema), fareController.lockEstimate);

    return router;
};

export default createFareRouter();
