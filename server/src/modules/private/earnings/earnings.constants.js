import { PAYMENT_CURRENCY } from '../../public/payments/payments.constants.js';

export const EARNINGS_CURRENCY = PAYMENT_CURRENCY;

export const EARNINGS_PERIODS = Object.freeze({
    TODAY: 'today',
    THIS_WEEK: 'this_week',
    THIS_MONTH: 'this_month',
    CUSTOM: 'custom'
});

export const EARNINGS_STATEMENT_PERIODS = Object.freeze({
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly'
});

export const EARNINGS_STATUSES = Object.freeze({
    PENDING: 'pending',
    AVAILABLE: 'available',
    SETTLED: 'settled',
    ON_HOLD: 'on_hold',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
});

export const EARNINGS_COMPONENT_TYPES = Object.freeze({
    GROSS_FARE: 'gross_fare',
    DRIVER_FARE: 'driver_fare',
    PLATFORM_FEE: 'platform_fee',
    SURGE_INCENTIVE: 'surge_incentive',
    TIP: 'tip',
    DEDUCTION: 'deduction'
});

export const EARNINGS_DEFAULT_DRIVER_SHARE_RATE = 0.8;
export const EARNINGS_DEFAULT_PLATFORM_FEE_RATE = 0.2;
export const EARNINGS_DEFAULT_SURGE_INCENTIVE_RATE = 0.15;
export const EARNINGS_DEFAULT_LIST_LIMIT = 20;
export const EARNINGS_MAX_LIST_LIMIT = 100;
