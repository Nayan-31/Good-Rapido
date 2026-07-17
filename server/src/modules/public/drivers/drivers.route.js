import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { createAuthGuard } from '../auth/session/auth-guard.middleware.js';
import TokenService from '../auth/session/token.service.js';
import DriversController from './drivers.controller.js';
import DriversDao from './drivers.dao.js';
import DriversService from './drivers.service.js';
import {
    driverParamsSchema,
    driversListQuerySchema
} from './validators/drivers.validator.js';

const createDriversDependencies = ({
    driversDao = new DriversDao(),
    tokenService = new TokenService()
} = {}) => ({
    driversDao,
    tokenService
});

export const createDriversRouter = (dependencies = createDriversDependencies()) => {
    const router = Router();
    const { driversDao, tokenService } = dependencies;
    const driversService = new DriversService({ driversDao });
    const driversController = new DriversController(driversService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: Object.values(AUTH_ROLES)
    });

    router.use(requireAuth);

    router.get('/', validate(driversListQuerySchema), driversController.list);
    router.get('/:driverId/trust', validate(driverParamsSchema), driversController.getTrustReport);
    router.get('/:driverId/route-fairness', validate(driverParamsSchema), driversController.getRouteFairness);
    router.get('/:driverId/cancellation-risk', validate(driverParamsSchema), driversController.getCancellationRisk);
    router.get('/:driverId', validate(driverParamsSchema), driversController.getProfile);

    return router;
};

export default createDriversRouter();
