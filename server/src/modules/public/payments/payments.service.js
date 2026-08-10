import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
    PAYMENT_GATEWAY_STATUSES,
    PAYMENT_METHODS,
    PAYMENT_STATUSES
} from './payments.constants.js';
import {
    toPublicPayment,
    toPublicPaymentHistoryItem,
    toPublicPaymentMethod,
    toPublicRefund,
    toPublicWallet
} from './dto/payments.dto.js';
import {
    buildPaymentGuidance as buildCorePaymentGuidance,
    buildPaymentHistorySummary,
    buildPaymentIntent,
    buildRidePaymentSnapshot,
    buildWalletSummary as buildCoreWalletSummary,
    calculateRefundPreview,
    createPaymentCode,
    resolvePaymentMethod as resolveCorePaymentMethod
} from '../../core/payment-engine/payment-engine.engine.js';
import { PAYMENT_ENGINE_METHOD_CATALOG } from '../../core/payment-engine/payment-engine.constants.js';
import PaymentGatewayService from './payments.gateway.js';

export default class PaymentsService {
    constructor({ paymentsDao, ridesDao, now = () => new Date(), paymentGateway = new PaymentGatewayService({ now }) }) {
        this.paymentsDao = paymentsDao;
        this.ridesDao = ridesDao;
        this.paymentGateway = paymentGateway;
        this.now = now;
    }

    async listMethods(authContext) {
        this.assertAuthContext(authContext);
        const wallet = this.buildWalletSummary();

        return buildSuccessResponse({
            message: 'Payment methods fetched successfully',
            data: {
                wallet: toPublicWallet(wallet),
                methods: PAYMENT_ENGINE_METHOD_CATALOG.map((method) => toPublicPaymentMethod(method, wallet))
            }
        });
    }

    async getWallet(authContext) {
        this.assertAuthContext(authContext);

        return buildSuccessResponse({
            message: 'Wallet fetched successfully',
            data: {
                wallet: toPublicWallet(this.buildWalletSummary())
            }
        });
    }

    async history(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const payments = await this.paymentsDao.findHistoryForUser(userId, role, query);

        return buildSuccessResponse({
            message: 'Payment history fetched successfully',
            data: {
                history: payments.map((payment) => toPublicPaymentHistoryItem(toPlainObject(payment))),
                summary: this.buildHistorySummary(payments.map(toPlainObject), query)
            }
        });
    }

    async getPayment(authContext, paymentId) {
        const payment = await this.findPayment(authContext, paymentId);

        return buildSuccessResponse({
            message: 'Payment fetched successfully',
            data: {
                payment: toPublicPayment(payment)
            }
        });
    }

    async payRide(authContext, rideId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const ride = await this.ridesDao.findByIdForUser(rideId, userId, role);

        if (!ride) {
            throw AppError.notFound('Ride not found');
        }

        const rideObject = toPlainObject(ride);

        if (rideObject.status !== RIDE_BOOKING_STATUSES.CONFIRMED) {
            throw AppError.badRequest('Only confirmed rides can be paid');
        }

        const existingPayment = await this.paymentsDao.findSuccessfulByRideForUser(rideId, userId, role);

        if (existingPayment) {
            throw AppError.conflict('Ride payment is already completed');
        }

        const paymentIntent = buildPaymentIntent({
            rideId: getId(rideObject),
            paymentMethod: payload.paymentMethod,
            fareAmount: rideObject.fareSnapshot?.totalFare || 0,
            tipAmount: payload.tipAmount || 0,
            discountAmount: payload.discountAmount || 0,
            requestedAt: this.now()
        });
        const paymentMethod = paymentIntent.method;
        const { breakdown, wallet, settlement, capture } = paymentIntent;
        const paymentCode = createPaymentCode(this.now());
        const rideSnapshot = this.toRideSnapshot(rideObject);

        if (paymentMethod.code === PAYMENT_METHODS.PERSONAL_WALLET && !wallet.hasSufficientBalance) {
            throw AppError.badRequest('Insufficient wallet balance');
        }

        const isCashPayment = paymentMethod.code === PAYMENT_METHODS.CASH;
        const isGatewayPayment = isGatewayPaymentMethod(paymentMethod.code);
        const gatewaySession = isGatewayPayment
            ? await this.paymentGateway.createPaymentSession({
                paymentCode,
                amount: breakdown.amount,
                currency: paymentIntent.currency,
                paymentMethod: paymentMethod.code,
                rideSnapshot
            })
            : null;
        const payment = await this.paymentsDao.create({
            paymentCode,
            authUserId: userId,
            role,
            rideId: getId(rideObject),
            rideSnapshot,
            method: paymentMethod.code,
            status: isGatewayPayment ? PAYMENT_STATUSES.PENDING : settlement.paymentStatus,
            currency: paymentIntent.currency,
            fareAmount: breakdown.fareAmount,
            tipAmount: breakdown.tipAmount,
            discountAmount: breakdown.discountAmount,
            amount: breakdown.amount,
            walletBalanceBefore: wallet.before ?? undefined,
            walletBalanceAfter: wallet.after ?? undefined,
            gatewayReference: gatewaySession?.gatewayReference || capture.gatewayReference,
            gateway: gatewaySession ? toGatewayPayload(gatewaySession) : {
                status: PAYMENT_GATEWAY_STATUSES.NOT_REQUIRED,
                lastEventAt: this.now()
            },
            idempotencyKey: payload.idempotencyKey,
            capturedAt: isGatewayPayment ? null : capture.capturedAt,
            refundableUntil: isGatewayPayment ? null : capture.refundableUntil
        });

        return buildSuccessResponse({
            statusCode: 201,
            message: resolvePaymentCreateMessage({ isCashPayment, isGatewayPayment }),
            data: {
                payment: toPublicPayment(toPlainObject(payment)),
                guidance: isGatewayPayment
                    ? 'Payment session created. Confirm success or failure after provider checkout callback.'
                    : paymentIntent.guidance
            }
        });
    }

