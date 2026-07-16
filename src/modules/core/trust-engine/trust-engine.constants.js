import {
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SCORE_BANDS,
    TRUST_SCORE_DEFAULT,
    TRUST_SUBJECT_TYPES
} from '../../private/trust/trust.constants.js';

export {
    TRUST_PROFILE_STATUSES as TRUST_ENGINE_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES as TRUST_ENGINE_REVIEW_STATUSES,
    TRUST_RISK_LEVELS as TRUST_ENGINE_RISK_LEVELS,
    TRUST_SCORE_BANDS as TRUST_ENGINE_SCORE_BANDS,
    TRUST_SCORE_DEFAULT as TRUST_ENGINE_SCORE_DEFAULT,
    TRUST_SUBJECT_TYPES as TRUST_ENGINE_SUBJECT_TYPES
};

export const TRUST_ENGINE_SCORE_FIELDS = Object.freeze([
    'overall',
    'safety',
    'reliability',
    'payment',
    'cancellation',
    'fraud'
]);

export const TRUST_ENGINE_ASSESSMENT_SOURCES = Object.freeze({
    METRICS: 'metrics',
    MANUAL_SCORES: 'manual_scores',
    DRIVER_SIGNALS: 'driver_signals'
});

export const TRUST_ENGINE_DRIVER_TRUST_LEVELS = Object.freeze({
    EXCELLENT: 'excellent',
    HIGH: 'high',
    FAIR: 'fair',
    NEEDS_REVIEW: 'needs_review'
});

export const TRUST_ENGINE_ROUTE_FAIRNESS_LEVELS = Object.freeze({
    EXCELLENT: 'excellent',
    STABLE: 'stable',
    WATCH: 'watch'
});

export const TRUST_ENGINE_METRIC_WEIGHTS = Object.freeze({
    SAFETY: 0.30,
    RELIABILITY: 0.24,
    PAYMENT: 0.14,
    CANCELLATION: 0.16,
    FRAUD: 0.16
});

export const TRUST_ENGINE_DEFAULT_DRIVER_SIGNAL_SCORE = 85;
