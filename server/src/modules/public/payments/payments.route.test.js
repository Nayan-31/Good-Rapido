import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
    PAYMENT_CURRENCY,
    PAYMENT_GATEWAY_PROVIDERS,
    PAYMENT_GATEWAY_STATUSES,
    PAYMENT_METHODS,
    PAYMENT_REFUND_REASONS,
    PAYMENT_STATUSES,
    PAYMENT_WALLET_OPENING_BALANCE
} from './payments.constants.js';
import { createPaymentsRouter } from './payments.route.js';

const BASE_PATH = '/api/v1/public/payments';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createPaymentsRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createRideBooking = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: 'ride-id',
    _id: 'ride-id',
    bookingCode: 'GR-TEST-0001',
    authUserId: `${role}-id`,
    role,
    status: RIDE_BOOKING_STATUSES.CONFIRMED,
    pickup: {
        address: 'Howrah Bridge',
        latitude: 22.5851,
        longitude: 88.3468
    },
    dropoff: {
        address: 'Park Street',
        latitude: 22.5535,
        longitude: 88.3526
    },
    vehicleType: 'cab_economy',
    selectedDriver: {
        driverId: 'drv_cab_rajesh',
        fullName: 'Rajesh Kumar',
        rating: 4.9,
        vehicleName: 'Suzuki Dzire',
        vehicleNumber: 'WB 01 AC 4522',
        vehicleColor: 'White'
    },
    fareSnapshot: {
        currency: PAYMENT_CURRENCY,
        totalFare: 350,
        distanceKm: 8.4,
        durationMinutes: 22,
        surgeMultiplier: 1.2,
        confidenceScore: 92
    },
    createdAt: new Date('2026-01-01T08:07:00.000Z'),
    updatedAt: new Date('2026-01-01T08:08:00.000Z'),
    ...overrides
});

const createPayment = (overrides = {}) => ({
    id: 'payment-id',
    _id: 'payment-id',
    paymentCode: 'PAY-GR-TEST-0001',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    rideId: 'ride-id',
    rideSnapshot: {
        bookingCode: 'GR-TEST-0001',
        pickup: {
            address: 'Howrah Bridge',
            latitude: 22.5851,
            longitude: 88.3468
        },
        dropoff: {
            address: 'Park Street',
            latitude: 22.5535,
            longitude: 88.3526
        },
        vehicleType: 'cab_economy',
        driver: {
            driverId: 'drv_cab_rajesh',
            fullName: 'Rajesh Kumar',
            vehicleName: 'Suzuki Dzire',
            vehicleNumber: 'WB 01 AC 4522'
        }
    },
    method: PAYMENT_METHODS.PERSONAL_WALLET,
    status: PAYMENT_STATUSES.SUCCEEDED,
    currency: PAYMENT_CURRENCY,
    fareAmount: 350,
    tipAmount: 0,
    discountAmount: 0,
    amount: 350,
    walletBalanceBefore: PAYMENT_WALLET_OPENING_BALANCE,
    walletBalanceAfter: PAYMENT_WALLET_OPENING_BALANCE - 350,
    gatewayReference: 'personal_wallet-ref',
    gateway: {
        provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
        status: PAYMENT_GATEWAY_STATUSES.NOT_REQUIRED,
        lastEventAt: new Date('2026-01-01T08:10:00.000Z')
    },
    capturedAt: new Date('2026-01-01T08:10:00.000Z'),
    refundableUntil: new Date('2026-01-08T08:10:00.000Z'),
    refund: null,
    createdAt: new Date('2026-01-01T08:10:00.000Z'),
    updatedAt: new Date('2026-01-01T08:10:00.000Z'),
    ...overrides
});

