import {
    PAYMENT_ENGINE_CAPTURE_TYPES,
    PAYMENT_ENGINE_CURRENCY,
    PAYMENT_ENGINE_INTENT_STATUSES,
    PAYMENT_ENGINE_LOW_WALLET_BALANCE_THRESHOLD,
    PAYMENT_ENGINE_METHOD_CATALOG,
    PAYMENT_ENGINE_METHODS,
    PAYMENT_ENGINE_REFUND_ELIGIBILITY,
    PAYMENT_ENGINE_REFUND_WINDOW_DAYS,
    PAYMENT_ENGINE_STATUSES,
    PAYMENT_ENGINE_WALLET_OPENING_BALANCE
} from './payment-engine.constants.js';

export const buildPaymentIntent = ({
    rideId,
    paymentMethod,
    fareAmount = 0,
    tipAmount = 0,
    discountAmount = 0,
    walletBalance,
    requestedAt = new Date()
} = {}) => {
    const method = resolvePaymentMethod(paymentMethod);
    const wallet = buildWalletSummary({
        availableBalance: walletBalance
    });
    const breakdown = calculatePaymentBreakdown({
        fareAmount,
        tipAmount,
        discountAmount
    });
    const walletEffect = calculateWalletEffect({
        methodCode: method.code,
        amount: breakdown.amount,
        walletBalance: wallet.availableBalance
    });
    const settlement = buildSettlementPlan({
        methodCode: method.code,
        amount: breakdown.amount,
        hasSufficientBalance: walletEffect.hasSufficientBalance
    });
    const capture = buildCapturePlan({
        methodCode: method.code,
        settlement,
        requestedAt
    });

    return {
        rideId: rideId || null,
        method,
        currency: PAYMENT_ENGINE_CURRENCY,
        breakdown,
        wallet: {
            ...wallet,
            before: walletEffect.before,
            after: walletEffect.after,
            hasSufficientBalance: walletEffect.hasSufficientBalance
        },
        settlement,
        capture,
        guidance: buildPaymentGuidance(method.code, breakdown.amount, {
            walletEffect,
            settlement
        })
    };
};

export const buildWalletSummary = ({
    openingBalance = PAYMENT_ENGINE_WALLET_OPENING_BALANCE,
    availableBalance = openingBalance,
    reservedBalance = 0
} = {}) => {
    const normalizedAvailableBalance = roundMoney(availableBalance);

    return {
        currency: PAYMENT_ENGINE_CURRENCY,
        openingBalance: roundMoney(openingBalance),
        availableBalance: normalizedAvailableBalance,
        reservedBalance: roundMoney(reservedBalance),
        lowBalance: normalizedAvailableBalance < PAYMENT_ENGINE_LOW_WALLET_BALANCE_THRESHOLD,
        message: 'Wallet balance is available for instant ride payments and faster refunds'
    };
};

export const calculatePaymentBreakdown = ({
    fareAmount = 0,
    tipAmount = 0,
    discountAmount = 0
} = {}) => {
    const normalizedFareAmount = roundMoney(fareAmount);
    const normalizedTipAmount = roundMoney(tipAmount);
    const normalizedDiscountAmount = roundMoney(discountAmount);

    return {
        fareAmount: normalizedFareAmount,
        tipAmount: normalizedTipAmount,
        discountAmount: normalizedDiscountAmount,
        amount: roundMoney(Math.max(0, normalizedFareAmount + normalizedTipAmount - normalizedDiscountAmount))
    };
};

export const calculateWalletEffect = ({
    methodCode,
    amount = 0,
    walletBalance = PAYMENT_ENGINE_WALLET_OPENING_BALANCE
} = {}) => {
    if (methodCode !== PAYMENT_ENGINE_METHODS.PERSONAL_WALLET) {
        return {
            before: null,
            after: null,
            hasSufficientBalance: true
        };
    }

    const before = roundMoney(walletBalance);
    const normalizedAmount = roundMoney(amount);

    return {
        before,
        after: roundMoney(Math.max(0, before - normalizedAmount)),
        hasSufficientBalance: normalizedAmount <= before
    };
};

