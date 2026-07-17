import {
    FARE_CONFIDENCE_LEVELS,
    FARE_CURRENCY,
    FARE_ESTIMATE_WINDOW_MINUTES,
    FARE_LOCK_WINDOW_MINUTES,
    FARE_SURGE_LEVELS,
    FARE_TAX_RATE,
    FARE_VEHICLE_PRICING,
    FARE_VEHICLE_TYPES
} from '../../public/fare/fare.constants.js';
import {
    buildRoutePlan,
    calculateRouteDistanceKm as calculateCoreRouteDistanceKm,
    calculateRouteDurationMinutes
} from '../route-engine/route-engine.engine.js';
import {
    PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    PRICING_ENGINE_DEFAULT_SURGE_RULES,
    PRICING_ENGINE_RULE_SOURCES
} from './pricing-engine.constants.js';

export const buildPricingQuote = ({
    pickup,
    dropoff,
    vehicleType,
    serviceZone = PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    requestedAt = new Date(),
    pricingRule = null,
    now = new Date()
}) => {
    const normalizedPickup = normalizeLocation(pickup);
    const normalizedDropoff = normalizeLocation(dropoff);
    const normalizedRequestedAt = normalizeDate(requestedAt);
    const resolvedRule = normalizePricingRule(pricingRule, vehicleType, serviceZone);
    const pricing = resolvedRule.pricing;
    const routePlan = buildRoutePlan({
        pickup: normalizedPickup,
        dropoff: normalizedDropoff,
        vehicleType,
        serviceZone,
        requestedAt: normalizedRequestedAt,
        averageSpeedKmph: pricing.averageSpeedKmph,
        now
    });
    const distanceKm = routePlan.distance.routeDistanceKm;
    const durationMinutes = routePlan.duration.estimatedMinutes;
    const surge = calculatePricingSurge(resolvedRule.surgeRules, normalizedRequestedAt);
    const breakdown = calculatePricingBreakdown({
        pricing,
        distanceKm,
        durationMinutes,
        surgeMultiplier: surge.multiplier
    });
    const confidence = calculatePricingConfidence({
        distanceKm,
        requestedAt: normalizedRequestedAt,
        surge,
        now
    });
    const alternativePickups = calculateAlternativePickups({
        pickup: normalizedPickup,
        currentTotalFare: breakdown.totalFare,
        surge
    });

    return {
        quoteType: 'single',
        vehicleType: resolvedRule.vehicleType,
        serviceZone: resolvedRule.serviceZone,
        requestedAt: normalizedRequestedAt,
        pickup: normalizedPickup,
        dropoff: normalizedDropoff,
        distanceKm,
        durationMinutes,
        route: routePlan,
        pricingRule: toQuoteRuleSnapshot(resolvedRule),
        breakdown,
        surge,
        confidence,
        alternativePickups,
        validity: {
            validUntil: addMinutes(normalizeDate(now), FARE_ESTIMATE_WINDOW_MINUTES),
            lockWindowMinutes: FARE_LOCK_WINDOW_MINUTES,
            lockExpiresAt: addMinutes(normalizeDate(now), FARE_LOCK_WINDOW_MINUTES)
        },
        guidance: buildPricingGuidance({ surge, confidence, breakdown })
    };
};

export const simulatePricingFromRule = (rule, {
    distanceKm,
    durationMinutes,
    requestedAt = new Date()
}) => {
    const resolvedRule = normalizePricingRule(rule, rule.vehicleType, rule.serviceZone);
    const pricing = resolvedRule.pricing;
    const resolvedDistanceKm = roundDistance(distanceKm);
    const resolvedDurationMinutes = durationMinutes
        || calculateDurationMinutes(resolvedDistanceKm, pricing, requestedAt);
    const surge = calculatePricingSurge(resolvedRule.surgeRules, requestedAt);
    const breakdown = calculatePricingBreakdown({
        pricing,
        distanceKm: resolvedDistanceKm,
        durationMinutes: resolvedDurationMinutes,
        surgeMultiplier: surge.multiplier
    });

    return {
        currency: pricing.currency,
        distanceKm: resolvedDistanceKm,
        durationMinutes: resolvedDurationMinutes,
        surge,
        breakdown,
        guidance: buildPricingGuidance({
            surge,
            confidence: {
                level: breakdown.totalFare > 0 ? FARE_CONFIDENCE_LEVELS.HIGH : FARE_CONFIDENCE_LEVELS.LOW
            },
            breakdown
        })
    };
};

