export const FRAUD_SUBJECT_TYPES = Object.freeze({
    RIDER: 'rider',
    PASSENGER: 'passenger',
    DRIVER: 'driver',
    RIDE: 'ride',
    PAYMENT: 'payment',
    PROMO: 'promo',
    DEVICE: 'device'
});

export const FRAUD_CASE_TYPES = Object.freeze({
    PROMO_ABUSE: 'promo_abuse',
    PAYMENT_RISK: 'payment_risk',
    CHARGEBACK: 'chargeback',
    FAKE_GPS: 'fake_gps',
    COLLUSION: 'collusion',
    DUPLICATE_ACCOUNT: 'duplicate_account',
    CANCELLATION_ABUSE: 'cancellation_abuse',
    ACCOUNT_TAKEOVER: 'account_takeover',
    SUSPICIOUS_RIDE: 'suspicious_ride'
});

export const FRAUD_CASE_SOURCES = Object.freeze({
    SYSTEM: 'system',
    OPS: 'ops',
    USER_REPORT: 'user_report',
    PAYMENT: 'payment',
    TRUST: 'trust',
    RIDE_OPS: 'ride_ops'
});

export const FRAUD_SEVERITY_LEVELS = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
});

export const FRAUD_CASE_STATUSES = Object.freeze({
    OPEN: 'open',
    UNDER_REVIEW: 'under_review',
    CONFIRMED: 'confirmed',
    DISMISSED: 'dismissed',
    RESOLVED: 'resolved'
});

export const FRAUD_RESOLUTION_DECISIONS = Object.freeze({
    CONFIRMED_FRAUD: 'confirmed_fraud',
    FALSE_POSITIVE: 'false_positive',
    INCONCLUSIVE: 'inconclusive',
    MITIGATED: 'mitigated'
});

export const FRAUD_EVIDENCE_TYPES = Object.freeze({
    RIDE: 'ride',
    PAYMENT: 'payment',
    PROMO: 'promo',
    DEVICE: 'device',
    LOCATION: 'location',
    SCREENSHOT: 'screenshot',
    NOTE: 'note'
});

export const FRAUD_ACTION_TYPES = Object.freeze({
    CREATE_CASE: 'create_case',
    UPDATE_CASE: 'update_case',
    ASSIGN_REVIEWER: 'assign_reviewer',
    ADD_NOTE: 'add_note',
    CONFIRM_CASE: 'confirm_case',
    DISMISS_CASE: 'dismiss_case',
    RESOLVE_CASE: 'resolve_case'
});

export const FRAUD_ACTION_LOG_LIMIT = 50;

export const FRAUD_RISK_SCORE_BANDS = Object.freeze({
    [FRAUD_SEVERITY_LEVELS.LOW]: Object.freeze({ min: 0, max: 39 }),
    [FRAUD_SEVERITY_LEVELS.MEDIUM]: Object.freeze({ min: 40, max: 59 }),
    [FRAUD_SEVERITY_LEVELS.HIGH]: Object.freeze({ min: 60, max: 79 }),
    [FRAUD_SEVERITY_LEVELS.CRITICAL]: Object.freeze({ min: 80, max: 100 })
});