    async confirmPaymentSuccess(authContext, paymentId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const payment = await this.findPayment(authContext, paymentId);

        if (payment.status === PAYMENT_STATUSES.SUCCEEDED) {
            throw AppError.conflict('Payment is already successful');
        }

        if (!isGatewayPaymentRecord(payment)) {
            throw AppError.badRequest('Payment does not require gateway confirmation');
        }

        const gatewayResult = await this.paymentGateway.confirmPaymentSuccess(payment, payload);
        const capturedAt = this.now();
        const updatedPayment = await this.paymentsDao.updatePaymentForUser(paymentId, userId, role, {
            status: PAYMENT_STATUSES.SUCCEEDED,
            failureReason: null,
            gatewayReference: gatewayResult.gatewayReference || payment.gatewayReference,
            gateway: {
                ...payment.gateway,
                ...toGatewayPayload(gatewayResult),
                status: PAYMENT_GATEWAY_STATUSES.SUCCEEDED
            },
            capturedAt,
            refundableUntil: addDays(capturedAt, 7)
        });

        if (!updatedPayment) {
            throw AppError.notFound('Payment not found');
        }

        return buildSuccessResponse({
            message: 'Payment marked successful successfully',
            data: {
                payment: toPublicPayment(toPlainObject(updatedPayment))
            }
        });
    }

    async markPaymentFailed(authContext, paymentId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const payment = await this.findPayment(authContext, paymentId);

        if (payment.status === PAYMENT_STATUSES.SUCCEEDED) {
            throw AppError.badRequest('Successful payments cannot be marked failed');
        }

        const gatewayResult = await this.paymentGateway.markPaymentFailed(payment, payload);
        const updatedPayment = await this.paymentsDao.updatePaymentForUser(paymentId, userId, role, {
            status: PAYMENT_STATUSES.FAILED,
            failureReason: gatewayResult.failureReason,
            gateway: {
                ...payment.gateway,
                ...toGatewayPayload(gatewayResult),
                status: PAYMENT_GATEWAY_STATUSES.FAILED
            }
        });

        if (!updatedPayment) {
            throw AppError.notFound('Payment not found');
        }

        return buildSuccessResponse({
            message: 'Payment marked failed successfully',
            data: {
                payment: toPublicPayment(toPlainObject(updatedPayment))
            }
        });
    }

