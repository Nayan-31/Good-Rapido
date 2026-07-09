import express from 'express';
import cookieParser from 'cookie-parser';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createPrivateAuthRouter } from './auth.route.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from './auth.constants.js';
import PrivateTokenService from './session/token.service.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import { AUTH_ROLES } from '../../public/auth/auth.constants.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';

const BASE_PATH = '/api/v1/private/auth';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(cookieParser());
    app.use(BASE_PATH, createPrivateAuthRouter(dependencies));
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
    passwordHash: 'hashed-password',
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
});

const createDependencies = () => {
    const tokenService = new PrivateTokenService();

    return {
        authDao: {
            findExistingContact: jest.fn(),
            create: jest.fn(),
            findByIdentifier: jest.fn(),
            findByIdAndRole: jest.fn(),
            updateSession: jest.fn().mockResolvedValue({ acknowledged: true }),
            clearSession: jest.fn().mockResolvedValue({ acknowledged: true })
        },
        passwordService: {
            hash: jest.fn().mockResolvedValue('hashed-password'),
            compare: jest.fn().mockResolvedValue(true)
        },
        tokenService
    };
};

describe('private auth routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('driver registration creates a private driver account and returns scoped tokens', async () => {
        const driver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);

        dependencies.authDao.findExistingContact.mockResolvedValue(null);
        dependencies.authDao.create.mockResolvedValue(driver);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/drivers/register`,
            body: {
                fullName: driver.fullName,
                email: driver.email,
                phone: driver.phone,
                employeeCode: 'drv-001',
                serviceZone: 'kolkata',
                password: 'password123'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe(PRIVATE_AUTH_ROLES.DRIVER);
        expect(response.body.data.user.permissions).toContain(PRIVATE_AUTH_PERMISSIONS.DRIVER_RIDES_READ);
        expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
        expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
        expect(dependencies.authDao.create).toHaveBeenCalledWith(expect.objectContaining({
            role: PRIVATE_AUTH_ROLES.DRIVER,
            phone: driver.phone,
            employeeCode: 'DRV-001',
            permissions: DEFAULT_PRIVATE_ROLE_PERMISSIONS[PRIVATE_AUTH_ROLES.DRIVER]
        }));
    });

    test('admin self-registration is not exposed', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/admins/register`,
            body: {
                fullName: 'Admin User',
                email: 'admin@goodrapido.test',
                phone: '+919333333333',
                password: 'password123'
            }
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(dependencies.authDao.create).not.toHaveBeenCalled();
    });

    test('admin login accepts seeded credentials and returns admin permissions', async () => {
        const admin = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        dependencies.authDao.findByIdentifier.mockResolvedValue(admin);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/admins/login`,
            body: {
                identifier: admin.email,
                password: 'password123'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe(PRIVATE_AUTH_ROLES.ADMIN);
        expect(response.body.data.user.permissions).toContain(PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_WRITE);
        expect(dependencies.authDao.findByIdentifier).toHaveBeenCalledWith(
            PRIVATE_AUTH_ROLES.ADMIN,
            { email: admin.email },
            '+passwordHash +refreshTokenHash'
        );
        expect(dependencies.passwordService.compare).toHaveBeenCalledWith('password123', admin.passwordHash);
    });

    test('ops login can use employee code identifiers', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);

        dependencies.authDao.findByIdentifier.mockResolvedValue(opsUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/ops/login`,
            body: {
                identifier: 'ops-001',
                password: 'password123'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.user.role).toBe(PRIVATE_AUTH_ROLES.OPS);
        expect(response.body.data.user.permissions).toContain(PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ);
        expect(dependencies.authDao.findByIdentifier).toHaveBeenCalledWith(
            PRIVATE_AUTH_ROLES.OPS,
            { employeeCode: 'OPS-001' },
            '+passwordHash +refreshTokenHash'
        );
    });

    test('refresh rotates private tokens when the stored refresh hash matches', async () => {
        const driver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);
        const tokens = dependencies.tokenService.createTokenPair(driver);

        dependencies.authDao.findByIdAndRole.mockResolvedValue({
            ...driver,
            refreshTokenHash: dependencies.tokenService.hashToken(tokens.refreshToken)
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/drivers/refresh`,
            body: {
                refreshToken: tokens.refreshToken
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
        expect(dependencies.authDao.updateSession).toHaveBeenCalledWith(
            driver.id,
            PRIVATE_AUTH_ROLES.DRIVER,
            expect.any(String)
        );
    });

    test('logout clears the private refresh session', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);
        const tokens = dependencies.tokenService.createTokenPair(opsUser);

        dependencies.authDao.findByIdAndRole.mockResolvedValue({
            ...opsUser,
            refreshTokenHash: dependencies.tokenService.hashToken(tokens.refreshToken)
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/ops/logout`,
            body: {
                refreshToken: tokens.refreshToken
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(dependencies.authDao.clearSession).toHaveBeenCalledWith(opsUser.id, PRIVATE_AUTH_ROLES.OPS);
    });

    test('me returns the authenticated private profile', async () => {
        const admin = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);
        const accessToken = dependencies.tokenService.signAccessToken(admin);

        dependencies.authDao.findByIdAndRole.mockResolvedValue(admin);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/admins/me`,
            headers: {
                authorization: `Bearer ${accessToken}`
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe(PRIVATE_AUTH_ROLES.ADMIN);
        expect(response.body.data.user.permissions).toContain(PRIVATE_AUTH_PERMISSIONS.ANALYTICS_READ);
        expect(dependencies.authDao.findByIdAndRole).toHaveBeenCalledWith(admin.id, PRIVATE_AUTH_ROLES.ADMIN);
    });

    test('me rejects public access tokens on private routes', async () => {
        const publicTokenService = new PublicTokenService();
        const accessToken = publicTokenService.signAccessToken({
            id: 'rider-id',
            role: AUTH_ROLES.RIDER
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/drivers/me`,
            headers: {
                authorization: `Bearer ${accessToken}`
            }
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid private access token');
    });

    test('login rejects inactive private accounts', async () => {
        const driver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER, {
            accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.SUSPENDED
        });

        dependencies.authDao.findByIdentifier.mockResolvedValue(driver);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/drivers/login`,
            body: {
                identifier: driver.phone,
                password: 'password123'
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Driver account is suspended');
        expect(dependencies.passwordService.compare).not.toHaveBeenCalled();
    });

    test('private routes return validation errors for invalid payloads', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/drivers/register`,
            body: {
                fullName: 'D',
                phone: '123',
                password: 'short'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });

    test('me rejects requests without a private access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/drivers/me`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Private access token is required');
    });
});
