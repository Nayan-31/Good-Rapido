import {
    MATCHING_ENGINE_DEFAULT_LIMIT,
    MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
    MATCHING_ENGINE_DRIVER_SOURCES,
    MATCHING_ENGINE_MAX_DRIVER_DISTANCE_KM,
    MATCHING_ENGINE_RISK_LEVELS,
    MATCHING_ENGINE_SCORE_WEIGHTS
} from '../matching-engine.constants.js';

export const toMatchingEngineOptions = ({ vehicleTypes = [] } = {}) => ({
    vehicleTypes,
    defaultServiceZone: MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
    driverSources: Object.values(MATCHING_ENGINE_DRIVER_SOURCES),
    riskLevels: Object.values(MATCHING_ENGINE_RISK_LEVELS),
    defaultLimit: MATCHING_ENGINE_DEFAULT_LIMIT,
    maxDriverDistanceKm: MATCHING_ENGINE_MAX_DRIVER_DISTANCE_KM,
    scoreWeights: MATCHING_ENGINE_SCORE_WEIGHTS
});

export const toMatchingEngineResult = ({ matches = [], summary = {} } = {}) => ({
    matches: matches.map(toMatchingEngineDriver),
    summary
});

export const toMatchingEngineDriver = (driver = {}) => ({
    driverId: driver.driverId || driver.id || null,
    fullName: driver.fullName || null,
    vehicle: {
        type: driver.vehicleType || null,
        name: driver.vehicleName || null,
        number: driver.vehicleNumber || null,
        color: driver.vehicleColor || null
    },
    rating: numberOrZero(driver.rating),
    etaMinutes: numberOrZero(driver.etaMinutes),
    distanceKm: numberOrZero(driver.distanceKm),
    activeServiceZones: driver.activeServiceZones || [],
    source: driver.source || MATCHING_ENGINE_DRIVER_SOURCES.STATIC_POOL,
    match: {
        rank: numberOrZero(driver.matchRank),
        score: numberOrZero(driver.matchScore),
        reasons: driver.matchReasons || [],
        scoreBreakdown: driver.scoreBreakdown || {}
    },
    trustSignals: {
        trustScore: numberOrZero(driver.trustScore),
        reliabilityScore: numberOrZero(driver.reliabilityScore),
        routeFairnessScore: numberOrZero(driver.routeFairnessScore),
        routeAccuracyScore: numberOrZero(driver.routeAccuracyScore),
        cancellationRiskScore: numberOrZero(driver.cancellationRiskScore),
        cancellationRiskLevel: driver.cancellationRiskLevel || null,
        cancellationRatio: numberOrZero(driver.cancellationRatio),
        detourPercentage: numberOrZero(driver.detourPercentage),
        onTimeArrivalScore: numberOrZero(driver.onTimeArrivalScore),
        transparencyScore: numberOrZero(driver.transparencyScore)
    },
    completedRides: numberOrZero(driver.completedRides)
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
