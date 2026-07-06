import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    PROMO_APPLICATION_STATUSES,
    PROMO_CURRENCY
} from './promos.constants.js';
import { createPromosRouter } from './promos.route.js';

const BASE_PATH = '/api/v1/public/promos';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createPromosRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createPromoApplication = (overrides = {}) => ({
    id: 'promo-application-id',
    _id: 'promo-application-id',
    applicationCode: 'PROMO-GR-TEST-0001',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    promoCode: 'FAIRFARE20',
    rideId: 'ride-id',
    referralCode: null,
    status: PROMO_APPLICATION_STATUSES.APPLIED,
    currency: PROMO_CURRENCY,
    fareAmount: 300,
    discountAmount: 60,
    finalAmount: 240,
    eligibilitySnapshot: {
        rideCount: 3,
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 60,
        minimumFare: 180,
        ineligibilityReasons: [],
        abuseSignals: []
    },
    appliedAt: FIXED_NOW,
    expiresAt: new Date('2026-01-01T08:25:00.000Z'),
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDependencies = () => ({
    promosDao: {
        create: jest.fn(),
        findRecentForUser: jest.fn(),
        findAppliedCodeForUser: jest.fn(),
        findAppliedForDeviceFingerprintHash: jest.fn(),
        countApplicationsForUserSince: jest.fn()
    },
    tokenService: new TokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public promos routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        dependencies.promosDao.countApplicationsForUserSince.mockResolvedValue(0);
        dependencies.promosDao.findAppliedCodeForUser.mockResolvedValue(null);
        dependencies.promosDao.findAppliedForDeviceFingerprintHash.mockResolvedValue(null);
        app = createTestApp(dependencies);
    });

    test('eligible returns promo catalog with discount previews and referral code', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/eligible?fareAmount=300&rideCount=0&deviceFingerprint=device-123`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.summary.eligibleCount).toBeGreaterThan(0);
        expect(response.body.data.summary.bestDiscountAmount).toBe(75);
        expect(response.body.data.promos).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'GOODFIRST',
                eligible: true,
                discount: expect.objectContaining({
                    previewAmount: 75
                })
            })
        ]));
        expect(response.body.data.referral.code).toMatch(/^GRR/);
    });

    test('referral-code returns deterministic rider referral metadata', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/referral-code`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.referral.code).toMatch(/^GRP/);
        expect(response.body.data.referral.invitedRiderDiscount).toBe(50);
        expect(response.body.data.referral.fraudNote).toContain('device');
    });

    test('apply creates a promo application with a hashed device fingerprint', async () => {
        const user = createUser();

        dependencies.promosDao.create.mockImplementation(async (payload) => createPromoApplication({
            ...payload,
            id: 'promo-application-id',
            _id: 'promo-application-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/apply`,
            headers: authHeaderFor(dependencies, user),
            body: {
                promoCode: 'goodfirst',
                fareAmount: 300,
                rideId: 'ride-id',
                rideCount: 0,
                deviceFingerprint: 'device-123'
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.promoApplication.promoCode).toBe('GOODFIRST');
        expect(response.body.data.savings.discountAmount).toBe(75);
        expect(response.body.data.savings.finalAmount).toBe(225);
        expect(dependencies.promosDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: user.id,
            role: user.role,
            promoCode: 'GOODFIRST',
            fareAmount: 300,
            discountAmount: 75,
            finalAmount: 225,
            deviceFingerprintHash: expect.not.stringMatching('device-123')
        }));
    });

    test('apply prevents duplicate account promo use', async () => {
        const user = createUser();

        dependencies.promosDao.findAppliedCodeForUser.mockResolvedValue(createPromoApplication({
            authUserId: user.id,
            role: user.role,
            promoCode: 'FAIRFARE20'
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/apply`,
            headers: authHeaderFor(dependencies, user),
            body: {
                promoCode: 'FAIRFARE20',
                fareAmount: 300,
                rideCount: 2
            }
        });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('Promo code has already been applied by this account');
        expect(dependencies.promosDao.create).not.toHaveBeenCalled();
    });

    test('first ride promos require a device fingerprint', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/apply`,
            headers: authHeaderFor(dependencies, user),
            body: {
                promoCode: 'GOODFIRST',
                fareAmount: 300,
                rideCount: 0
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Device fingerprint is required for this promo');
        expect(dependencies.promosDao.create).not.toHaveBeenCalled();
    });

    test('history returns promo applications and total savings', async () => {
        const user = createUser();

        dependencies.promosDao.findRecentForUser.mockResolvedValue([
            createPromoApplication({
                authUserId: user.id,
                role: user.role
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/history?status=${PROMO_APPLICATION_STATUSES.APPLIED}&limit=5`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.history[0].promoCode).toBe('FAIRFARE20');
        expect(response.body.data.summary.totalSavings).toBe(60);
        expect(dependencies.promosDao.findRecentForUser).toHaveBeenCalledWith(user.id, user.role, {
            status: PROMO_APPLICATION_STATUSES.APPLIED,
            limit: 5
        });
    });

    test('promos routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/eligible?fareAmount=300`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('promos routes return validation errors for invalid payloads', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/apply`,
            headers: authHeaderFor(dependencies, user),
            body: {
                promoCode: 'F',
                fareAmount: -10
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
