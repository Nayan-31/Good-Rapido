import { FARE_VEHICLE_TYPES } from '../../../public/fare/fare.constants.js';
import {
    ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    ROUTE_ENGINE_MAX_WAYPOINTS,
    ROUTE_ENGINE_PROVIDER_SOURCES,
    ROUTE_ENGINE_QUALITY_LEVELS,
    ROUTE_ENGINE_ROUTE_PREFERENCES,
    ROUTE_ENGINE_TRAFFIC_LEVELS
} from '../route-engine.constants.js';

export const toRouteEngineOptions = () => ({
    vehicleTypes: Object.values(FARE_VEHICLE_TYPES),
    defaultServiceZone: ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    routePreferences: Object.values(ROUTE_ENGINE_ROUTE_PREFERENCES),
    trafficLevels: Object.values(ROUTE_ENGINE_TRAFFIC_LEVELS),
    qualityLevels: Object.values(ROUTE_ENGINE_QUALITY_LEVELS),
    providerSources: Object.values(ROUTE_ENGINE_PROVIDER_SOURCES),
    maxWaypoints: ROUTE_ENGINE_MAX_WAYPOINTS
});

export const toRouteEnginePlan = (plan = {}) => ({
    routeType: plan.routeType || 'point_to_point',
    providerSource: plan.providerSource || ROUTE_ENGINE_PROVIDER_SOURCES.HEURISTIC,
    serviceZone: plan.serviceZone || ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    vehicleType: plan.vehicleType || null,
    routePreference: plan.routePreference || ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED,
    requestedAt: plan.requestedAt || null,
    pickup: toLocation(plan.pickup),
    dropoff: toLocation(plan.dropoff),
    waypoints: (plan.waypoints || []).map(toLocation),
    segments: (plan.segments || []).map(toRouteSegment),
    distance: {
        straightLineKm: numberOrZero(plan.distance?.straightLineKm),
        routeDistanceKm: numberOrZero(plan.distance?.routeDistanceKm),
        detourRatio: numberOrZero(plan.distance?.detourRatio)
    },
    duration: toDuration(plan.duration),
    traffic: toTraffic(plan.traffic),
    quality: toQuality(plan.quality),
    geometry: {
        polyline: (plan.geometry?.polyline || []).map(toLocation),
        bounds: plan.geometry?.bounds || null
    },
    alternatives: (plan.alternatives || []).map(toRouteAlternative),
    alternativePickups: (plan.alternativePickups || []).map(toAlternativePickup),
    guidance: {
        highTraffic: Boolean(plan.guidance?.highTraffic),
        qualityLevel: plan.guidance?.qualityLevel || null,
        longRoute: Boolean(plan.guidance?.longRoute),
        nextAction: plan.guidance?.nextAction || null
    }
});

const toRouteSegment = (segment = {}) => ({
    sequence: numberOrZero(segment.sequence),
    start: toLocation(segment.start),
    end: toLocation(segment.end),
    straightLineKm: numberOrZero(segment.straightLineKm),
    routeDistanceKm: numberOrZero(segment.routeDistanceKm),
    durationMinutes: numberOrZero(segment.durationMinutes)
});

const toRouteAlternative = (alternative = {}) => ({
    preference: alternative.preference || ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED,
    selected: Boolean(alternative.selected),
    vehicleType: alternative.vehicleType || null,
    routeDistanceKm: numberOrZero(alternative.routeDistanceKm),
    durationMinutes: numberOrZero(alternative.durationMinutes),
    trafficLevel: alternative.trafficLevel || null,
    summary: alternative.summary || null
});

const toAlternativePickup = (alternative = {}) => ({
    label: alternative.label || null,
    pickup: toLocation(alternative.pickup),
    walkingDistanceMeters: numberOrZero(alternative.walkingDistanceMeters),
    vehicleType: alternative.vehicleType || null,
    routeDistanceKm: numberOrZero(alternative.routeDistanceKm),
    durationMinutes: numberOrZero(alternative.durationMinutes),
    reason: alternative.reason || null
});

const toDuration = (duration = {}) => ({
    estimatedMinutes: numberOrZero(duration.estimatedMinutes),
    baseMinutes: numberOrZero(duration.baseMinutes),
    trafficDelayMinutes: numberOrZero(duration.trafficDelayMinutes),
    bufferMinutes: numberOrZero(duration.bufferMinutes),
    averageSpeedKmph: numberOrZero(duration.averageSpeedKmph)
});

const toTraffic = (traffic = {}) => ({
    level: traffic.level || ROUTE_ENGINE_TRAFFIC_LEVELS.NORMAL,
    multiplier: numberOrZero(traffic.multiplier),
    reason: traffic.reason || null
});

const toQuality = (quality = {}) => ({
    score: numberOrZero(quality.score),
    level: quality.level || null,
    routeAccuracyScore: numberOrZero(quality.routeAccuracyScore),
    factors: quality.factors || []
});

const toLocation = (location = {}) => ({
    address: location.address || null,
    latitude: numberOrZero(location.latitude),
    longitude: numberOrZero(location.longitude)
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
