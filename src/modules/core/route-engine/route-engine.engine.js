import {
    FARE_ROUTE_DISTANCE_MULTIPLIER,
    FARE_VEHICLE_PRICING
} from '../../public/fare/fare.constants.js';
import {
    ROUTE_ENGINE_DEFAULT_BUFFER_MINUTES,
    ROUTE_ENGINE_DEFAULT_ROUTE_DISTANCE_MULTIPLIER,
    ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    ROUTE_ENGINE_PREFERENCE_DISTANCE_FACTORS,
    ROUTE_ENGINE_PREFERENCE_TRAFFIC_FACTORS,
    ROUTE_ENGINE_PROVIDER_SOURCES,
    ROUTE_ENGINE_QUALITY_LEVELS,
    ROUTE_ENGINE_ROUTE_PREFERENCES,
    ROUTE_ENGINE_TRAFFIC_LEVELS
} from './route-engine.constants.js';

const EARTH_RADIUS_KM = 6371;

export const buildRoutePlan = ({
    pickup,
    dropoff,
    waypoints = [],
    vehicleType,
    serviceZone = ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    routePreference = ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED,
    requestedAt = new Date(),
    averageSpeedKmph = null,
    now = new Date()
}) => {
    const normalizedPickup = normalizeLocation(pickup);
    const normalizedDropoff = normalizeLocation(dropoff);
    const normalizedWaypoints = waypoints.map(normalizeLocation);
    const normalizedPreference = normalizeRoutePreference(routePreference);
    const normalizedRequestedAt = normalizeDate(requestedAt);
    const normalizedServiceZone = normalizeServiceZone(serviceZone);
    const points = [normalizedPickup, ...normalizedWaypoints, normalizedDropoff];
    const straightLineDistanceKm = calculateRouteStraightLineDistanceKm(points);
    const routeDistanceKm = calculateRouteDistanceKm(points, normalizedPreference);
    const duration = calculateRouteDurationMinutes(routeDistanceKm, {
        averageSpeedKmph: averageSpeedKmph || FARE_VEHICLE_PRICING[vehicleType]?.averageSpeedKmph,
        requestedAt: normalizedRequestedAt,
        routePreference: normalizedPreference
    });
    const traffic = resolveTrafficProfile(normalizedRequestedAt, normalizedPreference);
    const quality = buildRouteQuality({
        straightLineDistanceKm,
        routeDistanceKm,
        duration,
        traffic,
        requestedAt: normalizedRequestedAt,
        now
    });

    return {
        routeType: 'point_to_point',
        providerSource: ROUTE_ENGINE_PROVIDER_SOURCES.HEURISTIC,
        serviceZone: normalizedServiceZone,
        vehicleType,
        routePreference: normalizedPreference,
        requestedAt: normalizedRequestedAt,
        pickup: normalizedPickup,
        dropoff: normalizedDropoff,
        waypoints: normalizedWaypoints,
        segments: buildRouteSegments(points, {
            routePreference: normalizedPreference,
            requestedAt: normalizedRequestedAt,
            averageSpeedKmph: averageSpeedKmph || FARE_VEHICLE_PRICING[vehicleType]?.averageSpeedKmph
        }),
        distance: {
            straightLineKm: straightLineDistanceKm,
            routeDistanceKm,
            detourRatio: roundRatio(routeDistanceKm / Math.max(straightLineDistanceKm, 0.1))
        },
        duration,
        traffic,
        quality,
        geometry: buildRouteGeometry(points),
        alternatives: buildRouteAlternatives({
            points,
            vehicleType,
            requestedAt: normalizedRequestedAt,
            averageSpeedKmph: averageSpeedKmph || FARE_VEHICLE_PRICING[vehicleType]?.averageSpeedKmph,
            selectedPreference: normalizedPreference
        }),
        alternativePickups: buildAlternativePickups({
            pickup: normalizedPickup,
            dropoff: normalizedDropoff,
            vehicleType,
            requestedAt: normalizedRequestedAt,
            routePreference: normalizedPreference,
            averageSpeedKmph: averageSpeedKmph || FARE_VEHICLE_PRICING[vehicleType]?.averageSpeedKmph
        }),
        guidance: buildRouteGuidance({ traffic, quality, routeDistanceKm })
    };
};