export const buildSettlementPlan = ({
    methodCode,
    amount = 0,
    hasSufficientBalance = true
} = {}) => {
    if (!hasSufficientBalance) {
        return {
            intentStatus: PAYMENT_ENGINE_INTENT_STATUSES.INSUFFICIENT_FUNDS,
            paymentStatus: PAYMENT_ENGINE_STATUSES.FAILED,
            captureType: PAYMENT_ENGINE_CAPTURE_TYPES.BLOCKED,
            amount: roundMoney(amount),
            requiresCollection: false,
            supportsRefund: false
        };
    }

    if (methodCode === PAYMENT_ENGINE_METHODS.CASH) {
        return {
            intentStatus: PAYMENT_ENGINE_INTENT_STATUSES.PENDING_COLLECTION,
            paymentStatus: PAYMENT_ENGINE_STATUSES.PENDING,
            captureType: PAYMENT_ENGINE_CAPTURE_TYPES.CASH_COLLECTION,
            amount: roundMoney(amount),
            requiresCollection: true,
            supportsRefund: false
        };
    }

    return {
        intentStatus: PAYMENT_ENGINE_INTENT_STATUSES.READY_TO_CAPTURE,
        paymentStatus: PAYMENT_ENGINE_STATUSES.SUCCEEDED,
        captureType: PAYMENT_ENGINE_CAPTURE_TYPES.INSTANT,
        amount: roundMoney(amount),
        requiresCollection: false,
        supportsRefund: true
    };
};

export const buildCapturePlan = ({
    methodCode,
    settlement = {},
    requestedAt = new Date()
} = {}) => {
    const normalizedRequestedAt = normalizeDate(requestedAt);
    const shouldCapture = settlement.paymentStatus === PAYMENT_ENGINE_STATUSES.SUCCEEDED;

    return {
        shouldCapture,
        capturedAt: shouldCapture ? normalizedRequestedAt : null,
        refundableUntil: shouldCapture && methodCode !== PAYMENT_ENGINE_METHODS.CASH
            ? addDays(normalizedRequestedAt, PAYMENT_ENGINE_REFUND_WINDOW_DAYS)
            : null,
        gatewayReference: createGatewayReference(methodCode, normalizedRequestedAt)
    };
};

export const calculateRefundPreview = ({
    payment = {},
    reason,
    note,
    amount,
    requestedAt = new Date()
} = {}) => {
    const normalizedPayment = normalizePaymentForRefund(payment);
    const refundAmount = roundMoney(amount || normalizedPayment.amount);
    const eligibility = resolveRefundEligibility({
        payment: normalizedPayment,
        refundAmount,
        requestedAt
    });

    return {
        paymentId: getId(payment),
        paymentCode: payment.paymentCode || null,
        status: eligibility,
        eligible: eligibility === PAYMENT_ENGINE_REFUND_ELIGIBILITY.ELIGIBLE,
        reason: reason || null,
        note: trimToNull(note),
        amount: refundAmount,
        currency: normalizedPayment.currency,
        requestedAt: normalizeDate(requestedAt),
        refundableUntil: normalizedPayment.refundableUntil,
        guidance: buildRefundGuidance(eligibility)
    };
};

export const buildPaymentHistorySummary = (payments = [], query = {}, now = new Date()) => ({
    resultCount: payments.length,
    filters: {
        status: query.status || null
    },
    totalPaid: roundMoney(payments
        .filter((payment) => payment.status === PAYMENT_ENGINE_STATUSES.SUCCEEDED)
        .reduce((sum, payment) => sum + (payment.amount || 0), 0)),
    refundableCount: payments.filter((payment) => (
        payment.status === PAYMENT_ENGINE_STATUSES.SUCCEEDED
        && (!payment.refundableUntil || new Date(payment.refundableUntil) >= normalizeDate(now))
    )).length
});

