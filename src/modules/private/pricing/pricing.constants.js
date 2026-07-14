import {
    FARE_CURRENCY,
    FARE_SURGE_LEVELS,
    FARE_TAX_RATE,
    FARE_VEHICLE_PRICING,
    FARE_VEHICLE_TYPES
} from '../../public/fare/fare.constants.js';

export const PRICING_RULE_STATUSES = Object.freeze({
    DRAFT: 'draft',
    ACTIVE: 'active',
    ARCHIVED: 'archived'
});

export const PRICING_DEFAULT_SERVICE_ZONE = 'default';

export const PRICING_SURGE_WINDOWS = Object.freeze({
    MORNING_PEAK: 'morning_peak',
    EVENING_PEAK: 'evening_peak',
    LATE_NIGHT: 'late_night'
});

export const PRICING_DEFAULT_SURGE_RULES = Object.freeze({
    morningPeakMultiplier: 1.18,
    eveningPeakMultiplier: 1.32,
    lateNightMultiplier: 1.12,
    maxSurgeMultiplier: 1.8
});

export const PRICING_BASELINE_RULES = Object.freeze(
    Object.values(FARE_VEHICLE_TYPES).map((vehicleType) => Object.freeze({
        vehicleType,
        serviceZone: PRICING_DEFAULT_SERVICE_ZONE,
        currency: FARE_CURRENCY,
        taxRate: FARE_TAX_RATE,
        ...FARE_VEHICLE_PRICING[vehicleType],
        surgeRules: PRICING_DEFAULT_SURGE_RULES
    }))
);

export const PRICING_SIMULATION_SURGE_LEVELS = Object.freeze(Object.values(FARE_SURGE_LEVELS));
