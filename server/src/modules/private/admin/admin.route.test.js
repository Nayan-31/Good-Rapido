import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createAdminRouter } from './admin.route.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import PrivateTokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';

const BASE_PATH = '/api/v1/private/admin';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createAdminRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPrivateUser = (role, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: role === PRIVATE_AUTH_ROLES.DRIVER ? '+919111111111' : '+919222222222',
    employeeCode: role === PRIVATE_AUTH_ROLES.DRIVER ? 'DRV-001' : `${role.toUpperCase()}-001`,
    department: role === PRIVATE_AUTH_ROLES.DRIVER ? 'driver_network' : 'operations',
    serviceZone: 'kolkata',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    lastLoginAt: FIXED_NOW,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDependencies = () => ({
    adminDao: {
        createUser: jest.fn(),
        findDashboardSummary: jest.fn(),
        findUsers: jest.fn(),
        findById: jest.fn(),
        findExistingContact: jest.fn(),
        updateUser: jest.fn()
    },
    passwordService: {
        hash: jest.fn().mockResolvedValue('hashed-password')
    },
    tokenService: new PrivateTokenService()
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private admin routes', () => {
    let dependencies;
    let app;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);
    });

    test('options returns admin metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.roles).toContain(PRIVATE_AUTH_ROLES.ADMIN);
        expect(response.body.data.options.statuses).toContain(PRIVATE_AUTH_ACCOUNT_STATUSES.SUSPENDED);
        expect(response.body.data.options.permissions).toContain(PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_WRITE);
        expect(response.body.data.options.dashboardModules).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'users',
                requiredPermission: PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_READ
            })
        ]));
    });

    test('dashboard returns private user summary and recent users', async () => {
        dependencies.adminDao.findDashboardSummary.mockResolvedValue({
            totals: [{
                totalUsers: 4,
                activeCount: 3,
                pendingCount: 1,
                blockedCount: 0,
                suspendedCount: 0,
                driverCount: 2,
                adminCount: 1,
                opsCount: 1,
                latestUserCreatedAt: FIXED_NOW
            }],
            roles: [
                { _id: PRIVATE_AUTH_ROLES.DRIVER, count: 2 },
                { _id: PRIVATE_AUTH_ROLES.ADMIN, count: 1 }
            ],
            statuses: [
                { _id: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE, count: 3 },
                { _id: PRIVATE_AUTH_ACCOUNT_STATUSES.PENDING, count: 1 }
            ],
            recentUsers: [
                createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER)
            ]
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/dashboard`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.dashboard.summary.totalUsers).toBe(4);
        expect(response.body.data.dashboard.summary.byRole.driver).toBe(2);
        expect(response.body.data.dashboard.recentUsers).toHaveLength(1);
    });

    test('list users returns users and summary with query filters', async () => {
        dependencies.adminDao.findUsers.mockResolvedValue([
            createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER),
            createPrivateUser(PRIVATE_AUTH_ROLES.OPS, {
                id: 'ops-id-2',
                _id: 'ops-id-2'
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/users?role=${PRIVATE_AUTH_ROLES.DRIVER}&q=kolkata&limit=5`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.users).toHaveLength(2);
        expect(response.body.data.summary.totalUsers).toBe(2);
        expect(response.body.data.summary.driverCount).toBe(1);
        expect(dependencies.adminDao.findUsers).toHaveBeenCalledWith({
            role: PRIVATE_AUTH_ROLES.DRIVER,
            q: 'kolkata',
            limit: 5
        });
    });

    test('get user returns private user detail and guidance', async () => {
        const driver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        dependencies.adminDao.findById.mockResolvedValue(driver);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/users/driver-id`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.user.role).toBe(PRIVATE_AUTH_ROLES.DRIVER);
        expect(response.body.data.user.passwordHash).toBeUndefined();
        expect(response.body.data.guidance.canUpdateStatus).toBe(true);
        expect(dependencies.adminDao.findById).toHaveBeenCalledWith('driver-id');
    });

    test('create user hashes password and applies default permissions', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);

        dependencies.adminDao.findExistingContact.mockResolvedValue(null);
        dependencies.adminDao.createUser.mockImplementation(async (payload) => ({
            ...opsUser,
            ...payload,
            id: 'ops-id',
            _id: 'ops-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/users`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                role: PRIVATE_AUTH_ROLES.OPS,
                fullName: 'Ops Reviewer',
                email: 'ops.reviewer@goodrapido.test',
                phone: '+919333333333',
                employeeCode: 'ops-101',
                department: 'operations',
                serviceZone: 'kolkata',
                password: 'password123'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.user.role).toBe(PRIVATE_AUTH_ROLES.OPS);
        expect(response.body.data.user.permissions).toContain(PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ);
        expect(dependencies.passwordService.hash).toHaveBeenCalledWith('password123');
        expect(dependencies.adminDao.createUser).toHaveBeenCalledWith(expect.objectContaining({
            role: PRIVATE_AUTH_ROLES.OPS,
            employeeCode: 'OPS-101',
            permissions: DEFAULT_PRIVATE_ROLE_PERMISSIONS[PRIVATE_AUTH_ROLES.OPS],
            passwordHash: 'hashed-password'
        }));
    });

    test('create user rejects duplicate private contacts', async () => {
        dependencies.adminDao.findExistingContact.mockResolvedValue(createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/users`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                role: PRIVATE_AUTH_ROLES.DRIVER,
                fullName: 'Driver User',
                email: 'driver@goodrapido.test',
                phone: '+919111111111',
                password: 'password123'
            }
        });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('Private user already exists with this contact');
        expect(dependencies.adminDao.createUser).not.toHaveBeenCalled();
    });

    test('update user status blocks self status changes', async () => {
        dependencies.adminDao.findById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/users/admin-id/status`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.SUSPENDED
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Admins cannot change their own account status');
        expect(dependencies.adminDao.updateUser).not.toHaveBeenCalled();
    });

    test('update permissions blocks removing own admin write permission', async () => {
        dependencies.adminDao.findById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/users/admin-id/permissions`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                permissions: [PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_READ]
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Admins cannot remove their own admin write permission');
        expect(dependencies.adminDao.updateUser).not.toHaveBeenCalled();
    });

    test('update user can change another private user profile and status', async () => {
        const driver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        dependencies.adminDao.findById.mockResolvedValue(driver);
        dependencies.adminDao.findExistingContact.mockResolvedValue(null);
        dependencies.adminDao.updateUser.mockImplementation(async (_userId, payload) => ({
            ...driver,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/users/driver-id`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                fullName: 'Updated Driver',
                accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.PENDING,
                permissions: [
                    PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_READ,
                    PRIVATE_AUTH_PERMISSIONS.DRIVER_RIDES_READ
                ]
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.user.fullName).toBe('Updated Driver');
        expect(response.body.data.user.accountStatus).toBe(PRIVATE_AUTH_ACCOUNT_STATUSES.PENDING);
        expect(dependencies.adminDao.updateUser).toHaveBeenCalledWith('driver-id', expect.objectContaining({
            fullName: 'Updated Driver',
            accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.PENDING
        }));
    });

    test('write routes reject admin tokens without write permission', async () => {
        const readOnlyAdmin = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN, {
            permissions: [PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_READ]
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/users`,
            headers: authHeaderFor(dependencies, readOnlyAdmin),
            body: {
                role: PRIVATE_AUTH_ROLES.OPS,
                fullName: 'Ops Reviewer',
                phone: '+919333333333',
                password: 'password123'
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('admin routes reject non-admin private users', async () => {
        const driver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driver)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('You do not have access to this private route');
    });

    test('admin routes reject requests without private access tokens', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Private access token is required');
    });

    test('admin routes return validation errors for invalid payloads', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/users`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                role: PRIVATE_AUTH_ROLES.OPS,
                fullName: 'O',
                phone: '123',
                password: 'short'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });
});
