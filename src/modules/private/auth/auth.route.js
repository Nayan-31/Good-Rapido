import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import PrivateAuthController from './auth.controller.js';
import PrivateAuthDao from './auth.dao.js';
import PrivateAuthService from './auth.service.js';
import { PRIVATE_AUTH_ROLES } from './auth.constants.js';
import { createPrivateAuthGuard } from './session/auth-guard.middleware.js';
import PasswordService from './session/password.service.js';
import PrivateTokenService from './session/token.service.js';
import {
    privateLoginSchema,
    privateRegisterSchema,
    privateTokenSchema
} from './validators/auth.validator.js';

const createPrivateAuthDependencies = ({
    authDao = new PrivateAuthDao(),
    passwordService = new PasswordService(),
    tokenService = new PrivateTokenService()
} = {}) => ({
    authDao,
    passwordService,
    tokenService
});

export const createPrivateRoleAuthRouter = (
    role,
    dependencies = createPrivateAuthDependencies(),
    { allowRegistration = false } = {}
) => {
    const roleRouter = Router();
    const { authDao, passwordService, tokenService } = dependencies;
    const authService = new PrivateAuthService({
        role,
        dao: authDao,
        passwordService,
        tokenService,
        allowRegistration
    });
    const authController = new PrivateAuthController(authService);
    const requireAuth = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [role]
    });

    if (allowRegistration) {
        roleRouter.post('/register', validate(privateRegisterSchema), authController.register);
    }

    roleRouter.post('/login', validate(privateLoginSchema), authController.login);
    roleRouter.post('/refresh', validate(privateTokenSchema), authController.refresh);
    roleRouter.post('/logout', validate(privateTokenSchema), authController.logout);
    roleRouter.get('/me', requireAuth, authController.me);

    return roleRouter;
};

export const createPrivateAuthRouter = (dependencies = createPrivateAuthDependencies()) => {
    const router = Router();

    router.use('/drivers', createPrivateRoleAuthRouter(
        PRIVATE_AUTH_ROLES.DRIVER,
        dependencies,
        { allowRegistration: true }
    ));
    router.use('/admins', createPrivateRoleAuthRouter(PRIVATE_AUTH_ROLES.ADMIN, dependencies));
    router.use('/ops', createPrivateRoleAuthRouter(PRIVATE_AUTH_ROLES.OPS, dependencies));

    return router;
};

export default createPrivateAuthRouter();
