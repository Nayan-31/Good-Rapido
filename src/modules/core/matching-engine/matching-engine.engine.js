import { RIDE_BOOKING_RISK_LEVELS } from '../../public/ride-booking/ride-booking.constants.js';
import {
    MATCHING_ENGINE_DEFAULT_LIMIT,
    MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
    MATCHING_ENGINE_DRIVER_SOURCES,
    MATCHING_ENGINE_MAX_DRIVER_DISTANCE_KM,
    MATCHING_ENGINE_SCORE_WEIGHTS
} from './matching-engine.constants.js';

const EARTH_RADIUS_KM = 6371;
const DEFAULT_DRIVER_SPEED_KMPH = 24;

export const buildDriverMatches = ({
    pickup,
    vehicleType,
    serviceZone = MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
    drivers = [],
    limit = MATCHING_ENGINE_DEFAULT_LIMIT,
    now = new Date()
}) => {
    const normalizedPickup = normalizePickup(pickup);
    const normalizedServiceZone = normalizeServiceZone(serviceZone);
    const candidateLimit = Math.max(1, Math.min(limit || MATCHING_ENGINE_DEFAULT_LIMIT, drivers.length || MATCHING_ENGINE_DEFAULT_LIMIT));
    const matches = drivers
        .map((driver) => normalizeDriverCandidate(driver, {
            pickup: normalizedPickup,
            serviceZone: normalizedServiceZone,
            vehicleType,
            now
        }))
        .filter((driver) => isEligibleDriver(driver, {
            vehicleType,
            serviceZone: normalizedServiceZone,
            now
        }))
        .map((driver) => ({
            ...driver,
            ...scoreDriverMatch(driver)
        }))
        .sort(sortDriverMatches)
        .slice(0, candidateLimit)
        .map((driver, index) => ({
            ...driver,
            matchRank: index + 1,
            matchReasons: buildMatchReasons(driver, index)
        }));

    return {
        matches,
        summary: buildMatchingSummary(matches, {
            vehicleType,
            serviceZone: normalizedServiceZone
        })
    };
};

export const normalizeDriverCandidate = (driver = {}, { pickup, serviceZone, vehicleType: requestedVehicleType, now = new Date() } = {}) => {
    const driverObject = driver.toObject ? driver.toObject() : driver;
    const availability = driverObject.availability || null;
    const service = driverObject.service || {};
    const location = normalizeDriverLocation(availability?.currentLocation);
    const distanceKm = resolveDriverDistanceKm(driverObject, pickup, location);
    const etaMinutes = resolveDriverEtaMinutes(driverObject, distanceKm);
    const serviceVehicleTypes = Array.isArray(service.vehicleTypes) ? service.vehicleTypes : [];
    const matchedServiceVehicleType = serviceVehicleTypes.includes(requestedVehicleType) ? requestedVehicleType : null;
    const vehicle = resolveDriverVehicle(driverObject, matchedServiceVehicleType);
    const vehicleType = driverObject.vehicleType || matchedServiceVehicleType || vehicle?.type || serviceVehicleTypes[0] || driverObject.vehicle?.type || null;
    const cancellationRiskScore = numberOrDefault(driverObject.cancellationRiskScore, 30);
    const cancellationRiskLevel = driverObject.cancellationRiskLevel || resolveCancellationRiskLevel(cancellationRiskScore);

    return {
        id: driverObject.id || driverObject.driverId || driverObject.authUserId?.toString?.() || driverObject._id?.toString?.(),
        driverId: driverObject.driverId || driverObject.id || driverObject.authUserId?.toString?.() || driverObject._id?.toString?.(),
        fullName: driverObject.fullName || driverObject.profile?.displayName || driverObject.publicProfile?.displayName || 'Available driver',
        vehicleType,
        vehicleName: driverObject.vehicleName || driverObject.vehicle?.name || vehicle?.name || vehicleType,
        vehicleNumber: driverObject.vehicleNumber || driverObject.vehicle?.number || vehicle?.number || 'Not assigned',
        vehicleColor: driverObject.vehicleColor || driverObject.vehicle?.color || vehicle?.color || 'Not shared',
        rating: numberOrDefault(driverObject.rating, 4.5),
        etaMinutes,
        distanceKm,
        averageFarePerKm: numberOrDefault(driverObject.averageFarePerKm, 0),
        routeFairnessScore: numberOrDefault(driverObject.routeFairnessScore, 88),
        detourPercentage: numberOrDefault(driverObject.detourPercentage, 3),
        onTimeArrivalScore: numberOrDefault(driverObject.onTimeArrivalScore, 88),
        cancellationRatio: numberOrDefault(driverObject.cancellationRatio, 3),
        trustScore: numberOrDefault(driverObject.trustScore, 85),
        reliabilityScore: numberOrDefault(driverObject.reliabilityScore, driverObject.onTimeArrivalScore || 85),
        cancellationRiskScore,
        cancellationRiskLevel,
        completedRides: numberOrDefault(driverObject.completedRides, 0),
        activeServiceZones: normalizeServiceZones(availability?.activeServiceZones || service.activeServiceZones || [service.serviceZone || serviceZone]),
        availabilityStatus: availability?.status || 'available',
        location,
        lastHeartbeatAt: availability?.lastHeartbeatAt || null,
        source: availability ? MATCHING_ENGINE_DRIVER_SOURCES.LIVE_AVAILABILITY : MATCHING_ENGINE_DRIVER_SOURCES.STATIC_POOL
    };
};

