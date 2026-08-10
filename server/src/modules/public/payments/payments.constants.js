export const PAYMENT_CURRENCY = 'INR';

export const PAYMENT_METHODS = Object.freeze({
    PERSONAL_WALLET: 'personal_wallet',
    UPI: 'upi',
    CARD: 'card',
    CASH: 'cash'
});

export const PAYMENT_STATUSES = Object.freeze({
    PENDING: 'pending',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    REFUND_REQUESTED: 'refund_requested',
    REFUNDED: 'refunded'
});

export const PAYMENT_GATEWAY_PROVIDERS = Object.freeze({
    MOCK: 'mock',
    RAZORPAY: 'razorpay',
    STRIPE: 'stripe'
});

export const PAYMENT_GATEWAY_STATUSES = Object.freeze({
    NOT_REQUIRED: 'not_required',
    SESSION_CREATED: 'session_created',
    REQUIRES_ACTION: 'requires_action',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    REFUND_REQUESTED: 'refund_requested',
    REFUNDED: 'refunded'
});

export const PAYMENT_REFUND_REASONS = Object.freeze({
    DRIVER_CANCELLED: 'driver_cancelled',
    OVERCHARGED: 'overcharged',
    WRONG_ROUTE: 'wrong_route',
    DUPLICATE_PAYMENT: 'duplicate_payment',
    OTHER: 'other'
});

export const PAYMENT_WALLET_OPENING_BALANCE = 1500;

export const PAYMENT_METHOD_CATALOG = Object.freeze([
    Object.freeze({
        code: PAYMENT_METHODS.PERSONAL_WALLET,
        label: 'Personal Wallet',
        type: 'wallet',
        isDefault: true,
        supportsRefund: true,
        settlementSpeed: 'instant',
        description: 'Fastest option for locked fare payments and instant refunds'
    }),
    Object.freeze({
        code: PAYMENT_METHODS.UPI,
        label: 'UPI',
        type: 'bank_transfer',
        isDefault: false,
        supportsRefund: true,
        settlementSpeed: 'instant',
        description: 'Pay with any UPI app using a transparent ride reference'
    }),
    Object.freeze({
        code: PAYMENT_METHODS.CARD,
        label: 'Credit or Debit Card',
        type: 'card',
        isDefault: false,
        supportsRefund: true,
        settlementSpeed: 'same_day',
        description: 'Card payment with receipt and refund tracking'
    }),
    Object.freeze({
        code: PAYMENT_METHODS.CASH,
        label: 'Cash',
        type: 'cash',
        isDefault: false,
        supportsRefund: false,
        settlementSpeed: 'on_ride_completion',
        description: 'Pay the driver directly when the ride ends'
    })
]);