export const buildRidePaymentSnapshot = (ride = {}) => ({
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
});

export const resolvePaymentMethod = (methodCode) => (
    PAYMENT_ENGINE_METHOD_CATALOG.find((method) => method.code === methodCode)
    || PAYMENT_ENGINE_METHOD_CATALOG.find((method) => method.code === PAYMENT_ENGINE_METHODS.PERSONAL_WALLET)
);

export const buildPaymentGuidance = (methodCode, amount, { walletEffect = {}, settlement = {} } = {}) => {
    if (settlement.intentStatus === PAYMENT_ENGINE_INTENT_STATUSES.INSUFFICIENT_FUNDS) {
        return 'Wallet balance is insufficient for this ride payment';
    }

    if (methodCode === PAYMENT_ENGINE_METHODS.CASH) {
        return 'Cash payment is pending until the driver collects it at ride completion';
    }

    if (methodCode === PAYMENT_ENGINE_METHODS.PERSONAL_WALLET) {
        return `Wallet paid ${PAYMENT_ENGINE_CURRENCY} ${amount}. Refunds can return to wallet faster when eligible`;
    }

    return 'Digital payment is captured with a ride-linked receipt and refund tracking';
};

export const createPaymentCode = (date = new Date()) => (
    `PAY-GR-${normalizeDate(date).getTime()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
);

export const createGatewayReference = (methodCode, date = new Date()) => (
    `${resolvePaymentMethod(methodCode).code.toUpperCase()}-${normalizeDate(date).getTime()}`
);

export const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

const resolveRefundEligibility = ({ payment, refundAmount, requestedAt }) => {
    if (payment.status !== PAYMENT_ENGINE_STATUSES.SUCCEEDED) {
        return PAYMENT_ENGINE_REFUND_ELIGIBILITY.NOT_SUCCESSFUL;
    }

    if (payment.refund) {
        return PAYMENT_ENGINE_REFUND_ELIGIBILITY.ALREADY_REQUESTED;
    }

    if (payment.refundableUntil && new Date(payment.refundableUntil) < normalizeDate(requestedAt)) {
        return PAYMENT_ENGINE_REFUND_ELIGIBILITY.WINDOW_EXPIRED;
    }

    if (refundAmount > payment.amount) {
        return PAYMENT_ENGINE_REFUND_ELIGIBILITY.AMOUNT_EXCEEDS_PAYMENT;
    }

    return PAYMENT_ENGINE_REFUND_ELIGIBILITY.ELIGIBLE;
};

const normalizePaymentForRefund = (payment = {}) => ({
    amount: roundMoney(payment.amount),
    currency: payment.currency || PAYMENT_ENGINE_CURRENCY,
    status: payment.status || PAYMENT_ENGINE_STATUSES.PENDING,
    refund: payment.refund || null,
    refundableUntil: payment.refundableUntil || null
});

const buildRefundGuidance = (eligibility) => {
    if (eligibility === PAYMENT_ENGINE_REFUND_ELIGIBILITY.ELIGIBLE) {
        return 'Refund can be submitted for review';
    }

    if (eligibility === PAYMENT_ENGINE_REFUND_ELIGIBILITY.NOT_SUCCESSFUL) {
        return 'Only successful payments can be refunded';
    }

    if (eligibility === PAYMENT_ENGINE_REFUND_ELIGIBILITY.ALREADY_REQUESTED) {
        return 'Refund is already requested for this payment';
    }

    if (eligibility === PAYMENT_ENGINE_REFUND_ELIGIBILITY.WINDOW_EXPIRED) {
        return 'Refund window has expired for this payment';
    }

    return 'Refund amount cannot be greater than payment amount';
};

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const normalizeDate = (value) => value instanceof Date ? value : new Date(value);

const trimToNull = (value) => {
    if (typeof value !== 'string') {
        return value || null;
    }

    return value.trim() || null;
};

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