const resolveDriverVehicle = (driverObject, vehicleType) => {
    const vehicles = Array.isArray(driverObject.vehicles) ? driverObject.vehicles : [];
    const matchedVehicle = vehicles.find((vehicle) => vehicle.type === vehicleType);
    const primaryVehicle = vehicles.find((vehicle) => vehicle.isPrimary);
    const vehicle = matchedVehicle || primaryVehicle || vehicles[0] || null;

    if (!vehicle) {
        return null;
    }

    return {
        type: vehicle.type,
        name: [vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.type,
        number: vehicle.registrationNumber,
        color: vehicle.color
    };
};

const isEligibleDriver = (driver, { vehicleType, serviceZone }) => {
    if (!driver.id || driver.vehicleType !== vehicleType) {
        return false;
    }

    if (driver.availabilityStatus && !['available', 'online'].includes(driver.availabilityStatus)) {
        return false;
    }

    if (
        serviceZone
        && serviceZone !== MATCHING_ENGINE_DEFAULT_SERVICE_ZONE
        && driver.activeServiceZones.length
        && !driver.activeServiceZones.includes(serviceZone)
    ) {
        return false;
    }

    return driver.distanceKm <= MATCHING_ENGINE_MAX_DRIVER_DISTANCE_KM;
};

const scoreDriverMatch = (driver) => {
    const trustComponent = driver.trustScore * MATCHING_ENGINE_SCORE_WEIGHTS.TRUST;
    const reliabilityComponent = driver.reliabilityScore * MATCHING_ENGINE_SCORE_WEIGHTS.RELIABILITY;
    const routeComponent = driver.routeFairnessScore * MATCHING_ENGINE_SCORE_WEIGHTS.ROUTE_FAIRNESS;
    const cancellationComponent = (100 - driver.cancellationRiskScore) * MATCHING_ENGINE_SCORE_WEIGHTS.CANCELLATION;
    const etaComponent = scoreEta(driver.etaMinutes) * MATCHING_ENGINE_SCORE_WEIGHTS.ETA;
    const proximityComponent = scoreProximity(driver.distanceKm) * MATCHING_ENGINE_SCORE_WEIGHTS.PROXIMITY;
    const matchScore = roundScore(
        trustComponent
        + reliabilityComponent
        + routeComponent
        + cancellationComponent
        + etaComponent
        + proximityComponent
    );

    return {
        matchScore,
        scoreBreakdown: {
            trust: roundScore(trustComponent),
            reliability: roundScore(reliabilityComponent),
            routeFairness: roundScore(routeComponent),
            cancellation: roundScore(cancellationComponent),
            eta: roundScore(etaComponent),
            proximity: roundScore(proximityComponent)
        },
        transparencyScore: roundScore((driver.routeFairnessScore + driver.onTimeArrivalScore + driver.trustScore) / 3),
        routeAccuracyScore: Math.min(99, Math.round((driver.routeFairnessScore + driver.onTimeArrivalScore) / 2))
    };
};

const buildMatchReasons = (driver, index) => {
    const reasons = [];

    if (index === 0) {
        reasons.push('Best overall match for trust, reliability, ETA, and route fairness');
    }

    if (driver.trustScore >= 94) {
        reasons.push('Excellent trust score');
    }

    if (driver.cancellationRiskLevel === RIDE_BOOKING_RISK_LEVELS.LOW) {
        reasons.push('Low cancellation risk');
    }

    if (driver.etaMinutes <= 4) {
        reasons.push('Fast pickup ETA');
    }

    if (driver.routeFairnessScore >= 95) {
        reasons.push('Strong route fairness history');
    }

    return reasons.length ? reasons : ['Balanced match across trust and availability signals'];
};

const buildMatchingSummary = (matches = [], { vehicleType, serviceZone }) => ({
    vehicleType,
    serviceZone,
    totalMatches: matches.length,
    bestDriverId: matches[0]?.driverId || null,
    averageMatchScore: average(matches.map((driver) => driver.matchScore)),
    lowestEtaMinutes: matches.length ? Math.min(...matches.map((driver) => driver.etaMinutes)) : 0,
    lowestCancellationRiskLevel: matches[0]?.cancellationRiskLevel || RIDE_BOOKING_RISK_LEVELS.HIGH,
    message: matches.length
        ? 'Drivers are ranked by trust, reliability, route fairness, cancellation risk, ETA, and pickup proximity'
        : 'No trusted drivers are currently available for this ride'
});

const sortDriverMatches = (left, right) => {
    if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
    }

    if (left.etaMinutes !== right.etaMinutes) {
        return left.etaMinutes - right.etaMinutes;
    }

    return left.distanceKm - right.distanceKm;
};