export const normalizePricingRule = (
    rule,
    vehicleType,
    serviceZone = PRICING_ENGINE_DEFAULT_SERVICE_ZONE
) => {
    if (rule) {
        const ruleObject = rule.toObject ? rule.toObject() : rule;

        return {
            id: getId(ruleObject),
            ruleCode: ruleObject.ruleCode || null,
            label: ruleObject.label || FARE_VEHICLE_PRICING[ruleObject.vehicleType]?.label || ruleObject.vehicleType,
            vehicleType: ruleObject.vehicleType,
            serviceZone: normalizeServiceZone(ruleObject.serviceZone),
            source: ruleObject.source || PRICING_ENGINE_RULE_SOURCES.ACTIVE_RULE,
            pricing: normalizePricingAmounts(ruleObject.pricing),
            surgeRules: normalizeSurgeRules(ruleObject.surgeRules),
            status: ruleObject.status || null,
            effectiveFrom: ruleObject.effectiveFrom || null,
            effectiveUntil: ruleObject.effectiveUntil || null
        };
    }

    return baselinePricingRuleFor(vehicleType, serviceZone);
};

export const baselinePricingRuleFor = (
    vehicleType,
    serviceZone = PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    source = PRICING_ENGINE_RULE_SOURCES.BASELINE
) => {
    const pricing = FARE_VEHICLE_PRICING[vehicleType];

    if (!pricing) {
        throw new Error('Unsupported vehicle type');
    }

    return {
        id: `baseline-${vehicleType}`,
        ruleCode: `BASELINE-${vehicleType.toUpperCase()}`,
        label: pricing.label,
        vehicleType,
        serviceZone: normalizeServiceZone(serviceZone),
        source,
        pricing: normalizePricingAmounts({
            currency: FARE_CURRENCY,
            baseFare: pricing.baseFare,
            perKm: pricing.perKm,
            perMinute: pricing.perMinute,
            minimumFare: pricing.minimumFare,
            platformFee: pricing.platformFee,
            taxRate: FARE_TAX_RATE,
            averageSpeedKmph: pricing.averageSpeedKmph
        }),
        surgeRules: PRICING_ENGINE_DEFAULT_SURGE_RULES,
        status: 'active',
        effectiveFrom: null,
        effectiveUntil: null
    };
};

export const calculateRouteDistanceKm = (pickup, dropoff) => calculateCoreRouteDistanceKm([pickup, dropoff]);

export const calculateDurationMinutes = (distanceKm, pricing, requestedAt = new Date()) => (
    calculateRouteDurationMinutes(distanceKm, {
        averageSpeedKmph: pricing.averageSpeedKmph,
        requestedAt
    }).estimatedMinutes
);