    async requestRefund(authContext, paymentId, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const payment = await this.findPayment(authContext, paymentId);

        if (payment.status !== PAYMENT_STATUSES.SUCCEEDED) {
            throw AppError.badRequest('Only successful payments can be refunded');
        }

        if (payment.refund) {
            throw AppError.badRequest('Refund is already requested for this payment');
        }

        if (payment.refundableUntil && new Date(payment.refundableUntil) < this.now()) {
            throw AppError.badRequest('Refund window has expired for this payment');
        }

        const refundPreview = calculateRefundPreview({
            payment,
            ...payload,
            requestedAt: this.now()
        });
        const refundAmount = refundPreview.amount;

        if (refundAmount > payment.amount) {
            throw AppError.badRequest('Refund amount cannot be greater than payment amount');
        }

        const gatewayRefund = isGatewayPaymentRecord(payment)
            ? await this.paymentGateway.createRefund(payment, {
                amount: refundAmount,
                reason: payload.reason
            })
            : null;
        const nextRefundStatus = gatewayRefund?.status === PAYMENT_GATEWAY_STATUSES.REFUNDED
            ? PAYMENT_STATUSES.REFUNDED
            : PAYMENT_STATUSES.REFUND_REQUESTED;
        const refundPayload = {
            reason: payload.reason,
            note: payload.note,
            amount: refundAmount,
            requestedAt: this.now(),
            resolvedAt: nextRefundStatus === PAYMENT_STATUSES.REFUNDED ? this.now() : undefined,
            gatewayProvider: gatewayRefund?.provider,
            gatewayRefundId: gatewayRefund?.refundId,
            gatewayStatus: gatewayRefund?.status,
            gatewayFailureReason: gatewayRefund?.status === PAYMENT_GATEWAY_STATUSES.FAILED
                ? (gatewayRefund.rawStatus || 'Gateway refund failed')
                : undefined
        };
        const updatedPayment = gatewayRefund
            ? await this.paymentsDao.updatePaymentForUser(paymentId, userId, role, {
                status: nextRefundStatus,
                refund: refundPayload,
                gateway: {
                    ...payment.gateway,
                    status: gatewayRefund.status,
                    rawStatus: gatewayRefund.rawStatus || gatewayRefund.status,
                    lastEventAt: this.now()
                }
            })
            : await this.paymentsDao.requestRefund(paymentId, userId, role, refundPayload);

        if (!updatedPayment) {
            throw AppError.notFound('Payment not found');
        }

        return buildSuccessResponse({
            message: 'Refund request submitted successfully',
            data: {
                refund: toPublicRefund(toPlainObject(updatedPayment)),
                payment: toPublicPayment(toPlainObject(updatedPayment))
            }
        });
    }

    async findPayment(authContext, paymentId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const payment = await this.paymentsDao.findByIdForUser(paymentId, userId, role);

        if (!payment) {
            throw AppError.notFound('Payment not found');
        }

        return toPlainObject(payment);
    }

    resolvePaymentMethod(methodCode) {
        return resolveCorePaymentMethod(methodCode);
    }

    buildWalletSummary() {
        return buildCoreWalletSummary();
    }

    buildHistorySummary(payments, query) {
        return buildPaymentHistorySummary(payments, query, this.now());
    }

    toRideSnapshot(ride) {
        return buildRidePaymentSnapshot(ride);
    }

    buildPaymentGuidance(methodCode, amount) {
        return buildCorePaymentGuidance(methodCode, amount);
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const getId = (document) => document._id?.toString?.() || document.id;

const isGatewayPaymentMethod = (methodCode) => [
    PAYMENT_METHODS.UPI,
    PAYMENT_METHODS.CARD
].includes(methodCode);

const isGatewayPaymentRecord = (payment = {}) => Boolean(
    payment.gateway
    && payment.gateway.status
    && payment.gateway.status !== PAYMENT_GATEWAY_STATUSES.NOT_REQUIRED
);

const toGatewayPayload = (gateway = {}) => ({
    provider: gateway.provider,
    status: gateway.status,
    orderId: gateway.orderId,
    paymentIntentId: gateway.paymentIntentId,
    paymentId: gateway.paymentId,
    checkoutId: gateway.checkoutId,
    clientSecret: gateway.clientSecret,
    publicKey: gateway.publicKey,
    paymentUrl: gateway.paymentUrl,
    failureReason: gateway.failureReason,
    rawStatus: gateway.rawStatus,
    lastEventAt: gateway.lastEventAt
});

const resolvePaymentCreateMessage = ({ isCashPayment, isGatewayPayment }) => {
    if (isCashPayment) {
        return 'Cash payment recorded successfully';
    }

    if (isGatewayPayment) {
        return 'Payment session created successfully';
    }

    return 'Ride payment completed successfully';
};

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
