import express from 'express';
import cookieParser from 'cookie-parser';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from './auth.constants.js';
import { createAuthRouter } from './auth.route.js';
import TokenService from './session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';

const BASE_PATH = '/api/v1/public/auth';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(cookieParser());
    app.use(BASE_PATH, createAuthRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@example.com`,
    phone: role === AUTH_ROLES.RIDER ? '+919111111111' : '+919222222222',
    passwordHash: 'hashed-password',
    accountStatus: 'active',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
});

const createDependencies = () => {
    const tokenService = new TokenService();

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

describe('public auth routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    describe.each([
        ['riders', AUTH_ROLES.RIDER],
        ['passengers', AUTH_ROLES.PASSENGER]
    ])('%s', (pathSegment, role) => {
        test('register creates an account and returns auth tokens', async () => {
            const user = createUser(role);

            dependencies.authDao.findExistingContact.mockResolvedValue(null);
            dependencies.authDao.create.mockResolvedValue(user);

            const response = await injectRequest(app, {
                method: 'POST',
                path: `${BASE_PATH}/${pathSegment}/register`,
                body: {
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    password: 'password123'
                }
            });

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.role).toBe(role);
            expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
            expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
            expect(dependencies.authDao.create).toHaveBeenCalledWith(expect.objectContaining({ role }));
        });

        test('login accepts credentials and returns auth tokens', async () => {
            const user = createUser(role);

            dependencies.authDao.findByIdentifier.mockResolvedValue(user);

            const response = await injectRequest(app, {
                method: 'POST',
                path: `${BASE_PATH}/${pathSegment}/login`,
                body: {
                    identifier: user.phone,
                    password: 'password123'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.role).toBe(role);
            expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
            expect(dependencies.passwordService.compare).toHaveBeenCalledWith('password123', user.passwordHash);
        });

        test('refresh rotates tokens when refresh token matches stored session', async () => {
            const user = createUser(role);
            const tokens = dependencies.tokenService.createTokenPair(user);

            dependencies.authDao.findByIdAndRole.mockResolvedValue({
                ...user,
                refreshTokenHash: dependencies.tokenService.hashToken(tokens.refreshToken)
            });

            const response = await injectRequest(app, {
                method: 'POST',
                path: `${BASE_PATH}/${pathSegment}/refresh`,
                body: {
                    refreshToken: tokens.refreshToken
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.role).toBe(role);
            expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
        });

        test('logout clears the stored refresh session', async () => {
            const user = createUser(role);
            const tokens = dependencies.tokenService.createTokenPair(user);

            dependencies.authDao.findByIdAndRole.mockResolvedValue({
                ...user,
                refreshTokenHash: dependencies.tokenService.hashToken(tokens.refreshToken)
            });

            const response = await injectRequest(app, {
                method: 'POST',
                path: `${BASE_PATH}/${pathSegment}/logout`,
                body: {
                    refreshToken: tokens.refreshToken
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(dependencies.authDao.clearSession).toHaveBeenCalledWith(user.id, role);
        });

        test('me returns the authenticated profile', async () => {
            const user = createUser(role);
            const accessToken = dependencies.tokenService.signAccessToken(user);

            dependencies.authDao.findByIdAndRole.mockResolvedValue(user);

            const response = await injectRequest(app, {
                method: 'GET',
                path: `${BASE_PATH}/${pathSegment}/me`,
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.role).toBe(role);
            expect(dependencies.authDao.findByIdAndRole).toHaveBeenCalledWith(user.id, role);
        });
    });

    test('register returns validation errors for invalid payloads', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/riders/register`,
            body: {}
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('me rejects requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/riders/me`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('unknown auth routes return 404', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/riders/unknown`
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
    });
});
