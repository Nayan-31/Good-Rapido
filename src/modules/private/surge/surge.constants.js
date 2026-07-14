import {
    FARE_SURGE_LEVELS,
    FARE_VEHICLE_TYPES
} from '../../public/fare/fare.constants.js';
import { PRICING_DEFAULT_SERVICE_ZONE } from '../pricing/pricing.constants.js';

export const SURGE_RULE_STATUSES = Object.freeze({
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ENDED: 'ended',
    ARCHIVED: 'archived'
});

export const SURGE_TRIGGERS = Object.freeze({
    DEMAND_SPIKE: 'demand_spike',
    DRIVER_SHORTAGE: 'driver_shortage',
    WEATHER: 'weather',
    EVENT: 'event',
    TRAFFIC: 'traffic',
    MANUAL: 'manual'
});

export const SURGE_DECISION_TYPES = Object.freeze({
    AUTOMATIC: 'automatic',
    MANUAL: 'manual'
});

export const SURGE_DEFAULT_SERVICE_ZONE = PRICING_DEFAULT_SERVICE_ZONE;

export const SURGE_MIN_MULTIPLIER = 1;
export const SURGE_MAX_MULTIPLIER = 5;
export const SURGE_DEFAULT_MAX_MULTIPLIER = 1.8;
export const SURGE_DEFAULT_COOLDOWN_MINUTES = 15;

export const SURGE_LEVEL_THRESHOLDS = Object.freeze({
    [FARE_SURGE_LEVELS.NORMAL]: 1,
    [FARE_SURGE_LEVELS.MODERATE]: 1.15,
    [FARE_SURGE_LEVELS.HIGH]: 1.3
});

export const SURGE_BASELINE_VEHICLE_TYPES = Object.freeze(Object.values(FARE_VEHICLE_TYPES));
export const SURGE_LEVELS = Object.freeze(Object.values(FARE_SURGE_LEVELS));
