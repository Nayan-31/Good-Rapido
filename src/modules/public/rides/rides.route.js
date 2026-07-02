import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import RidesController from './rides.controller.js';
import RidesDao from './rides.dao.js';
import RidesService from './rides.service.js';
import {
    rideHistoryQuerySchema,
    rideParamsSchema
} from './validators/rides.validator.js';

const createRidesDependencies = ({
    ridesDao = new RidesDao(),
    tokenService = new TokenService(),
    now = () => new Date()
} = {}) => ({
    ridesDao,
    tokenService,
    now
});

export const createRidesRouter = (dependencies = createRidesDependencies()) => {
    const router = Router();
    const { ridesDao, tokenService, now } = dependencies;
    const ridesService = new RidesService({ ridesDao, now });
    const ridesController = new RidesController(ridesService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/current', ridesController.current);
    router.get('/history', validate(rideHistoryQuerySchema), ridesController.history);
    router.get('/:rideId/receipt', validate(rideParamsSchema), ridesController.getReceipt);
    router.get('/:rideId', validate(rideParamsSchema), ridesController.getRide);

    return router;
};

export default createRidesRouter();
