import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
import {
    PAYMENT_CURRENCY,
    PAYMENT_METHOD_CATALOG,
    PAYMENT_METHODS,
    PAYMENT_STATUSES,
    PAYMENT_WALLET_OPENING_BALANCE
} from './payments.constants.js';
import {
    toPublicPayment,
    toPublicPaymentHistoryItem,
    toPublicPaymentMethod,
    toPublicRefund,
    toPublicWallet
} from './dto/payments.dto.js';

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
                methods: PAYMENT_METHOD_CATALOG.map((method) => toPublicPaymentMethod(method, wallet))
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

        const paymentMethod = this.resolvePaymentMethod(payload.paymentMethod);
        const wallet = this.buildWalletSummary();
        const fareAmount = roundMoney(rideObject.fareSnapshot?.totalFare || 0);
        const tipAmount = roundMoney(payload.tipAmount || 0);
        const discountAmount = roundMoney(payload.discountAmount || 0);
        const amount = roundMoney(Math.max(0, fareAmount + tipAmount - discountAmount));

        if (paymentMethod.code === PAYMENT_METHODS.PERSONAL_WALLET && amount > wallet.availableBalance) {
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
            status: isCashPayment ? PAYMENT_STATUSES.PENDING : PAYMENT_STATUSES.SUCCEEDED,
            currency: PAYMENT_CURRENCY,
            fareAmount,
            tipAmount,
            discountAmount,
            amount,
            walletBalanceBefore: paymentMethod.code === PAYMENT_METHODS.PERSONAL_WALLET ? wallet.availableBalance : undefined,
            walletBalanceAfter: paymentMethod.code === PAYMENT_METHODS.PERSONAL_WALLET
                ? roundMoney(wallet.availableBalance - amount)
                : undefined,
            gatewayReference: createGatewayReference(paymentMethod.code, this.now()),
            idempotencyKey: payload.idempotencyKey,
            capturedAt: isCashPayment ? null : this.now(),
            refundableUntil: isCashPayment ? null : addDays(this.now(), 7)
        });

        return buildSuccessResponse({
            statusCode: 201,
            message: isCashPayment ? 'Cash payment recorded successfully' : 'Ride payment completed successfully',
            data: {
                payment: toPublicPayment(toPlainObject(payment)),
                guidance: this.buildPaymentGuidance(paymentMethod.code, amount)
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

        const refundAmount = roundMoney(payload.amount || payment.amount);

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
        return PAYMENT_METHOD_CATALOG.find((method) => method.code === methodCode)
            || PAYMENT_METHOD_CATALOG.find((method) => method.code === PAYMENT_METHODS.PERSONAL_WALLET);
    }

    buildWalletSummary() {
        return {
            currency: PAYMENT_CURRENCY,
            openingBalance: PAYMENT_WALLET_OPENING_BALANCE,
            availableBalance: PAYMENT_WALLET_OPENING_BALANCE,
            reservedBalance: 0,
            lowBalance: PAYMENT_WALLET_OPENING_BALANCE < 200,
            message: 'Wallet balance is available for instant ride payments and faster refunds'
        };
    }

    buildHistorySummary(payments, query) {
        return {
            resultCount: payments.length,
            filters: {
                status: query.status || null
            },
            totalPaid: roundMoney(payments
                .filter((payment) => payment.status === PAYMENT_STATUSES.SUCCEEDED)
                .reduce((sum, payment) => sum + (payment.amount || 0), 0)),
            refundableCount: payments.filter((payment) => (
                payment.status === PAYMENT_STATUSES.SUCCEEDED
                && (!payment.refundableUntil || new Date(payment.refundableUntil) >= this.now())
            )).length
        };
    }

    toRideSnapshot(ride) {
        return {
            bookingCode: ride.bookingCode,
            pickup: ride.pickup,
            dropoff: ride.dropoff,
            vehicleType: ride.vehicleType,
            driver: {
                driverId: ride.selectedDriver?.driverId || null,
                fullName: ride.selectedDriver?.fullName || null,
                vehicleName: ride.selectedDriver?.vehicleName || null,
                vehicleNumber: ride.selectedDriver?.vehicleNumber || null
            }
        };
    }

    buildPaymentGuidance(methodCode, amount) {
        if (methodCode === PAYMENT_METHODS.CASH) {
            return 'Cash payment is pending until the driver collects it at ride completion';
        }

        if (methodCode === PAYMENT_METHODS.PERSONAL_WALLET) {
            return `Wallet paid ${PAYMENT_CURRENCY} ${amount}. Refunds can return to wallet faster when eligible`;
        }

        return 'Digital payment is captured with a ride-linked receipt and refund tracking';
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

const roundMoney = (value) => Number((value || 0).toFixed(2));

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const createPaymentCode = (date) => `PAY-GR-${date.getTime()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const createGatewayReference = (methodCode, date) => `${methodCode.toUpperCase()}-${date.getTime()}`;