export const calculateRouteDistanceKm = (
    locations = [],
    routePreference = ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED
) => {
    const points = locations.map(normalizeLocation);
    const preference = normalizeRoutePreference(routePreference);
    const distanceMultiplier = FARE_ROUTE_DISTANCE_MULTIPLIER || ROUTE_ENGINE_DEFAULT_ROUTE_DISTANCE_MULTIPLIER;
    const preferenceFactor = ROUTE_ENGINE_PREFERENCE_DISTANCE_FACTORS[preference] || 1;
    const straightLineDistance = calculateRouteStraightLineDistanceKm(points);

    return roundDistance(straightLineDistance * distanceMultiplier * preferenceFactor);
};

export const calculateRouteStraightLineDistanceKm = (locations = []) => {
    const points = locations.map(normalizeLocation);

    if (points.length < 2) {
        return 0;
    }

    return roundDistance(points.slice(1).reduce((totalDistance, point, index) => (
        totalDistance + calculatePointDistanceKm(points[index], point)
    ), 0));
};

export const calculateRouteDurationMinutes = (distanceKm, {
    averageSpeedKmph,
    requestedAt = new Date(),
    routePreference = ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED,
    bufferMinutes = ROUTE_ENGINE_DEFAULT_BUFFER_MINUTES
} = {}) => {
    const speedKmph = Number.isFinite(averageSpeedKmph) && averageSpeedKmph > 0 ? averageSpeedKmph : 24;
    const traffic = resolveTrafficProfile(requestedAt, routePreference);
    const baseMinutes = (distanceKm / speedKmph) * 60;
    const trafficDelayMinutes = Math.max(0, Math.round(baseMinutes * (traffic.multiplier - 1)));
    const estimatedMinutes = Math.max(2, Math.round(baseMinutes + trafficDelayMinutes + bufferMinutes));

    return {
        estimatedMinutes,
        baseMinutes: Math.max(1, Math.round(baseMinutes)),
        trafficDelayMinutes,
        bufferMinutes,
        averageSpeedKmph: speedKmph
    };
};

export const shiftRouteLocation = (location, northMeters, eastMeters) => {
    const normalizedLocation = normalizeLocation(location);
    const latitudeOffset = northMeters / 111320;
    const longitudeScale = 111320 * Math.cos(degreesToRadians(normalizedLocation.latitude));
    const longitudeOffset = longitudeScale === 0 ? 0 : eastMeters / longitudeScale;

    return {
        ...(normalizedLocation.address ? { address: normalizedLocation.address } : {}),
        latitude: roundCoordinate(normalizedLocation.latitude + latitudeOffset),
        longitude: roundCoordinate(normalizedLocation.longitude + longitudeOffset)
    };
};

const buildRouteSegments = (points, {
    routePreference,
    requestedAt,
    averageSpeedKmph
}) => points.slice(1).map((point, index) => {
    const start = points[index];
    const end = point;
    const straightLineKm = calculatePointDistanceKm(start, end);
    const routeDistanceKm = calculateRouteDistanceKm([start, end], routePreference);
    const duration = calculateRouteDurationMinutes(routeDistanceKm, {
        averageSpeedKmph,
        requestedAt,
        routePreference,
        bufferMinutes: index === 0 ? ROUTE_ENGINE_DEFAULT_BUFFER_MINUTES : 1
    });

    return {
        sequence: index + 1,
        start,
        end,
        straightLineKm,
        routeDistanceKm,
        durationMinutes: duration.estimatedMinutes
    };
});

const buildRouteAlternatives = ({
    points,
    vehicleType,
    requestedAt,
    averageSpeedKmph,
    selectedPreference
}) => Object.values(ROUTE_ENGINE_ROUTE_PREFERENCES).map((preference) => {
    const distanceKm = calculateRouteDistanceKm(points, preference);
    const duration = calculateRouteDurationMinutes(distanceKm, {
        averageSpeedKmph,
        requestedAt,
        routePreference: preference
    });
    const traffic = resolveTrafficProfile(requestedAt, preference);

    return {
        preference,
        selected: preference === selectedPreference,
        vehicleType,
        routeDistanceKm: distanceKm,
        durationMinutes: duration.estimatedMinutes,
        trafficLevel: traffic.level,
        summary: buildAlternativeSummary(preference, duration.estimatedMinutes, traffic.level)
    };
});

