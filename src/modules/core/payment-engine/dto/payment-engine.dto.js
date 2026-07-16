import {
    PAYMENT_ENGINE_CAPTURE_TYPES,
    PAYMENT_ENGINE_CURRENCY,
    PAYMENT_ENGINE_FLOW_TYPES,
    PAYMENT_ENGINE_INTENT_STATUSES,
    PAYMENT_ENGINE_METHOD_CATALOG,
    PAYMENT_ENGINE_METHODS,
    PAYMENT_ENGINE_REFUND_ELIGIBILITY,
    PAYMENT_ENGINE_REFUND_REASONS,
    PAYMENT_ENGINE_STATUSES
} from '../payment-engine.constants.js';

export const toPaymentEngineOptions = (wallet = {}) => ({
    currency: PAYMENT_ENGINE_CURRENCY,
    methods: PAYMENT_ENGINE_METHOD_CATALOG.map((method) => toPaymentMethod(method, wallet)),
    statuses: Object.values(PAYMENT_ENGINE_STATUSES),
    refundReasons: Object.values(PAYMENT_ENGINE_REFUND_REASONS),
    flowTypes: Object.values(PAYMENT_ENGINE_FLOW_TYPES),
    intentStatuses: Object.values(PAYMENT_ENGINE_INTENT_STATUSES),
    captureTypes: Object.values(PAYMENT_ENGINE_CAPTURE_TYPES),
    refundEligibility: Object.values(PAYMENT_ENGINE_REFUND_ELIGIBILITY)
});

export const toPaymentEngineIntent = (intent = {}) => ({
    rideId: intent.rideId || null,
    method: toPaymentMethod(intent.method, intent.wallet),
    currency: intent.currency || PAYMENT_ENGINE_CURRENCY,
    breakdown: toPaymentBreakdown(intent.breakdown),
    wallet: toPaymentWallet(intent.wallet),
    settlement: toPaymentSettlement(intent.settlement),
    capture: toPaymentCapture(intent.capture),
    guidance: intent.guidance || null
});

export const toPaymentEngineRefundPreview = (preview = {}) => ({
    paymentId: preview.paymentId || null,
    paymentCode: preview.paymentCode || null,
    status: preview.status || PAYMENT_ENGINE_REFUND_ELIGIBILITY.NOT_SUCCESSFUL,
    eligible: Boolean(preview.eligible),
    reason: preview.reason || null,
    note: preview.note || null,
    amount: numberOrZero(preview.amount),
    currency: preview.currency || PAYMENT_ENGINE_CURRENCY,
    requestedAt: preview.requestedAt || null,
    refundableUntil: preview.refundableUntil || null,
    guidance: preview.guidance || null
});

const toPaymentMethod = (method = {}, wallet = {}) => ({
    code: method.code || PAYMENT_ENGINE_METHODS.PERSONAL_WALLET,
    label: method.label || null,
    type: method.type || null,
    isDefault: Boolean(method.isDefault),
    supportsRefund: Boolean(method.supportsRefund),
    settlementSpeed: method.settlementSpeed || null,
    description: method.description || null,
    balance: method.code === PAYMENT_ENGINE_METHODS.PERSONAL_WALLET
        ? numberOrZero(wallet.availableBalance)
        : null
});

const toPaymentBreakdown = (breakdown = {}) => ({
    fareAmount: numberOrZero(breakdown.fareAmount),
    tipAmount: numberOrZero(breakdown.tipAmount),
    discountAmount: numberOrZero(breakdown.discountAmount),
    amount: numberOrZero(breakdown.amount)
});

const toPaymentWallet = (wallet = {}) => ({
    currency: wallet.currency || PAYMENT_ENGINE_CURRENCY,
    openingBalance: numberOrZero(wallet.openingBalance),
    availableBalance: numberOrZero(wallet.availableBalance),
    reservedBalance: numberOrZero(wallet.reservedBalance),
    lowBalance: Boolean(wallet.lowBalance),
    before: nullableNumber(wallet.before),
    after: nullableNumber(wallet.after),
    hasSufficientBalance: wallet.hasSufficientBalance !== false,
    message: wallet.message || null
});

const toPaymentSettlement = (settlement = {}) => ({
    intentStatus: settlement.intentStatus || PAYMENT_ENGINE_INTENT_STATUSES.READY_TO_CAPTURE,
    paymentStatus: settlement.paymentStatus || PAYMENT_ENGINE_STATUSES.PENDING,
    captureType: settlement.captureType || PAYMENT_ENGINE_CAPTURE_TYPES.INSTANT,
    amount: numberOrZero(settlement.amount),
    requiresCollection: Boolean(settlement.requiresCollection),
    supportsRefund: Boolean(settlement.supportsRefund)
});

const toPaymentCapture = (capture = {}) => ({
    shouldCapture: Boolean(capture.shouldCapture),
    capturedAt: capture.capturedAt || null,
    refundableUntil: capture.refundableUntil || null,
    gatewayReference: capture.gatewayReference || null
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const nullableNumber = (value) => Number.isFinite(value) ? value : null;