export const calculatePricingSurge = (surgeRules = {}, requestedAt = new Date()) => {
    const rules = normalizeSurgeRules(surgeRules);
    const hour = normalizeDate(requestedAt).getHours();
    let multiplier = 1;
    let level = FARE_SURGE_LEVELS.NORMAL;
    let reason = 'Demand and driver availability are normal';

    if (hour >= 17 && hour <= 21) {
        multiplier = rules.eveningPeakMultiplier;
        level = multiplier >= 1.3 ? FARE_SURGE_LEVELS.HIGH : FARE_SURGE_LEVELS.MODERATE;
        reason = 'Evening commute demand is higher than usual';
    } else if (hour >= 8 && hour <= 10) {
        multiplier = rules.morningPeakMultiplier;
        level = multiplier > 1 ? FARE_SURGE_LEVELS.MODERATE : FARE_SURGE_LEVELS.NORMAL;
        reason = 'Morning commute demand is above normal';
    } else if (hour >= 22 || hour <= 5) {
        multiplier = rules.lateNightMultiplier;
        level = multiplier > 1 ? FARE_SURGE_LEVELS.MODERATE : FARE_SURGE_LEVELS.NORMAL;
        reason = 'Late-night driver availability is lower';
    }

    return {
        multiplier: roundMultiplier(Math.min(multiplier, rules.maxSurgeMultiplier)),
        level,
        reason
    };
};

export const calculatePricingBreakdown = ({ pricing, distanceKm, durationMinutes, surgeMultiplier }) => {
    const baseFare = pricing.baseFare;
    const distanceFare = roundMoney(distanceKm * pricing.perKm);
    const timeFare = roundMoney(durationMinutes * pricing.perMinute);
    const meteredFare = roundMoney(baseFare + distanceFare + timeFare);
    const minimumAdjustedFare = Math.max(meteredFare, pricing.minimumFare);
    const minFareAdjustment = roundMoney(minimumAdjustedFare - meteredFare);
    const surgeFare = roundMoney(minimumAdjustedFare * (surgeMultiplier - 1));
    const platformFee = pricing.platformFee;
    const taxes = roundMoney((minimumAdjustedFare + surgeFare + platformFee) * pricing.taxRate);
    const totalFare = roundMoney(minimumAdjustedFare + surgeFare + platformFee + taxes);

    return {
        currency: pricing.currency,
        baseFare,
        distanceFare,
        timeFare,
        minFareAdjustment,
        surgeFare,
        platformFee,
        taxes,
        totalFare
    };
};

export const calculatePricingConfidence = ({ distanceKm, requestedAt, surge, now = new Date() }) => {
    const factors = [];
    let score = 94;

    if (surge.multiplier >= 1.3) {
        score -= 14;
        factors.push('Peak demand can move prices quickly');
    } else if (surge.multiplier > 1) {
        score -= 8;
        factors.push('Demand is above normal');
    }

    if (distanceKm > 25) {
        score -= 7;
        factors.push('Longer routes can vary with traffic and route choice');
    }

    if (distanceKm < 1.5) {
        score -= 5;
        factors.push('Short rides are more sensitive to minimum fare rules');
    }

    if (normalizeDate(requestedAt).getTime() - normalizeDate(now).getTime() > 30 * 60 * 1000) {
        score -= 5;
        factors.push('Future estimates can shift before pickup time');
    }

    const normalizedScore = clamp(score, 0, 100);

    return {
        score: normalizedScore,
        level: getConfidenceLevel(normalizedScore),
        factors: factors.length ? factors : ['Stable local demand and standard route distance']
    };
};

const calculateAlternativePickups = ({ pickup, currentTotalFare, surge }) => {
    const savingsRates = surge.multiplier > 1 ? [0.08, 0.05] : [0.03, 0.02];

    return [
        createAlternativePickup({
            label: 'Pickup 250m north',
            pickup,
            northMeters: 250,
            eastMeters: 0,
            walkingDistanceMeters: 250,
            savingsRate: savingsRates[0],
            currentTotalFare,
            reason: 'Nearby pickup may avoid a busier demand pocket'
        }),
        createAlternativePickup({
            label: 'Pickup 400m east',
            pickup,
            northMeters: 0,
            eastMeters: 400,
            walkingDistanceMeters: 400,
            savingsRate: savingsRates[1],
            currentTotalFare,
            reason: 'Slightly quieter pickup point with similar route distance'
        })
    ];
};