const buildAlternativePickups = ({
    pickup,
    dropoff,
    vehicleType,
    requestedAt,
    routePreference,
    averageSpeedKmph
}) => [
    createAlternativePickup({
        label: 'Pickup 250m north',
        pickup,
        dropoff,
        northMeters: 250,
        eastMeters: 0,
        walkingDistanceMeters: 250,
        vehicleType,
        requestedAt,
        routePreference,
        averageSpeedKmph,
        reason: 'Nearby pickup may reduce congestion around the original pickup'
    }),
    createAlternativePickup({
        label: 'Pickup 400m east',
        pickup,
        dropoff,
        northMeters: 0,
        eastMeters: 400,
        walkingDistanceMeters: 400,
        vehicleType,
        requestedAt,
        routePreference,
        averageSpeedKmph,
        reason: 'Slightly shifted pickup can improve route entry and waiting predictability'
    })
];

const createAlternativePickup = ({
    label,
    pickup,
    dropoff,
    northMeters,
    eastMeters,
    walkingDistanceMeters,
    vehicleType,
    requestedAt,
    routePreference,
    averageSpeedKmph,
    reason
}) => {
    const shiftedPickup = shiftRouteLocation(pickup, northMeters, eastMeters);
    const routeDistanceKm = calculateRouteDistanceKm([shiftedPickup, dropoff], routePreference);
    const duration = calculateRouteDurationMinutes(routeDistanceKm, {
        averageSpeedKmph,
        requestedAt,
        routePreference
    });

    return {
        label,
        pickup: shiftedPickup,
        walkingDistanceMeters,
        vehicleType,
        routeDistanceKm,
        durationMinutes: duration.estimatedMinutes,
        reason
    };
};

const buildRouteQuality = ({
    straightLineDistanceKm,
    routeDistanceKm,
    duration,
    traffic,
    requestedAt,
    now
}) => {
    const factors = [];
    let score = 94;
    const detourRatio = routeDistanceKm / Math.max(straightLineDistanceKm, 0.1);

    if (traffic.level === ROUTE_ENGINE_TRAFFIC_LEVELS.HEAVY) {
        score -= 12;
        factors.push('Heavy traffic can increase pickup and dropoff variance');
    } else if (traffic.level === ROUTE_ENGINE_TRAFFIC_LEVELS.MODERATE) {
        score -= 6;
        factors.push('Moderate traffic may affect arrival precision');
    }

    if (detourRatio > 1.45) {
        score -= 8;
        factors.push('Route has a higher detour ratio than usual');
    }

    if (routeDistanceKm > 25) {
        score -= 7;
        factors.push('Longer routes are more sensitive to traffic and route changes');
    }

    if (duration.estimatedMinutes <= 5) {
        score -= 3;
        factors.push('Short rides are sensitive to pickup waiting time');
    }

    if (normalizeDate(requestedAt).getTime() - normalizeDate(now).getTime() > 30 * 60 * 1000) {
        score -= 5;
        factors.push('Future routes can shift before pickup time');
    }

    const normalizedScore = clamp(score, 0, 100);

    return {
        score: normalizedScore,
        level: resolveQualityLevel(normalizedScore),
        routeAccuracyScore: clamp(Math.round((normalizedScore + Math.max(0, 100 - (detourRatio - 1) * 100)) / 2), 0, 100),
        factors: factors.length ? factors : ['Route distance, traffic, and timing are within normal range']
    };
};

const buildRouteGeometry = (points) => {
    const coordinates = [];

    points.slice(1).forEach((point, index) => {
        const start = points[index];
        const midpoint = {
            latitude: roundCoordinate((start.latitude + point.latitude) / 2),
            longitude: roundCoordinate((start.longitude + point.longitude) / 2)
        };

        if (index === 0) {
            coordinates.push(start);
        }

        coordinates.push(midpoint, point);
    });

    return {
        polyline: coordinates,
        bounds: buildBounds(points)
    };
};

const buildBounds = (points) => ({
    north: roundCoordinate(Math.max(...points.map((point) => point.latitude))),
    south: roundCoordinate(Math.min(...points.map((point) => point.latitude))),
    east: roundCoordinate(Math.max(...points.map((point) => point.longitude))),
    west: roundCoordinate(Math.min(...points.map((point) => point.longitude)))
});

