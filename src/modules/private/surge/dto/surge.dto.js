import { FARE_SURGE_LEVELS } from '../../../public/fare/fare.constants.js';
import {
    SURGE_BASELINE_VEHICLE_TYPES,
    SURGE_DECISION_TYPES,
    SURGE_DEFAULT_COOLDOWN_MINUTES,
    SURGE_DEFAULT_MAX_MULTIPLIER,
    SURGE_DEFAULT_SERVICE_ZONE,
    SURGE_LEVELS,
    SURGE_RULE_STATUSES,
    SURGE_TRIGGERS
} from '../surge.constants.js';

export const toSurgeOptions = () => ({
    statuses: Object.values(SURGE_RULE_STATUSES),
    triggers: Object.values(SURGE_TRIGGERS),
    decisionTypes: Object.values(SURGE_DECISION_TYPES),
    levels: SURGE_LEVELS,
    vehicleTypes: SURGE_BASELINE_VEHICLE_TYPES,
    defaultServiceZone: SURGE_DEFAULT_SERVICE_ZONE,
    defaultMaxMultiplier: SURGE_DEFAULT_MAX_MULTIPLIER,
    defaultCooldownMinutes: SURGE_DEFAULT_COOLDOWN_MINUTES
});

export const toSurgeDashboard = (rules = []) => ({
    summary: toSurgeSummary(rules),
    activeRules: rules
        .filter((rule) => rule.status === SURGE_RULE_STATUSES.ACTIVE)
        .map(toSurgeRuleListItem),
    upcomingRules: rules
        .filter((rule) => rule.status === SURGE_RULE_STATUSES.SCHEDULED)
        .map(toSurgeRuleListItem),
    recentRules: [...rules]
        .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
        .slice(0, 8)
        .map(toSurgeRuleListItem)
});

export const toSurgeRuleList = (rules = []) => ({
    rules: rules.map(toSurgeRuleListItem),
    summary: toSurgeSummary(rules)
});

export const toSurgeRuleListItem = (rule = {}) => ({
    id: getId(rule),
    surgeCode: rule.surgeCode || null,
    label: rule.label || null,
    serviceZone: rule.serviceZone || SURGE_DEFAULT_SERVICE_ZONE,
    vehicleTypes: Array.isArray(rule.vehicleTypes) ? rule.vehicleTypes : [],
    trigger: rule.trigger || null,
    decisionType: rule.decisionType || SURGE_DECISION_TYPES.MANUAL,
    currentMultiplier: numberOrOne(rule.currentMultiplier),
    maxMultiplier: numberOrOne(rule.maxMultiplier),
    level: rule.level || FARE_SURGE_LEVELS.NORMAL,
    status: rule.status || SURGE_RULE_STATUSES.DRAFT,
    startsAt: rule.startsAt || null,
    endsAt: rule.endsAt || null,
    reason: rule.reason || null,
    activatedAt: rule.activatedAt || null,
    pausedAt: rule.pausedAt || null,
    endedAt: rule.endedAt || null,
    archivedAt: rule.archivedAt || null,
    updatedAt: rule.updatedAt || null,
    guidance: toSurgeGuidance(rule)
});

export const toSurgeRule = (rule = {}) => ({
    ...toSurgeRuleListItem(rule),
    description: rule.description || null,
    baseMultiplier: numberOrOne(rule.baseMultiplier),
    cooldownMinutes: Number.isFinite(rule.cooldownMinutes) ? rule.cooldownMinutes : SURGE_DEFAULT_COOLDOWN_MINUTES,
    customerMessage: rule.customerMessage || null,
    signals: toSurgeSignals(rule.signals),
    notes: rule.notes || null,
    createdBy: toId(rule.createdBy),
    updatedBy: toId(rule.updatedBy),
    createdAt: rule.createdAt || null
});

export const toSurgeSimulation = ({ rule, simulation }) => ({
    rule: toSurgeRuleListItem(rule),
    simulation: {
        requestedAt: simulation.requestedAt,
        serviceZone: simulation.serviceZone,
        vehicleType: simulation.vehicleType,
        multiplier: simulation.multiplier,
        level: simulation.level,
        fareImpact: simulation.fareImpact,
        applied: simulation.applied,
        guidance: simulation.guidance
    }
});

const toSurgeSummary = (rules = []) => ({
    totalRules: rules.length,
    draftRules: countByStatus(rules, SURGE_RULE_STATUSES.DRAFT),
    scheduledRules: countByStatus(rules, SURGE_RULE_STATUSES.SCHEDULED),
    activeRules: countByStatus(rules, SURGE_RULE_STATUSES.ACTIVE),
    pausedRules: countByStatus(rules, SURGE_RULE_STATUSES.PAUSED),
    endedRules: countByStatus(rules, SURGE_RULE_STATUSES.ENDED),
    archivedRules: countByStatus(rules, SURGE_RULE_STATUSES.ARCHIVED),
    highSurgeRules: rules.filter((rule) => rule.level === FARE_SURGE_LEVELS.HIGH).length,
    maxMultiplier: rules.reduce((max, rule) => Math.max(max, numberOrOne(rule.currentMultiplier)), 1),
    serviceZonesCovered: [...new Set(rules.map((rule) => rule.serviceZone || SURGE_DEFAULT_SERVICE_ZONE))]
});

const toSurgeSignals = (signals = {}) => ({
    demandScore: numberOrZero(signals.demandScore),
    supplyScore: Number.isFinite(signals.supplyScore) ? signals.supplyScore : 100,
    cancellationRiskScore: numberOrZero(signals.cancellationRiskScore),
    activeDrivers: numberOrZero(signals.activeDrivers),
    pendingRequests: numberOrZero(signals.pendingRequests)
});

const toSurgeGuidance = (rule = {}) => ({
    canEdit: [SURGE_RULE_STATUSES.DRAFT, SURGE_RULE_STATUSES.PAUSED].includes(rule.status),
    canActivate: [
        SURGE_RULE_STATUSES.DRAFT,
        SURGE_RULE_STATUSES.SCHEDULED,
        SURGE_RULE_STATUSES.PAUSED
    ].includes(rule.status),
    canPause: rule.status === SURGE_RULE_STATUSES.ACTIVE,
    canEnd: [SURGE_RULE_STATUSES.ACTIVE, SURGE_RULE_STATUSES.PAUSED, SURGE_RULE_STATUSES.SCHEDULED].includes(rule.status),
    canArchive: ![SURGE_RULE_STATUSES.ACTIVE, SURGE_RULE_STATUSES.ARCHIVED].includes(rule.status),
    nextAction: resolveNextAction(rule)
});

const resolveNextAction = (rule = {}) => {
    if (rule.status === SURGE_RULE_STATUSES.ACTIVE) {
        return 'Monitor rider impact and supply recovery';
    }

    if (rule.status === SURGE_RULE_STATUSES.SCHEDULED) {
        return 'Wait for surge window or activate manually';
    }

    if (rule.status === SURGE_RULE_STATUSES.PAUSED) {
        return 'Resume or end the surge rule';
    }

    if (rule.status === SURGE_RULE_STATUSES.ENDED) {
        return 'Archive after review';
    }

    if (rule.status === SURGE_RULE_STATUSES.ARCHIVED) {
        return 'No action needed';
    }

    return 'Review and schedule surge rule';
};

const countByStatus = (rules = [], status) => rules.filter((rule) => rule.status === status).length;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;

const numberOrOne = (value) => Number.isFinite(value) ? value : 1;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const toId = (value) => value?._id?.toString?.() || value?.toString?.() || value || null;
