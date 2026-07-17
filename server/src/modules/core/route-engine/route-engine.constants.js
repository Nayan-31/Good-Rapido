export const ROUTE_ENGINE_DEFAULT_SERVICE_ZONE = 'default';

export const ROUTE_ENGINE_ROUTE_PREFERENCES = Object.freeze({
    BALANCED: 'balanced',
    FASTEST: 'fastest',
    LOW_TRAFFIC: 'low_traffic'
});

export const ROUTE_ENGINE_TRAFFIC_LEVELS = Object.freeze({
    NORMAL: 'normal',
    MODERATE: 'moderate',
    HEAVY: 'heavy'
});

export const ROUTE_ENGINE_QUALITY_LEVELS = Object.freeze({
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
});

export const ROUTE_ENGINE_PROVIDER_SOURCES = Object.freeze({
    HEURISTIC: 'heuristic_route_engine'
});

export const ROUTE_ENGINE_MAX_WAYPOINTS = 3;
export const ROUTE_ENGINE_DEFAULT_BUFFER_MINUTES = 4;
export const ROUTE_ENGINE_DEFAULT_ROUTE_DISTANCE_MULTIPLIER = 1.28;

export const ROUTE_ENGINE_PREFERENCE_DISTANCE_FACTORS = Object.freeze({
    [ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED]: 1,
    [ROUTE_ENGINE_ROUTE_PREFERENCES.FASTEST]: 1.03,
    [ROUTE_ENGINE_ROUTE_PREFERENCES.LOW_TRAFFIC]: 1.08
});

export const ROUTE_ENGINE_PREFERENCE_TRAFFIC_FACTORS = Object.freeze({
    [ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED]: 1,
    [ROUTE_ENGINE_ROUTE_PREFERENCES.FASTEST]: 0.95,
    [ROUTE_ENGINE_ROUTE_PREFERENCES.LOW_TRAFFIC]: 0.82
});