const resolveTrafficProfile = (
    requestedAt = new Date(),
    routePreference = ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED
) => {
    const hour = normalizeDate(requestedAt).getHours();
    const preference = normalizeRoutePreference(routePreference);
    const preferenceFactor = ROUTE_ENGINE_PREFERENCE_TRAFFIC_FACTORS[preference] || 1;
    let multiplier = 1;
    let level = ROUTE_ENGINE_TRAFFIC_LEVELS.NORMAL;
    let reason = 'Traffic is within normal operating range';

    if (hour >= 17 && hour <= 21) {
        multiplier = 1.28;
        level = ROUTE_ENGINE_TRAFFIC_LEVELS.HEAVY;
        reason = 'Evening commute traffic is elevated';
    } else if (hour >= 8 && hour <= 10) {
        multiplier = 1.16;
        level = ROUTE_ENGINE_TRAFFIC_LEVELS.MODERATE;
        reason = 'Morning commute traffic is above normal';
    } else if (hour >= 22 || hour <= 5) {
        multiplier = 1.08;
        level = ROUTE_ENGINE_TRAFFIC_LEVELS.MODERATE;
        reason = 'Late-night availability and road conditions can vary';
    }

    const adjustedMultiplier = roundMultiplier(Math.max(1, multiplier * preferenceFactor));

    return {
        level: adjustedMultiplier >= 1.2
            ? ROUTE_ENGINE_TRAFFIC_LEVELS.HEAVY
            : adjustedMultiplier > 1
                ? ROUTE_ENGINE_TRAFFIC_LEVELS.MODERATE
                : ROUTE_ENGINE_TRAFFIC_LEVELS.NORMAL,
        multiplier: adjustedMultiplier,
        reason
    };
};

const buildRouteGuidance = ({ traffic, quality, routeDistanceKm }) => ({
    highTraffic: traffic.level === ROUTE_ENGINE_TRAFFIC_LEVELS.HEAVY,
    qualityLevel: quality.level,
    longRoute: routeDistanceKm > 25,
    nextAction: resolveNextAction({ traffic, quality, routeDistanceKm })
});

const resolveNextAction = ({ traffic, quality, routeDistanceKm }) => {
    if (traffic.level === ROUTE_ENGINE_TRAFFIC_LEVELS.HEAVY) {
        return 'Show traffic impact clearly before booking';
    }

    if (quality.level === ROUTE_ENGINE_QUALITY_LEVELS.LOW) {
        return 'Ask user to review route variability before confirming';
    }

    if (routeDistanceKm > 25) {
        return 'Keep route monitoring active for long-distance trip variance';
    }

    return 'Route output is within normal operating range';
};

const buildAlternativeSummary = (preference, durationMinutes, trafficLevel) => {
    if (preference === ROUTE_ENGINE_ROUTE_PREFERENCES.FASTEST) {
        return `Fastest available route estimate at ${durationMinutes} minutes`;
    }

    if (preference === ROUTE_ENGINE_ROUTE_PREFERENCES.LOW_TRAFFIC) {
        return `Lower traffic exposure with ${trafficLevel} traffic`;
    }

    return `Balanced route estimate at ${durationMinutes} minutes`;
};

const calculatePointDistanceKm = (from, to) => {
    const fromLatitude = degreesToRadians(from.latitude);
    const toLatitude = degreesToRadians(to.latitude);
    const latitudeDelta = degreesToRadians(to.latitude - from.latitude);
    const longitudeDelta = degreesToRadians(to.longitude - from.longitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

    return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const normalizeLocation = (location = {}) => ({
    ...(location.address ? { address: location.address.trim() } : {}),
    latitude: location.latitude,
    longitude: location.longitude
});

const normalizeRoutePreference = (preference) => (
    Object.values(ROUTE_ENGINE_ROUTE_PREFERENCES).includes(preference)
        ? preference
        : ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED
);

const normalizeServiceZone = (serviceZone) => serviceZone?.trim?.().toLowerCase() || ROUTE_ENGINE_DEFAULT_SERVICE_ZONE;

const normalizeDate = (value) => value instanceof Date ? value : new Date(value);

const resolveQualityLevel = (score) => {
    if (score >= 85) {
        return ROUTE_ENGINE_QUALITY_LEVELS.HIGH;
    }

    if (score >= 70) {
        return ROUTE_ENGINE_QUALITY_LEVELS.MEDIUM;
    }

    return ROUTE_ENGINE_QUALITY_LEVELS.LOW;
};

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

const roundDistance = (value) => Number(value.toFixed(2));

const roundCoordinate = (value) => Number(value.toFixed(6));

const roundMultiplier = (value) => Number(value.toFixed(2));

const roundRatio = (value) => Number(value.toFixed(2));

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
