import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import { AUTH_ROLES } from './auth.constants.js';
import AuthController from './auth.controller.js';
import AuthDao from './auth.dao.js';
import AuthService from './auth.service.js';
import { createAuthGuard } from './session/auth-guard.middleware.js';
import PasswordService from './session/password.service.js';
import TokenService from './session/token.service.js';
import { loginSchema, registerSchema, tokenSchema } from './validators/auth.validator.js';

const createAuthDependencies = ({
    authDao = new AuthDao(),
    passwordService = new PasswordService(),
    tokenService = new TokenService()
} = {}) => ({
    authDao,
    passwordService,
    tokenService
});

export const createRoleAuthRouter = (role, dependencies = createAuthDependencies()) => {
    const roleRouter = Router();
    const { authDao, passwordService, tokenService } = dependencies;
    const authService = new AuthService({
        role,
        dao: authDao,
        passwordService,
        tokenService
    });
    const authController = new AuthController(authService);
    const requireAuth = createAuthGuard({
        tokenService,
        allowedRoles: [role]
    });

    roleRouter.post('/register', validate(registerSchema), authController.register);
    roleRouter.post('/login', validate(loginSchema), authController.login);
    roleRouter.post('/refresh', validate(tokenSchema), authController.refresh);
    roleRouter.post('/logout', validate(tokenSchema), authController.logout);
    roleRouter.get('/me', requireAuth, authController.me);

    return roleRouter;
};

export const createAuthRouter = (dependencies = createAuthDependencies()) => {
    const router = Router();

    router.use('/riders', createRoleAuthRouter(AUTH_ROLES.RIDER, dependencies));
    router.use('/passengers', createRoleAuthRouter(AUTH_ROLES.PASSENGER, dependencies));

    return router;
};

export default createAuthRouter();

/**
 * auth.route.js  = URL setup + dependency wiring
 */