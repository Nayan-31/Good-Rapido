import {
    FARE_CURRENCY,
    FARE_SURGE_LEVELS,
    FARE_VEHICLE_TYPES
} from '../../../public/fare/fare.constants.js';
import {
    PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    PRICING_ENGINE_DEFAULT_SURGE_RULES,
    PRICING_ENGINE_QUOTE_TYPES,
    PRICING_ENGINE_RULE_SOURCES
} from '../pricing-engine.constants.js';

export const toPricingEngineOptions = () => ({
    vehicleTypes: Object.values(FARE_VEHICLE_TYPES),
    currency: FARE_CURRENCY,
    defaultServiceZone: PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    quoteTypes: Object.values(PRICING_ENGINE_QUOTE_TYPES),
    ruleSources: Object.values(PRICING_ENGINE_RULE_SOURCES),
    surgeLevels: Object.values(FARE_SURGE_LEVELS),
    defaultSurgeRules: PRICING_ENGINE_DEFAULT_SURGE_RULES
});

export const toPricingEngineQuote = (quote = {}) => ({
    quoteType: quote.quoteType || PRICING_ENGINE_QUOTE_TYPES.SINGLE,
    vehicleType: quote.vehicleType || null,
    serviceZone: quote.serviceZone || PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    requestedAt: quote.requestedAt || null,
    pickup: toLocation(quote.pickup),
    dropoff: toLocation(quote.dropoff),
    distanceKm: numberOrZero(quote.distanceKm),
    durationMinutes: numberOrZero(quote.durationMinutes),
    route: toRouteSnapshot(quote.route),
    pricingRule: toPricingRuleSnapshot(quote.pricingRule),
    breakdown: toBreakdown(quote.breakdown),
    surge: toSurge(quote.surge),
    confidence: toConfidence(quote.confidence),
    alternativePickups: (quote.alternativePickups || []).map(toAlternativePickup),
    validity: toValidity(quote.validity),
    guidance: toGuidance(quote.guidance)
});

export const toPricingEngineComparison = ({ quotes = [], requestedAt, serviceZone } = {}) => ({
    quoteType: PRICING_ENGINE_QUOTE_TYPES.COMPARISON,
    serviceZone: serviceZone || PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    requestedAt: requestedAt || null,
    quotes: quotes.map(toPricingEngineQuote),
    recommendedQuote: toRecommendedQuote(quotes),
    summary: {
        totalOptions: quotes.length,
        lowestFare: quotes.length ? Math.min(...quotes.map((quote) => quote.breakdown.totalFare)) : 0,
        highestFare: quotes.length ? Math.max(...quotes.map((quote) => quote.breakdown.totalFare)) : 0,
        highSurgeOptions: quotes.filter((quote) => quote.surge.level === FARE_SURGE_LEVELS.HIGH).length
    }
});

const toRecommendedQuote = (quotes = []) => {
    if (!quotes.length) {
        return null;
    }

    const sortedQuotes = [...quotes].sort((left, right) => {
        if (left.breakdown.totalFare !== right.breakdown.totalFare) {
            return left.breakdown.totalFare - right.breakdown.totalFare;
        }

        return right.confidence.score - left.confidence.score;
    });

    return {
        vehicleType: sortedQuotes[0].vehicleType,
        totalFare: sortedQuotes[0].breakdown.totalFare,
        confidenceScore: sortedQuotes[0].confidence.score,
        reason: 'Lowest fare with transparent confidence scoring'
    };
};

const toLocation = (location = {}) => ({
    address: location.address || null,
    latitude: numberOrZero(location.latitude),
    longitude: numberOrZero(location.longitude)
});

const toPricingRuleSnapshot = (rule = {}) => ({
    id: rule.id || null,
    ruleCode: rule.ruleCode || null,
    label: rule.label || null,
    source: rule.source || PRICING_ENGINE_RULE_SOURCES.BASELINE,
    serviceZone: rule.serviceZone || PRICING_ENGINE_DEFAULT_SERVICE_ZONE,
    vehicleType: rule.vehicleType || null,
    effectiveFrom: rule.effectiveFrom || null,
    effectiveUntil: rule.effectiveUntil || null
});

const toRouteSnapshot = (route = null) => {
    if (!route) {
        return null;
    }

    return {
        providerSource: route.providerSource || null,
        routePreference: route.routePreference || null,
        traffic: {
            level: route.traffic?.level || null,
            multiplier: numberOrZero(route.traffic?.multiplier)
        },
        quality: {
            score: numberOrZero(route.quality?.score),
            level: route.quality?.level || null,
            routeAccuracyScore: numberOrZero(route.quality?.routeAccuracyScore)
        }
    };
};

const toBreakdown = (breakdown = {}) => ({
    currency: breakdown.currency || FARE_CURRENCY,
    baseFare: numberOrZero(breakdown.baseFare),
    distanceFare: numberOrZero(breakdown.distanceFare),
    timeFare: numberOrZero(breakdown.timeFare),
    minFareAdjustment: numberOrZero(breakdown.minFareAdjustment),
    surgeFare: numberOrZero(breakdown.surgeFare),
    platformFee: numberOrZero(breakdown.platformFee),
    taxes: numberOrZero(breakdown.taxes),
    totalFare: numberOrZero(breakdown.totalFare)
});

const toSurge = (surge = {}) => ({
    multiplier: numberOrZero(surge.multiplier),
    level: surge.level || null,
    reason: surge.reason || null
});

const toConfidence = (confidence = {}) => ({
    score: numberOrZero(confidence.score),
    level: confidence.level || null,
    factors: confidence.factors || []
});

const toAlternativePickup = (alternative = {}) => ({
    label: alternative.label || null,
    pickup: toLocation(alternative.pickup),
    walkingDistanceMeters: numberOrZero(alternative.walkingDistanceMeters),
    estimatedSavings: numberOrZero(alternative.estimatedSavings),
    estimatedFare: numberOrZero(alternative.estimatedFare),
    reason: alternative.reason || null
});

const toValidity = (validity = {}) => ({
    validUntil: validity.validUntil || null,
    lockWindowMinutes: numberOrZero(validity.lockWindowMinutes),
    lockExpiresAt: validity.lockExpiresAt || null
});

const toGuidance = (guidance = {}) => ({
    withinMinimumFare: Boolean(guidance.withinMinimumFare),
    highSurge: Boolean(guidance.highSurge),
    confidenceLevel: guidance.confidenceLevel || null,
    nextAction: guidance.nextAction || null
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