const resolveDriverDistanceKm = (driver, pickup, location) => {
    if (Number.isFinite(driver.distanceKm)) {
        return roundDistance(driver.distanceKm);
    }

    if (pickup && location) {
        return calculateDistanceKm(pickup, location);
    }

    return MATCHING_ENGINE_MAX_DRIVER_DISTANCE_KM;
};

const resolveDriverEtaMinutes = (driver, distanceKm) => {
    if (Number.isFinite(driver.etaMinutes)) {
        return driver.etaMinutes;
    }

    return Math.max(2, Math.round((distanceKm / DEFAULT_DRIVER_SPEED_KMPH) * 60 + 2));
};

const normalizePickup = (pickup = null) => {
    if (!pickup) {
        return null;
    }

    return {
        latitude: pickup.latitude,
        longitude: pickup.longitude
    };
};

const normalizeDriverLocation = (location) => {
    if (!location?.coordinates?.length) {
        return null;
    }

    return {
        longitude: location.coordinates[0],
        latitude: location.coordinates[1]
    };
};

const calculateDistanceKm = (from, to) => {
    const fromLatitude = degreesToRadians(from.latitude);
    const toLatitude = degreesToRadians(to.latitude);
    const latitudeDelta = degreesToRadians(to.latitude - from.latitude);
    const longitudeDelta = degreesToRadians(to.longitude - from.longitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

    return roundDistance(2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
};

const scoreEta = (etaMinutes) => clamp(100 - etaMinutes * 8, 0, 100);

const scoreProximity = (distanceKm) => clamp(100 - distanceKm * 15, 0, 100);

const resolveCancellationRiskLevel = (score) => {
    if (score <= 20) {
        return RIDE_BOOKING_RISK_LEVELS.LOW;
    }

    if (score <= 50) {
        return RIDE_BOOKING_RISK_LEVELS.MEDIUM;
    }

    return RIDE_BOOKING_RISK_LEVELS.HIGH;
};

const normalizeServiceZone = (serviceZone) => serviceZone?.trim?.().toLowerCase() || MATCHING_ENGINE_DEFAULT_SERVICE_ZONE;

const normalizeServiceZones = (zones = []) => zones
    .filter(Boolean)
    .map((zone) => normalizeServiceZone(zone));

const numberOrDefault = (value, fallback) => Number.isFinite(value) ? value : fallback;

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

const roundDistance = (value) => Number(value.toFixed(2));

const roundScore = (value) => Number(value.toFixed(2));

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const average = (values) => {
    if (!values.length) {
        return 0;
    }

    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};
