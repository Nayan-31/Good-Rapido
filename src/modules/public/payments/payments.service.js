import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
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

export default class PaymentsService {
    constructor({ paymentsDao, ridesDao, now = () => new Date() }) {
        this.paymentsDao = paymentsDao;
        this.ridesDao = ridesDao;
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

        if (paymentMethod.code === PAYMENT_METHODS.PERSONAL_WALLET && !wallet.hasSufficientBalance) {
            throw AppError.badRequest('Insufficient wallet balance');
        }

        const isCashPayment = paymentMethod.code === PAYMENT_METHODS.CASH;
        const payment = await this.paymentsDao.create({
            paymentCode: createPaymentCode(this.now()),
            authUserId: userId,
            role,
            rideId: getId(rideObject),
            rideSnapshot: this.toRideSnapshot(rideObject),
            method: paymentMethod.code,
            status: settlement.paymentStatus,
            currency: paymentIntent.currency,
            fareAmount: breakdown.fareAmount,
            tipAmount: breakdown.tipAmount,
            discountAmount: breakdown.discountAmount,
            amount: breakdown.amount,
            walletBalanceBefore: wallet.before ?? undefined,
            walletBalanceAfter: wallet.after ?? undefined,
            gatewayReference: capture.gatewayReference,
            idempotencyKey: payload.idempotencyKey,
            capturedAt: capture.capturedAt,
            refundableUntil: capture.refundableUntil
        });

        return buildSuccessResponse({
            statusCode: 201,
            message: isCashPayment ? 'Cash payment recorded successfully' : 'Ride payment completed successfully',
            data: {
                payment: toPublicPayment(toPlainObject(payment)),
                guidance: paymentIntent.guidance
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

        const updatedPayment = await this.paymentsDao.requestRefund(paymentId, userId, role, {
            reason: payload.reason,
            note: payload.note,
            amount: refundAmount,
            requestedAt: this.now()
        });

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
