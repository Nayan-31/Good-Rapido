import {
    PAYMENT_CURRENCY,
    PAYMENT_METHOD_CATALOG,
    PAYMENT_METHODS,
    PAYMENT_REFUND_REASONS,
    PAYMENT_STATUSES,
    PAYMENT_WALLET_OPENING_BALANCE
} from '../../public/payments/payments.constants.js';

export {
    PAYMENT_CURRENCY as PAYMENT_ENGINE_CURRENCY,
    PAYMENT_METHOD_CATALOG as PAYMENT_ENGINE_METHOD_CATALOG,
    PAYMENT_METHODS as PAYMENT_ENGINE_METHODS,
    PAYMENT_REFUND_REASONS as PAYMENT_ENGINE_REFUND_REASONS,
    PAYMENT_STATUSES as PAYMENT_ENGINE_STATUSES,
    PAYMENT_WALLET_OPENING_BALANCE as PAYMENT_ENGINE_WALLET_OPENING_BALANCE
};

export const PAYMENT_ENGINE_FLOW_TYPES = Object.freeze({
    RIDE_PAYMENT: 'ride_payment',
    REFUND_PREVIEW: 'refund_preview',
    WALLET_SUMMARY: 'wallet_summary'
});

export const PAYMENT_ENGINE_INTENT_STATUSES = Object.freeze({
    READY_TO_CAPTURE: 'ready_to_capture',
    PENDING_COLLECTION: 'pending_collection',
    INSUFFICIENT_FUNDS: 'insufficient_funds'
});

export const PAYMENT_ENGINE_CAPTURE_TYPES = Object.freeze({
    INSTANT: 'instant',
    CASH_COLLECTION: 'cash_collection',
    BLOCKED: 'blocked'
});

export const PAYMENT_ENGINE_REFUND_ELIGIBILITY = Object.freeze({
    ELIGIBLE: 'eligible',
    NOT_SUCCESSFUL: 'not_successful',
    ALREADY_REQUESTED: 'already_requested',
    WINDOW_EXPIRED: 'window_expired',
    AMOUNT_EXCEEDS_PAYMENT: 'amount_exceeds_payment'
});

export const PAYMENT_ENGINE_LOW_WALLET_BALANCE_THRESHOLD = 200;

export const PAYMENT_ENGINE_REFUND_WINDOW_DAYS = 7;
