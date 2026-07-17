export const MATCHING_ENGINE_DEFAULT_SERVICE_ZONE = 'default';

export const MATCHING_ENGINE_DRIVER_SOURCES = Object.freeze({
    LIVE_AVAILABILITY: 'live_availability',
    STATIC_POOL: 'static_pool'
});

export const MATCHING_ENGINE_SCORE_WEIGHTS = Object.freeze({
    TRUST: 0.30,
    RELIABILITY: 0.20,
    ROUTE_FAIRNESS: 0.15,
    CANCELLATION: 0.15,
    ETA: 0.15,
    PROXIMITY: 0.05
});

export const MATCHING_ENGINE_RISK_LEVELS = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
});

export const MATCHING_ENGINE_MAX_DRIVER_DISTANCE_KM = 8;
export const MATCHING_ENGINE_DEFAULT_LIMIT = 3;
export const MATCHING_ENGINE_MAX_LIMIT = 10;
