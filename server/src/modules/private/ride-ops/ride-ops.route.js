import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import RideOpsController from './ride-ops.controller.js';
import RideOpsDao from './ride-ops.dao.js';
import RideOpsService from './ride-ops.service.js';
import {
    cancelRideSchema,
    confirmRideSchema,
    reassignRideDriverSchema,
    rideOpsQueueQuerySchema,
    rideOpsRideParamsSchema,
    updateRideOpsStateSchema
} from './validators/ride-ops.validator.js';

const createRideOpsDependencies = ({
    rideOpsDao = new RideOpsDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    rideOpsDao,
    tokenService,
    now
});

export const createRideOpsRouter = (dependencies = createRideOpsDependencies()) => {
    const router = Router();
    const { rideOpsDao, tokenService, now } = dependencies;
    const rideOpsService = new RideOpsService({ rideOpsDao, now });
    const rideOpsController = new RideOpsController(rideOpsService);
    const requireRideParticipant = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS,
            PRIVATE_AUTH_ROLES.DRIVER
        ]
    });
    const requireRideOpsWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_WRITE]
    });

    router.use(requireRideParticipant);

    router.get('/options', rideOpsController.options);
    router.get('/dashboard', rideOpsController.dashboard);
    router.get('/rides', validate(rideOpsQueueQuerySchema), rideOpsController.listRides);
    router.get('/rides/:rideId', validate(rideOpsRideParamsSchema), rideOpsController.getRide);
    router.patch(
        '/rides/:rideId/ops-state',
        requireRideOpsWrite,
        validate(updateRideOpsStateSchema),
        rideOpsController.updateOpsState
    );
    router.post(
        '/rides/:rideId/confirm',
        validate(confirmRideSchema),
        rideOpsController.confirmRide
    );
    router.patch(
        '/rides/:rideId/driver',
        requireRideOpsWrite,
        validate(reassignRideDriverSchema),
        rideOpsController.reassignDriver
    );
    router.post(
        '/rides/:rideId/cancel',
        validate(cancelRideSchema),
        rideOpsController.cancelRide
    );

    return router;
};

export default createRideOpsRouter();
