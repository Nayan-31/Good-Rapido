import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    PAYMENT_ENGINE_INTENT_STATUSES,
    PAYMENT_ENGINE_METHODS,
    PAYMENT_ENGINE_REFUND_ELIGIBILITY,
    PAYMENT_ENGINE_REFUND_REASONS,
    PAYMENT_ENGINE_STATUSES,
    PAYMENT_ENGINE_WALLET_OPENING_BALANCE
} from './payment-engine.constants.js';
import { createPaymentEngineRouter } from './payment-engine.route.js';

const BASE_PATH = '/api/v1/core/payment-engine';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createPaymentEngineRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPublicUser = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: '+919111111111',
    accountStatus: AUTH_ACCOUNT_STATUSES.ACTIVE,
    ...overrides
});

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.ADMIN, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: '+919222222222',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    ...overrides
});

const createDependencies = () => ({
    paymentEngineDao: {
        findPublicUserById: jest.fn(),
        findPrivateUserById: jest.fn()
    },
    publicTokenService: new PublicTokenService(),
    privateTokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const publicAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.publicTokenService.signAccessToken(user)}`
});

const privateAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.privateTokenService.signAccessToken(user)}`
});

describe('core payment engine routes', () => {
    let dependencies;
    let app;
    let riderUser;
    let adminUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        riderUser = createPublicUser();
        adminUser = createPrivateUser();
    });

    test('options returns payment engine metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.methods).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: PAYMENT_ENGINE_METHODS.PERSONAL_WALLET,
                balance: PAYMENT_ENGINE_WALLET_OPENING_BALANCE
            }),
            expect.objectContaining({
                code: PAYMENT_ENGINE_METHODS.UPI
            })
        ]));
        expect(response.body.data.options.statuses).toContain(PAYMENT_ENGINE_STATUSES.SUCCEEDED);
        expect(response.body.data.options.refundReasons).toContain(PAYMENT_ENGINE_REFUND_REASONS.OVERCHARGED);
    });

    test('public user can preview a wallet payment intent', async () => {
        dependencies.paymentEngineDao.findPublicUserById.mockResolvedValue(riderUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/intents/preview`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: {
                rideId: 'ride-id',
                paymentMethod: PAYMENT_ENGINE_METHODS.PERSONAL_WALLET,
                fareAmount: 350,
                tipAmount: 20,
                discountAmount: 50
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.intent.breakdown.amount).toBe(320);
        expect(response.body.data.intent.wallet.after).toBe(1180);
        expect(response.body.data.intent.settlement.intentStatus).toBe(PAYMENT_ENGINE_INTENT_STATUSES.READY_TO_CAPTURE);
        expect(response.body.data.intent.settlement.paymentStatus).toBe(PAYMENT_ENGINE_STATUSES.SUCCEEDED);
        expect(response.body.data.intent.capture.shouldCapture).toBe(true);
    });

    test('public user can preview insufficient wallet balance', async () => {
        dependencies.paymentEngineDao.findPublicUserById.mockResolvedValue(riderUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/intents/preview`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: {
                paymentMethod: PAYMENT_ENGINE_METHODS.PERSONAL_WALLET,
                fareAmount: 900,
                walletBalance: 100
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.intent.wallet.hasSufficientBalance).toBe(false);
        expect(response.body.data.intent.settlement.intentStatus).toBe(PAYMENT_ENGINE_INTENT_STATUSES.INSUFFICIENT_FUNDS);
        expect(response.body.data.intent.capture.shouldCapture).toBe(false);
    });

    test('private admin can preview refund eligibility', async () => {
        dependencies.paymentEngineDao.findPrivateUserById.mockResolvedValue(adminUser);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/refunds/preview`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                payment: {
                    id: 'payment-id',
                    paymentCode: 'PAY-GR-TEST-0001',
                    status: PAYMENT_ENGINE_STATUSES.SUCCEEDED,
                    amount: 350,
                    refundableUntil: '2026-01-08T08:10:00.000Z'
                },
                reason: PAYMENT_ENGINE_REFUND_REASONS.OVERCHARGED,
                note: 'Fare was higher than expected',
                amount: 120
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.refund.status).toBe(PAYMENT_ENGINE_REFUND_ELIGIBILITY.ELIGIBLE);
        expect(response.body.data.refund.eligible).toBe(true);
        expect(response.body.data.refund.amount).toBe(120);
    });

    test('preview payment intent validates missing fare amount', async () => {
        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/intents/preview`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: {
                paymentMethod: PAYMENT_ENGINE_METHODS.UPI
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
