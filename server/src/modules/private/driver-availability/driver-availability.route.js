import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import DriverAvailabilityController from './driver-availability.controller.js';
import DriverAvailabilityDao from './driver-availability.dao.js';
import DriverAvailabilityService from './driver-availability.service.js';
import {
    updateDriverAvailabilityLocationSchema,
    updateDriverAvailabilityStatusSchema,
    updateDriverAvailabilityZonesSchema
} from './validators/driver-availability.validator.js';

const createDriverAvailabilityDependencies = ({
    availabilityDao = new DriverAvailabilityDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    availabilityDao,
    tokenService,
    now
});

export const createDriverAvailabilityRouter = (dependencies = createDriverAvailabilityDependencies()) => {
    const router = Router();
    const { availabilityDao, tokenService, now } = dependencies;
    const driverAvailabilityService = new DriverAvailabilityService({ availabilityDao, now });
    const driverAvailabilityController = new DriverAvailabilityController(driverAvailabilityService);
    const requireDriverRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_READ]
    });
    const requireAvailabilityWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_AVAILABILITY_WRITE]
    });

    router.use(requireDriverRead);

    router.get('/options', driverAvailabilityController.options);
    router.get('/status', driverAvailabilityController.getStatus);
    router.patch(
        '/status',
        requireAvailabilityWrite,
        validate(updateDriverAvailabilityStatusSchema),
        driverAvailabilityController.updateStatus
    );
    router.patch(
        '/location',
        requireAvailabilityWrite,
        validate(updateDriverAvailabilityLocationSchema),
        driverAvailabilityController.updateLocation
    );
    router.patch(
        '/zones',
        requireAvailabilityWrite,
        validate(updateDriverAvailabilityZonesSchema),
        driverAvailabilityController.updateZones
    );

    return router;
};

export default createDriverAvailabilityRouter();
