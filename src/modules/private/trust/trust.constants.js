export const TRUST_SUBJECT_TYPES = Object.freeze({
    RIDER: 'rider',
    PASSENGER: 'passenger',
    DRIVER: 'driver'
});

export const TRUST_RISK_LEVELS = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
});

export const TRUST_PROFILE_STATUSES = Object.freeze({
    CLEAR: 'clear',
    MONITORING: 'monitoring',
    RESTRICTED: 'restricted',
    SUSPENDED: 'suspended'
});

export const TRUST_REVIEW_STATUSES = Object.freeze({
    OPEN: 'open',
    UNDER_REVIEW: 'under_review',
    RESOLVED: 'resolved'
});

export const TRUST_ACTION_TYPES = Object.freeze({
    CREATE_PROFILE: 'create_profile',
    UPDATE_PROFILE: 'update_profile',
    ASSIGN_REVIEWER: 'assign_reviewer',
    ADD_NOTE: 'add_note',
    RESOLVE_REVIEW: 'resolve_review'
});

export const TRUST_SCORE_DEFAULT = 100;
export const TRUST_ACTION_LOG_LIMIT = 50;

export const TRUST_SCORE_BANDS = Object.freeze({
    [TRUST_RISK_LEVELS.LOW]: Object.freeze({ min: 80, max: 100 }),
    [TRUST_RISK_LEVELS.MEDIUM]: Object.freeze({ min: 60, max: 79 }),
    [TRUST_RISK_LEVELS.HIGH]: Object.freeze({ min: 40, max: 59 }),
    [TRUST_RISK_LEVELS.CRITICAL]: Object.freeze({ min: 0, max: 39 })
});
