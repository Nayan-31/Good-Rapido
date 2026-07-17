export const DRIVER_SORT_OPTIONS = Object.freeze({
    TRUST_SCORE: 'trust_score',
    ETA: 'eta',
    RATING: 'rating',
    ROUTE_FAIRNESS: 'route_fairness',
    CANCELLATION_RISK: 'cancellation_risk'
});

export const DRIVER_TRUST_LEVELS = Object.freeze({
    EXCELLENT: 'excellent',
    HIGH: 'high',
    FAIR: 'fair',
    NEEDS_REVIEW: 'needs_review'
});

export const DRIVER_ROUTE_FAIRNESS_LEVELS = Object.freeze({
    EXCELLENT: 'excellent',
    STABLE: 'stable',
    WATCH: 'watch'
});

export const DRIVER_CANCELLATION_RISK_MESSAGES = Object.freeze({
    low: 'This driver rarely cancels after accepting rides',
    medium: 'This driver has a moderate cancellation pattern',
    high: 'This driver has a higher cancellation pattern'
});
