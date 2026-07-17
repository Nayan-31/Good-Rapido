import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PrivateTokenService from '../auth/session/token.service.js';
import DriverController from './driver.controller.js';
import DriverDao from './driver.dao.js';
import DriverService from './driver.service.js';
import {
    requestDriverDeactivationSchema,
    updateDriverAccountControlsSchema,
    updateDriverOnboardingSchema,
    updateDriverProfileSchema
} from './validators/driver.validator.js';

const createDriverDependencies = ({
    driverDao = new DriverDao(),
    tokenService = new PrivateTokenService(),
    now = () => new Date()
} = {}) => ({
    driverDao,
    tokenService,
    now
});

export const createDriverRouter = (dependencies = createDriverDependencies()) => {
    const router = Router();
    const { driverDao, tokenService, now } = dependencies;
    const driverService = new DriverService({ driverDao, now });
    const driverController = new DriverController(driverService);
    const requireDriverRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_READ]
    });
    const requireDriverWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.DRIVER],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_WRITE]
    });

    router.use(requireDriverRead);

    router.get('/options', driverController.options);
    router.get('/profile', driverController.getProfile);
    router.patch('/profile', requireDriverWrite, validate(updateDriverProfileSchema), driverController.updateProfile);
    router.get('/onboarding', driverController.getOnboarding);
    router.patch('/onboarding', requireDriverWrite, validate(updateDriverOnboardingSchema), driverController.updateOnboarding);
    router.post('/onboarding/submit', requireDriverWrite, driverController.submitOnboarding);
    router.get('/account', driverController.getAccount);
    router.patch(
        '/account/controls',
        requireDriverWrite,
        validate(updateDriverAccountControlsSchema),
        driverController.updateAccountControls
    );
    router.post(
        '/account/deactivation-request',
        requireDriverWrite,
        validate(requestDriverDeactivationSchema),
        driverController.requestDeactivation
    );

    return router;
};

export default createDriverRouter();
