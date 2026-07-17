import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import VehicleController from './vehicle.controller.js';
import VehicleDao from './vehicle.dao.js';
import VehicleService from './vehicle.service.js';
import {
    createVehicleSchema,
    reviewVehicleSchema,
    updateVehicleSchema,
    vehicleIdParamSchema,
    vehicleReviewQueueSchema
} from './validators/vehicle.validator.js';

const createVehicleDependencies = ({
    vehicleDao = new VehicleDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    vehicleDao,
    tokenService,
    now
});

export const createVehicleRouter = (dependencies = createVehicleDependencies()) => {
    const router = Router();
    const { vehicleDao, tokenService, now } = dependencies;
    const vehicleService = new VehicleService({ vehicleDao, now });
    const vehicleController = new VehicleController(vehicleService);
    const requirePrivateAccess = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [
            PRIVATE_AUTH_ROLES.DRIVER,
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ]
    });
    const requireVehicleRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_READ]
    });
    const requireVehicleWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_WRITE]
    });
    const requireVehicleReview = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN, PRIVATE_AUTH_ROLES.OPS],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_REVIEW]
    });

    router.get('/options', requirePrivateAccess, vehicleController.options);
    router.get('/vehicles', requireVehicleRead, vehicleController.getVehicles);
    router.post('/vehicles', requireVehicleWrite, validate(createVehicleSchema), vehicleController.createVehicle);
    router.patch('/vehicles/:vehicleId', requireVehicleWrite, validate(updateVehicleSchema), vehicleController.updateVehicle);
    router.delete('/vehicles/:vehicleId', requireVehicleWrite, validate(vehicleIdParamSchema), vehicleController.deleteVehicle);
    router.patch(
        '/vehicles/:vehicleId/primary',
        requireVehicleWrite,
        validate(vehicleIdParamSchema),
        vehicleController.setPrimaryVehicle
    );
    router.post(
        '/vehicles/:vehicleId/submit',
        requireVehicleWrite,
        validate(vehicleIdParamSchema),
        vehicleController.submitVehicle
    );
    router.get(
        '/review-queue',
        requireVehicleReview,
        validate(vehicleReviewQueueSchema),
        vehicleController.getReviewQueue
    );
    router.patch(
        '/drivers/:driverId/vehicles/:vehicleId/review',
        requireVehicleReview,
        validate(reviewVehicleSchema),
        vehicleController.reviewVehicle
    );

    return router;
};

export default createVehicleRouter();