const createDependencies = () => ({
    paymentsDao: {
        create: jest.fn(),
        findByIdForUser: jest.fn(),
        findHistoryForUser: jest.fn(),
        findSuccessfulByRideForUser: jest.fn(),
        requestRefund: jest.fn(),
        updatePaymentForUser: jest.fn()
    },
    ridesDao: {
        findByIdForUser: jest.fn()
    },
    paymentGateway: {
        createPaymentSession: jest.fn(),
        confirmPaymentSuccess: jest.fn(),
        markPaymentFailed: jest.fn(),
        createRefund: jest.fn()
    },
    tokenService: new TokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public payments routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('methods returns supported payment options and wallet balance', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/methods`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.wallet.availableBalance).toBe(PAYMENT_WALLET_OPENING_BALANCE);
        expect(response.body.data.methods).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: PAYMENT_METHODS.PERSONAL_WALLET,
                isDefault: true
            }),
            expect.objectContaining({
                code: PAYMENT_METHODS.UPI
            })
        ]));
    });

    test('wallet returns transparent wallet summary', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/wallet`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.wallet.currency).toBe(PAYMENT_CURRENCY);
        expect(response.body.data.wallet.lowBalance).toBe(false);
    });

    test('pay ride creates a successful wallet payment for confirmed rides', async () => {
        const user = createUser();
        const ride = createRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(ride);
        dependencies.paymentsDao.findSuccessfulByRideForUser.mockResolvedValue(null);
        dependencies.paymentsDao.create.mockImplementation(async (payload) => createPayment({
            ...payload,
            id: 'payment-id',
            _id: 'payment-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/pay`,
            headers: authHeaderFor(dependencies, user),
            body: {
                paymentMethod: PAYMENT_METHODS.PERSONAL_WALLET
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.payment.status).toBe(PAYMENT_STATUSES.SUCCEEDED);
        expect(response.body.data.payment.amount).toBe(350);
        expect(response.body.data.payment.wallet.after).toBe(1150);
        expect(dependencies.ridesDao.findByIdForUser).toHaveBeenCalledWith('ride-id', user.id, user.role);
        expect(dependencies.paymentsDao.findSuccessfulByRideForUser).toHaveBeenCalledWith('ride-id', user.id, user.role);
        expect(dependencies.paymentsDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: user.id,
            role: user.role,
            rideId: 'ride-id',
            method: PAYMENT_METHODS.PERSONAL_WALLET,
            status: PAYMENT_STATUSES.SUCCEEDED,
            amount: 350
        }));
    });

    test('pay ride creates a gateway session for UPI payments', async () => {
        const user = createUser();
        const ride = createRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        });
        const gatewaySession = {
            provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
            status: PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION,
            orderId: 'mock-order-id',
            checkoutId: 'mock-checkout-id',
            clientSecret: 'mock-client-secret',
            gatewayReference: 'mock-gateway-ref',
            rawStatus: PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION,
            lastEventAt: FIXED_NOW
        };

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(ride);
        dependencies.paymentsDao.findSuccessfulByRideForUser.mockResolvedValue(null);
        dependencies.paymentGateway.createPaymentSession.mockResolvedValue(gatewaySession);
        dependencies.paymentsDao.create.mockImplementation(async (payload) => createPayment({
            ...payload,
            id: 'payment-id',
            _id: 'payment-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/pay`,
            headers: authHeaderFor(dependencies, user),
            body: {
                paymentMethod: PAYMENT_METHODS.UPI
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.payment.status).toBe(PAYMENT_STATUSES.PENDING);
        expect(response.body.data.payment.gateway.provider).toBe(PAYMENT_GATEWAY_PROVIDERS.MOCK);
        expect(response.body.data.payment.gateway.orderId).toBe('mock-order-id');
        expect(dependencies.paymentGateway.createPaymentSession).toHaveBeenCalledWith(expect.objectContaining({
            amount: 350,
            paymentMethod: PAYMENT_METHODS.UPI
        }));
        expect(dependencies.paymentsDao.create).toHaveBeenCalledWith(expect.objectContaining({
            method: PAYMENT_METHODS.UPI,
            status: PAYMENT_STATUSES.PENDING,
            gatewayReference: 'mock-gateway-ref',
            gateway: expect.objectContaining({
                status: PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION
            })
        }));
    });

    test('payment success callback marks gateway payment successful', async () => {
        const user = createUser();
        const pendingPayment = createPayment({
            authUserId: user.id,
            role: user.role,
            method: PAYMENT_METHODS.UPI,
            status: PAYMENT_STATUSES.PENDING,
            capturedAt: null,
            refundableUntil: null,
            gateway: {
                provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
                status: PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION,
                orderId: 'mock-order-id'
            }
        });
        const gatewayResult = {
            provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
            status: PAYMENT_GATEWAY_STATUSES.SUCCEEDED,
            paymentId: 'mock-payment-id',
            orderId: 'mock-order-id',
            gatewayReference: 'mock-payment-id',
            rawStatus: PAYMENT_GATEWAY_STATUSES.SUCCEEDED,
            lastEventAt: FIXED_NOW
        };

        dependencies.paymentsDao.findByIdForUser.mockResolvedValue(pendingPayment);
        dependencies.paymentGateway.confirmPaymentSuccess.mockResolvedValue(gatewayResult);
        dependencies.paymentsDao.updatePaymentForUser.mockImplementation(async (_paymentId, _userId, _role, payload) => createPayment({
            ...pendingPayment,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/payment-id/success`,
            headers: authHeaderFor(dependencies, user),
            body: {
                providerPaymentId: 'mock-payment-id',
                providerOrderId: 'mock-order-id'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.payment.status).toBe(PAYMENT_STATUSES.SUCCEEDED);
        expect(response.body.data.payment.gateway.status).toBe(PAYMENT_GATEWAY_STATUSES.SUCCEEDED);
        expect(response.body.data.payment.gateway.paymentId).toBe('mock-payment-id');
    });

    test('payment failure callback marks gateway payment failed', async () => {
        const user = createUser();
        const pendingPayment = createPayment({
            authUserId: user.id,
            role: user.role,
            method: PAYMENT_METHODS.CARD,
            status: PAYMENT_STATUSES.PENDING,
            gateway: {
                provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
                status: PAYMENT_GATEWAY_STATUSES.REQUIRES_ACTION,
                paymentIntentId: 'mock-intent-id'
            }
        });
        const gatewayResult = {
            provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
            status: PAYMENT_GATEWAY_STATUSES.FAILED,
            paymentIntentId: 'mock-intent-id',
            failureReason: 'Card declined',
            rawStatus: PAYMENT_GATEWAY_STATUSES.FAILED,
            lastEventAt: FIXED_NOW
        };

        dependencies.paymentsDao.findByIdForUser.mockResolvedValue(pendingPayment);
        dependencies.paymentGateway.markPaymentFailed.mockResolvedValue(gatewayResult);
        dependencies.paymentsDao.updatePaymentForUser.mockImplementation(async (_paymentId, _userId, _role, payload) => createPayment({
            ...pendingPayment,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/payment-id/failure`,
            headers: authHeaderFor(dependencies, user),
            body: {
                failureReason: 'Card declined',
                providerPaymentIntentId: 'mock-intent-id'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.payment.status).toBe(PAYMENT_STATUSES.FAILED);
        expect(response.body.data.payment.failureReason).toBe('Card declined');
        expect(response.body.data.payment.gateway.status).toBe(PAYMENT_GATEWAY_STATUSES.FAILED);
    });

    test('pay ride prevents duplicate successful payments', async () => {
        const user = createUser();

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(createRideBooking(user.role, {
            authUserId: user.id,
            role: user.role
        }));
        dependencies.paymentsDao.findSuccessfulByRideForUser.mockResolvedValue(createPayment({
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/pay`,
            headers: authHeaderFor(dependencies, user),
            body: {
                paymentMethod: PAYMENT_METHODS.UPI
            }
        });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('Ride payment is already completed');
        expect(dependencies.paymentsDao.create).not.toHaveBeenCalled();
    });

    test('history returns payment ledger with filters', async () => {
        const user = createUser();

        dependencies.paymentsDao.findHistoryForUser.mockResolvedValue([
            createPayment({
                authUserId: user.id,
                role: user.role
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/history?status=${PAYMENT_STATUSES.SUCCEEDED}&limit=5`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.history[0].paymentCode).toBe('PAY-GR-TEST-0001');
        expect(response.body.data.summary.totalPaid).toBe(350);
        expect(dependencies.paymentsDao.findHistoryForUser).toHaveBeenCalledWith(user.id, user.role, {
            status: PAYMENT_STATUSES.SUCCEEDED,
            limit: 5
        });
    });

    test('payment details can be fetched by id', async () => {
        const user = createUser();

        dependencies.paymentsDao.findByIdForUser.mockResolvedValue(createPayment({
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/payment-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.payment.paymentCode).toBe('PAY-GR-TEST-0001');
        expect(response.body.data.payment.ride.driver.fullName).toBe('Rajesh Kumar');
        expect(dependencies.paymentsDao.findByIdForUser).toHaveBeenCalledWith('payment-id', user.id, user.role);
    });

    test('refund request marks successful payments for review', async () => {
        const user = createUser();
        const payment = createPayment({
            authUserId: user.id,
            role: user.role
        });

        dependencies.paymentsDao.findByIdForUser.mockResolvedValue(payment);
        dependencies.paymentsDao.requestRefund.mockImplementation(async (_paymentId, _userId, _role, refund) => createPayment({
            ...payment,
            status: PAYMENT_STATUSES.REFUND_REQUESTED,
            refund,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/payment-id/refund`,
            headers: authHeaderFor(dependencies, user),
            body: {
                reason: PAYMENT_REFUND_REASONS.OVERCHARGED,
                note: 'Fare was higher than expected',
                amount: 120
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.refund.status).toBe(PAYMENT_STATUSES.REFUND_REQUESTED);
        expect(response.body.data.refund.reason).toBe(PAYMENT_REFUND_REASONS.OVERCHARGED);
        expect(response.body.data.refund.amount).toBe(120);
        expect(dependencies.paymentsDao.requestRefund).toHaveBeenCalledWith(
            'payment-id',
            user.id,
            user.role,
            expect.objectContaining({
                reason: PAYMENT_REFUND_REASONS.OVERCHARGED,
                amount: 120
            })
        );
    });

    test('refund request can resolve provider refunds immediately', async () => {
        const user = createUser();
        const payment = createPayment({
            authUserId: user.id,
            role: user.role,
            method: PAYMENT_METHODS.CARD,
            gateway: {
                provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
                status: PAYMENT_GATEWAY_STATUSES.SUCCEEDED,
                paymentIntentId: 'mock-intent-id',
                paymentId: 'mock-payment-id'
            }
        });

        dependencies.paymentsDao.findByIdForUser.mockResolvedValue(payment);
        dependencies.paymentGateway.createRefund.mockResolvedValue({
            provider: PAYMENT_GATEWAY_PROVIDERS.MOCK,
            refundId: 'mock-refund-id',
            status: PAYMENT_GATEWAY_STATUSES.REFUNDED,
            rawStatus: PAYMENT_GATEWAY_STATUSES.REFUNDED
        });
        dependencies.paymentsDao.updatePaymentForUser.mockImplementation(async (_paymentId, _userId, _role, payload) => createPayment({
            ...payment,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/payment-id/refund`,
            headers: authHeaderFor(dependencies, user),
            body: {
                reason: PAYMENT_REFUND_REASONS.DUPLICATE_PAYMENT,
                amount: 80
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.payment.status).toBe(PAYMENT_STATUSES.REFUNDED);
        expect(response.body.data.refund.gateway.refundId).toBe('mock-refund-id');
        expect(dependencies.paymentGateway.createRefund).toHaveBeenCalledWith(payment, {
            amount: 80,
            reason: PAYMENT_REFUND_REASONS.DUPLICATE_PAYMENT
        });
    });

    test('missing rides return not found during payment', async () => {
        const user = createUser();

        dependencies.ridesDao.findByIdForUser.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/missing-ride/pay`,
            headers: authHeaderFor(dependencies, user),
            body: {
                paymentMethod: PAYMENT_METHODS.PERSONAL_WALLET
            }
        });

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('Ride not found');
    });

    test('payments routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/methods`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('payments routes return validation errors for invalid methods', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/rides/ride-id/pay`,
            headers: authHeaderFor(dependencies, user),
            body: {
                paymentMethod: 'barter'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
