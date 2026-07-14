import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import EarningsController from './earnings.controller.js';
import EarningsDao from './earnings.dao.js';
import EarningsService from './earnings.service.js';
import {
    earningsRideParamsSchema,
    earningsRideQuerySchema,
    earningsSimulationSchema,
    earningsStatementQuerySchema,
    earningsSummaryQuerySchema
} from './validators/earnings.validator.js';

const createEarningsDependencies = ({
    earningsDao = new EarningsDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    earningsDao,
    tokenService,
    now
});

export const createEarningsRouter = (dependencies = createEarningsDependencies()) => {
    const router = Router();
    const { earningsDao, tokenService, now } = dependencies;
    const earningsService = new EarningsService({ earningsDao, now });
    const earningsController = new EarningsController(earningsService);
    const requireEarningsRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_EARNINGS_READ]
    });

    router.use(requireEarningsRead);

    router.get('/options', earningsController.options);
    router.get('/summary', validate(earningsSummaryQuerySchema), earningsController.summary);
    router.get('/rides', validate(earningsRideQuerySchema), earningsController.rides);
    router.get('/rides/:rideId', validate(earningsRideParamsSchema), earningsController.ride);
    router.get('/statements', validate(earningsStatementQuerySchema), earningsController.statements);
    router.post('/simulate', validate(earningsSimulationSchema), earningsController.simulate);

    return router;
};

export default createEarningsRouter();
