import { Router } from 'express';
import { validate } from '../../../shared/middlewares/validate.middleware.js';
import {
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { createPrivateAuthGuard } from '../auth/session/auth-guard.middleware.js';
import PasswordService from '../auth/session/password.service.js';
import PrivateTokenService from '../auth/session/token.service.js';
import AdminController from './admin.controller.js';
import AdminDao from './admin.dao.js';
import AdminService from './admin.service.js';
import {
    adminUserParamsSchema,
    adminUserQuerySchema,
    createAdminUserSchema,
    updateAdminUserPermissionsSchema,
    updateAdminUserSchema,
    updateAdminUserStatusSchema
} from './validators/admin.validator.js';

const createAdminDependencies = ({
    adminDao = new AdminDao(),
    passwordService = new PasswordService(),
    tokenService = new PrivateTokenService()
} = {}) => ({
    adminDao,
    passwordService,
    tokenService
});

export const createAdminRouter = (dependencies = createAdminDependencies()) => {
    const router = Router();
    const { adminDao, passwordService, tokenService } = dependencies;
    const adminService = new AdminService({ adminDao, passwordService });
    const adminController = new AdminController(adminService);
    const requireAdminRead = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_READ]
    });
    const requireAdminWrite = createPrivateAuthGuard({
        tokenService,
        allowedRoles: [PRIVATE_AUTH_ROLES.ADMIN],
        requiredPermissions: [PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_WRITE]
    });

    router.use(requireAdminRead);

    router.get('/options', adminController.options);
    router.get('/dashboard', adminController.dashboard);
    router.get('/users', validate(adminUserQuerySchema), adminController.listUsers);
    router.post('/users', requireAdminWrite, validate(createAdminUserSchema), adminController.createUser);
    router.patch(
        '/users/:userId/status',
        requireAdminWrite,
        validate(updateAdminUserStatusSchema),
        adminController.updateUserStatus
    );
    router.patch(
        '/users/:userId/permissions',
        requireAdminWrite,
        validate(updateAdminUserPermissionsSchema),
        adminController.updateUserPermissions
    );
    router.patch('/users/:userId', requireAdminWrite, validate(updateAdminUserSchema), adminController.updateUser);
    router.get('/users/:userId', validate(adminUserParamsSchema), adminController.getUser);

    return router;
};

export default createAdminRouter();
