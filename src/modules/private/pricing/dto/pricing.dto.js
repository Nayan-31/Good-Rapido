import {
    FARE_CURRENCY,
    FARE_SURGE_LEVELS,
    FARE_VEHICLE_TYPES
} from '../../../public/fare/fare.constants.js';
import {
    PRICING_BASELINE_RULES,
    PRICING_DEFAULT_SERVICE_ZONE,
    PRICING_DEFAULT_SURGE_RULES,
    PRICING_RULE_STATUSES,
    PRICING_SURGE_WINDOWS
} from '../pricing.constants.js';

export const toPricingOptions = () => ({
    vehicleTypes: Object.values(FARE_VEHICLE_TYPES),
    statuses: Object.values(PRICING_RULE_STATUSES),
    currency: FARE_CURRENCY,
    defaultServiceZone: PRICING_DEFAULT_SERVICE_ZONE,
    surgeLevels: Object.values(FARE_SURGE_LEVELS),
    surgeWindows: Object.values(PRICING_SURGE_WINDOWS),
    defaultSurgeRules: PRICING_DEFAULT_SURGE_RULES,
    baselineRules: PRICING_BASELINE_RULES
});

export const toPricingDashboard = (rules = []) => ({
    summary: toPricingSummary(rules),
    activeRules: rules
        .filter((rule) => rule.status === PRICING_RULE_STATUSES.ACTIVE)
        .map(toPricingRuleListItem),
    recentRules: [...rules]
        .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
        .slice(0, 8)
        .map(toPricingRuleListItem)
});

export const toPricingRuleList = (rules = []) => ({
    rules: rules.map(toPricingRuleListItem),
    summary: toPricingSummary(rules)
});

export const toPricingRuleListItem = (rule = {}) => ({
    id: getId(rule),
    ruleCode: rule.ruleCode || null,
    label: rule.label || null,
    vehicleType: rule.vehicleType || null,
    serviceZone: rule.serviceZone || PRICING_DEFAULT_SERVICE_ZONE,
    status: rule.status || PRICING_RULE_STATUSES.DRAFT,
    baseFare: numberOrZero(rule.pricing?.baseFare),
    perKm: numberOrZero(rule.pricing?.perKm),
    perMinute: numberOrZero(rule.pricing?.perMinute),
    minimumFare: numberOrZero(rule.pricing?.minimumFare),
    platformFee: numberOrZero(rule.pricing?.platformFee),
    effectiveFrom: rule.effectiveFrom || null,
    effectiveUntil: rule.effectiveUntil || null,
    activatedAt: rule.activatedAt || null,
    archivedAt: rule.archivedAt || null,
    updatedAt: rule.updatedAt || null,
    guidance: toPricingGuidance(rule)
});

export const toPricingRule = (rule = {}) => ({
    ...toPricingRuleListItem(rule),
    description: rule.description || null,
    pricing: toPricingAmounts(rule.pricing),
    surgeRules: toSurgeRules(rule.surgeRules),
    notes: rule.notes || null,
    createdBy: toId(rule.createdBy),
    updatedBy: toId(rule.updatedBy),
    createdAt: rule.createdAt || null
});

export const toPricingSimulation = ({ rule, simulation }) => ({
    rule: toPricingRuleListItem(rule),
    simulation: {
        currency: simulation.currency,
        distanceKm: simulation.distanceKm,
        durationMinutes: simulation.durationMinutes,
        surge: simulation.surge,
        breakdown: simulation.breakdown,
        estimatedTotal: simulation.breakdown.totalFare,
        guidance: simulation.guidance
    }
});

const toPricingAmounts = (pricing = {}) => ({
    currency: pricing.currency || FARE_CURRENCY,
    baseFare: numberOrZero(pricing.baseFare),
    perKm: numberOrZero(pricing.perKm),
    perMinute: numberOrZero(pricing.perMinute),
    minimumFare: numberOrZero(pricing.minimumFare),
    platformFee: numberOrZero(pricing.platformFee),
    taxRate: Number.isFinite(pricing.taxRate) ? pricing.taxRate : 0,
    averageSpeedKmph: numberOrZero(pricing.averageSpeedKmph)
});

const toSurgeRules = (surgeRules = {}) => ({
    ...PRICING_DEFAULT_SURGE_RULES,
    ...(surgeRules || {})
});

const toPricingSummary = (rules = []) => ({
    totalRules: rules.length,
    draftRules: countByStatus(rules, PRICING_RULE_STATUSES.DRAFT),
    activeRules: countByStatus(rules, PRICING_RULE_STATUSES.ACTIVE),
    archivedRules: countByStatus(rules, PRICING_RULE_STATUSES.ARCHIVED),
    vehicleTypesCovered: [...new Set(rules.map((rule) => rule.vehicleType).filter(Boolean))],
    serviceZonesCovered: [...new Set(rules.map((rule) => rule.serviceZone || PRICING_DEFAULT_SERVICE_ZONE))]
});

const toPricingGuidance = (rule = {}) => ({
    canEdit: rule.status === PRICING_RULE_STATUSES.DRAFT,
    canActivate: rule.status === PRICING_RULE_STATUSES.DRAFT,
    canArchive: rule.status !== PRICING_RULE_STATUSES.ARCHIVED,
    nextAction: resolveNextAction(rule)
});

const resolveNextAction = (rule = {}) => {
    if (rule.status === PRICING_RULE_STATUSES.ACTIVE) {
        return 'Monitor fare performance';
    }

    if (rule.status === PRICING_RULE_STATUSES.ARCHIVED) {
        return 'Create a new rule if pricing changes are needed';
    }

    return 'Review and activate pricing rule';
};

const countByStatus = (rules = [], status) => rules.filter((rule) => rule.status === status).length;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;