const createAlternativePickup = ({
    label,
    pickup,
    northMeters,
    eastMeters,
    walkingDistanceMeters,
    savingsRate,
    currentTotalFare,
    reason
}) => {
    const shiftedPickup = shiftLocation(pickup, northMeters, eastMeters);
    const estimatedSavings = roundMoney(currentTotalFare * savingsRate);

    return {
        label,
        pickup: shiftedPickup,
        walkingDistanceMeters,
        estimatedSavings,
        estimatedFare: roundMoney(Math.max(currentTotalFare - estimatedSavings, 0)),
        reason
    };
};

const buildPricingGuidance = ({ surge, confidence, breakdown }) => ({
    withinMinimumFare: breakdown.minFareAdjustment > 0,
    highSurge: surge.level === FARE_SURGE_LEVELS.HIGH,
    confidenceLevel: confidence.level,
    nextAction: resolveNextAction({ surge, confidence, breakdown })
});

const resolveNextAction = ({ surge, confidence, breakdown }) => {
    if (surge.level === FARE_SURGE_LEVELS.HIGH) {
        return 'Show surge impact clearly before booking';
    }

    if (confidence.level === FARE_CONFIDENCE_LEVELS.LOW) {
        return 'Ask user to review fare variability before locking';
    }

    if (breakdown.minFareAdjustment > 0) {
        return 'Explain minimum fare adjustment in fare breakdown';
    }

    return 'Pricing output is within normal policy range';
};

const toQuoteRuleSnapshot = (rule) => ({
    id: rule.id,
    ruleCode: rule.ruleCode,
    label: rule.label,
    source: rule.source,
    serviceZone: rule.serviceZone,
    vehicleType: rule.vehicleType,
    effectiveFrom: rule.effectiveFrom,
    effectiveUntil: rule.effectiveUntil
});

const normalizeLocation = (location = {}) => ({
    ...(location.address ? { address: location.address.trim() } : {}),
    latitude: location.latitude,
    longitude: location.longitude
});

const normalizePricingAmounts = (pricing = {}) => ({
    currency: pricing.currency || FARE_CURRENCY,
    baseFare: pricing.baseFare,
    perKm: pricing.perKm,
    perMinute: pricing.perMinute,
    minimumFare: pricing.minimumFare,
    platformFee: pricing.platformFee,
    taxRate: pricing.taxRate ?? FARE_TAX_RATE,
    averageSpeedKmph: pricing.averageSpeedKmph
});

const normalizeSurgeRules = (surgeRules = {}) => ({
    ...PRICING_ENGINE_DEFAULT_SURGE_RULES,
    ...(surgeRules || {})
});

const normalizeServiceZone = (serviceZone) => serviceZone?.trim?.().toLowerCase() || PRICING_ENGINE_DEFAULT_SERVICE_ZONE;

const getConfidenceLevel = (score) => {
    if (score >= 85) {
        return FARE_CONFIDENCE_LEVELS.HIGH;
    }

    if (score >= 70) {
        return FARE_CONFIDENCE_LEVELS.MEDIUM;
    }

    return FARE_CONFIDENCE_LEVELS.LOW;
};

const shiftLocation = (location, northMeters, eastMeters) => {
    const latitudeOffset = northMeters / 111320;
    const longitudeScale = 111320 * Math.cos(degreesToRadians(location.latitude));
    const longitudeOffset = longitudeScale === 0 ? 0 : eastMeters / longitudeScale;

    return {
        ...(location.address ? { address: location.address } : {}),
        latitude: roundCoordinate(location.latitude + latitudeOffset),
        longitude: roundCoordinate(location.longitude + longitudeOffset)
    };
};

const normalizeDate = (value) => value instanceof Date ? value : new Date(value);

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

const roundMoney = (value) => Number(value.toFixed(2));

const roundDistance = (value) => Number(value.toFixed(2));

const roundCoordinate = (value) => Number(value.toFixed(6));

const roundMultiplier = (value) => Number(value.toFixed(2));

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

export const allPricingEngineVehicleTypes = () => Object.values(FARE_VEHICLE_TYPES);
