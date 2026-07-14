import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import { FARE_SURGE_LEVELS } from '../../public/fare/fare.constants.js';
import {
    SURGE_DECISION_TYPES,
    SURGE_DEFAULT_COOLDOWN_MINUTES,
    SURGE_DEFAULT_MAX_MULTIPLIER,
    SURGE_DEFAULT_SERVICE_ZONE,
    SURGE_LEVEL_THRESHOLDS,
    SURGE_RULE_STATUSES
} from './surge.constants.js';
import {
    toSurgeDashboard,
    toSurgeOptions,
    toSurgeRule,
    toSurgeRuleList,
    toSurgeSimulation
} from './dto/surge.dto.js';

export default class SurgeService {
    constructor({ surgeDao, now = () => new Date() }) {
        this.surgeDao = surgeDao;
        this.now = now;
    }

    options(authContext) {
        this.assertSurgeReadContext(authContext);

        return buildSuccessResponse({
            message: 'Surge options fetched successfully',
            data: {
                options: toSurgeOptions()
            }
        });
    }

    async dashboard(authContext) {
        await this.getSurgeUserContext(authContext, { write: false });
        const rules = toPlainArray(await this.surgeDao.findDashboardRules({ limit: 50 }))
            .map((rule) => normalizeRule(rule, this.now()));

        return buildSuccessResponse({
            message: 'Surge dashboard fetched successfully',
            data: {
                dashboard: toSurgeDashboard(rules)
            }
        });
    }

    async listRules(authContext, query = {}) {
        await this.getSurgeUserContext(authContext, { write: false });
        const rules = toPlainArray(await this.surgeDao.findRules({
            ...query,
            limit: query.limit || 25
        })).map((rule) => normalizeRule(rule, this.now()));

        return buildSuccessResponse({
            message: 'Surge rules fetched successfully',
            data: {
                surge: toSurgeRuleList(rules)
            }
        });
    }

    async getRule(authContext, ruleId) {
        await this.getSurgeUserContext(authContext, { write: false });
        const rule = await this.findRule(ruleId);

        return buildSuccessResponse({
            message: 'Surge rule fetched successfully',
            data: {
                rule: toSurgeRule(rule)
            }
        });
    }

    async createRule(authContext, payload) {
        const actor = await this.getSurgeUserContext(authContext, { write: true });
        const now = this.now();
        const normalizedPayload = normalizeCreatePayload(payload, {
            actor,
            now
        });

        let rule;

        try {
            rule = normalizeRule(toPlainObject(await this.surgeDao.createRule(normalizedPayload)), now);
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('Surge rule already exists with this code');
            }

            throw err;
        }

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Surge rule created successfully',
            data: {
                rule: toSurgeRule(rule)
            }
        });
    }

    async updateRule(authContext, ruleId, payload) {
        const actor = await this.getSurgeUserContext(authContext, { write: true });
        const existingRule = await this.findRule(ruleId);

        assertRuleEditable(existingRule);

        const updatePayload = normalizeUpdatePayload(existingRule, payload, {
            actor
        });
        const updatedRule = await this.updateSurgeRule(ruleId, updatePayload);

        return buildSuccessResponse({
            message: 'Surge rule updated successfully',
            data: {
                rule: toSurgeRule(updatedRule)
            }
        });
    }

    async activateRule(authContext, ruleId) {
        const actor = await this.getSurgeUserContext(authContext, { write: true });
        const existingRule = await this.findRule(ruleId);

        if (![SURGE_RULE_STATUSES.DRAFT, SURGE_RULE_STATUSES.SCHEDULED, SURGE_RULE_STATUSES.PAUSED].includes(existingRule.status)) {
            throw AppError.badRequest('Only draft, scheduled, or paused surge rules can be activated');
        }

        if (new Date(existingRule.endsAt) <= this.now()) {
            throw AppError.badRequest('Expired surge rules cannot be activated');
        }

        const activatedRule = await this.updateSurgeRule(ruleId, {
            status: SURGE_RULE_STATUSES.ACTIVE,
            currentMultiplier: existingRule.baseMultiplier,
            level: resolveSurgeLevel(existingRule.baseMultiplier),
            activatedAt: this.now(),
            pausedAt: null,
            endedAt: null,
            archivedAt: null,
            updatedBy: getId(actor)
        });

        return buildSuccessResponse({
            message: 'Surge rule activated successfully',
            data: {
                rule: toSurgeRule(activatedRule)
            }
        });
    }

    async pauseRule(authContext, ruleId) {
        const actor = await this.getSurgeUserContext(authContext, { write: true });
        const existingRule = await this.findRule(ruleId);

        if (existingRule.status !== SURGE_RULE_STATUSES.ACTIVE) {
            throw AppError.badRequest('Only active surge rules can be paused');
        }

        const pausedRule = await this.updateSurgeRule(ruleId, {
            status: SURGE_RULE_STATUSES.PAUSED,
            pausedAt: this.now(),
            updatedBy: getId(actor)
        });

        return buildSuccessResponse({
            message: 'Surge rule paused successfully',
            data: {
                rule: toSurgeRule(pausedRule)
            }
        });
    }

    async endRule(authContext, ruleId) {
        const actor = await this.getSurgeUserContext(authContext, { write: true });
        const existingRule = await this.findRule(ruleId);

        if (![SURGE_RULE_STATUSES.ACTIVE, SURGE_RULE_STATUSES.PAUSED, SURGE_RULE_STATUSES.SCHEDULED].includes(existingRule.status)) {
            throw AppError.badRequest('Only active, paused, or scheduled surge rules can be ended');
        }

        const endedRule = await this.updateSurgeRule(ruleId, {
            status: SURGE_RULE_STATUSES.ENDED,
            endedAt: this.now(),
            updatedBy: getId(actor)
        });

        return buildSuccessResponse({
            message: 'Surge rule ended successfully',
            data: {
                rule: toSurgeRule(endedRule)
            }
        });
    }

    async archiveRule(authContext, ruleId) {
        const actor = await this.getSurgeUserContext(authContext, { write: true });
        const existingRule = await this.findRule(ruleId);

        if (existingRule.status === SURGE_RULE_STATUSES.ACTIVE) {
            throw AppError.badRequest('Active surge rules must be ended or paused before archiving');
        }

        if (existingRule.status === SURGE_RULE_STATUSES.ARCHIVED) {
            throw AppError.badRequest('Surge rule is already archived');
        }

        const archivedRule = await this.updateSurgeRule(ruleId, {
            status: SURGE_RULE_STATUSES.ARCHIVED,
            archivedAt: this.now(),
            updatedBy: getId(actor)
        });

        return buildSuccessResponse({
            message: 'Surge rule archived successfully',
            data: {
                rule: toSurgeRule(archivedRule)
            }
        });
    }

    async simulate(authContext, payload) {
        await this.getSurgeUserContext(authContext, { write: false });
        const requestedAt = payload.requestedAt || this.now();
        const rule = payload.ruleId
            ? await this.findRule(payload.ruleId)
            : await this.findSimulationRule({
                serviceZone: payload.serviceZone,
                vehicleType: payload.vehicleType,
                requestedAt
            });
        const simulation = simulateSurge(rule, {
            requestedAt,
            serviceZone: payload.serviceZone,
            vehicleType: payload.vehicleType || rule.vehicleTypes[0],
            baseFare: payload.baseFare || 0,
            demandScore: payload.demandScore,
            supplyScore: payload.supplyScore
        });

        return buildSuccessResponse({
            message: 'Surge simulation completed successfully',
            data: toSurgeSimulation({
                rule,
                simulation
            })
        });
    }

    async findSimulationRule({ serviceZone, vehicleType, requestedAt }) {
        const normalizedServiceZone = normalizeServiceZone(serviceZone);
        const activeRule = normalizeRule(toPlainObject(await this.surgeDao.findActiveRule({
            serviceZone: normalizedServiceZone,
            vehicleType,
            now: requestedAt
        })), requestedAt);

        if (activeRule) {
            return activeRule;
        }

        if (normalizedServiceZone !== SURGE_DEFAULT_SERVICE_ZONE) {
            const defaultRule = normalizeRule(toPlainObject(await this.surgeDao.findActiveRule({
                serviceZone: SURGE_DEFAULT_SERVICE_ZONE,
                vehicleType,
                now: requestedAt
            })), requestedAt);

            if (defaultRule) {
                return defaultRule;
            }
        }

        return baselineSurgeRule(vehicleType, requestedAt);
    }

    async findRule(ruleId) {
        const rule = normalizeRule(toPlainObject(await this.surgeDao.findById(ruleId)), this.now());

        if (!rule) {
            throw AppError.notFound('Surge rule not found');
        }

        return rule;
    }

    async updateSurgeRule(ruleId, payload) {
        const updatedRule = normalizeRule(toPlainObject(await this.surgeDao.updateRule(ruleId, payload)), this.now());

        if (!updatedRule) {
            throw AppError.notFound('Surge rule not found');
        }

        return updatedRule;
    }

    async getSurgeUserContext(authContext, { write = false } = {}) {
        if (write) {
            this.assertSurgeWriteContext(authContext);
        } else {
            this.assertSurgeReadContext(authContext);
        }

        const privateUser = toPlainObject(await this.surgeDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertSurgeReadContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Surge private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.PRICING_READ)) {
            throw AppError.forbidden('Surge read permission is required');
        }

        return authContext;
    }

    assertSurgeWriteContext(authContext) {
        this.assertSurgeReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.PRICING_WRITE)) {
            throw AppError.forbidden('Surge write permission is required');
        }
    }
}

const normalizeCreatePayload = (payload = {}, { actor, now }) => {
    const baseMultiplier = payload.baseMultiplier;

    return {
        surgeCode: createSurgeCode(payload.serviceZone, payload.trigger, now),
        label: payload.label.trim(),
        description: payload.description?.trim() || null,
        serviceZone: normalizeServiceZone(payload.serviceZone),
        vehicleTypes: uniqueStrings(payload.vehicleTypes),
        trigger: payload.trigger,
        decisionType: payload.decisionType || SURGE_DECISION_TYPES.MANUAL,
        baseMultiplier,
        maxMultiplier: payload.maxMultiplier || SURGE_DEFAULT_MAX_MULTIPLIER,
        currentMultiplier: baseMultiplier,
        level: resolveSurgeLevel(baseMultiplier),
        status: resolveInitialStatus(payload.startsAt, now),
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        cooldownMinutes: payload.cooldownMinutes ?? SURGE_DEFAULT_COOLDOWN_MINUTES,
        reason: payload.reason.trim(),
        customerMessage: payload.customerMessage?.trim() || null,
        signals: normalizeSignals(payload.signals),
        notes: payload.notes?.trim() || null,
        createdBy: getId(actor),
        updatedBy: getId(actor)
    };
};

const normalizeUpdatePayload = (existingRule, payload = {}, { actor }) => {
    const baseMultiplier = payload.baseMultiplier ?? existingRule.baseMultiplier;
    const maxMultiplier = payload.maxMultiplier ?? existingRule.maxMultiplier;

    if (maxMultiplier < baseMultiplier) {
        throw AppError.badRequest('maxMultiplier must be greater than or equal to baseMultiplier');
    }

    return {
        ...(payload.label !== undefined ? { label: payload.label.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
        ...(payload.serviceZone !== undefined ? { serviceZone: normalizeServiceZone(payload.serviceZone) } : {}),
        ...(payload.vehicleTypes !== undefined ? { vehicleTypes: uniqueStrings(payload.vehicleTypes) } : {}),
        ...(payload.trigger !== undefined ? { trigger: payload.trigger } : {}),
        ...(payload.decisionType !== undefined ? { decisionType: payload.decisionType } : {}),
        ...(payload.baseMultiplier !== undefined ? {
            baseMultiplier,
            currentMultiplier: Math.min(baseMultiplier, maxMultiplier),
            level: resolveSurgeLevel(Math.min(baseMultiplier, maxMultiplier))
        } : {}),
        ...(payload.maxMultiplier !== undefined ? { maxMultiplier } : {}),
        ...(payload.startsAt !== undefined ? { startsAt: payload.startsAt } : {}),
        ...(payload.endsAt !== undefined ? { endsAt: payload.endsAt } : {}),
        ...(payload.cooldownMinutes !== undefined ? { cooldownMinutes: payload.cooldownMinutes } : {}),
        ...(payload.reason !== undefined ? { reason: payload.reason.trim() } : {}),
        ...(payload.customerMessage !== undefined ? { customerMessage: payload.customerMessage?.trim() || null } : {}),
        ...(payload.signals !== undefined ? { signals: normalizeSignals({ ...existingRule.signals, ...payload.signals }) } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes?.trim() || null } : {}),
        updatedBy: getId(actor)
    };
};

const normalizeRule = (rule, now = new Date()) => {
    if (!rule) {
        return null;
    }

    const normalizedRule = {
        ...rule,
        serviceZone: rule.serviceZone || SURGE_DEFAULT_SERVICE_ZONE,
        vehicleTypes: Array.isArray(rule.vehicleTypes) ? rule.vehicleTypes : [],
        decisionType: rule.decisionType || SURGE_DECISION_TYPES.MANUAL,
        baseMultiplier: rule.baseMultiplier || 1,
        maxMultiplier: rule.maxMultiplier || SURGE_DEFAULT_MAX_MULTIPLIER,
        currentMultiplier: rule.currentMultiplier || rule.baseMultiplier || 1,
        level: rule.level || resolveSurgeLevel(rule.currentMultiplier || rule.baseMultiplier || 1),
        status: rule.status || SURGE_RULE_STATUSES.DRAFT,
        cooldownMinutes: rule.cooldownMinutes ?? SURGE_DEFAULT_COOLDOWN_MINUTES,
        signals: normalizeSignals(rule.signals)
    };

    if (
        normalizedRule.status === SURGE_RULE_STATUSES.ACTIVE
        && normalizedRule.endsAt
        && new Date(normalizedRule.endsAt) <= now
    ) {
        return {
            ...normalizedRule,
            status: SURGE_RULE_STATUSES.ENDED
        };
    }

    return normalizedRule;
};

const normalizeSignals = (signals = {}) => ({
    demandScore: signals?.demandScore || 0,
    supplyScore: signals?.supplyScore ?? 100,
    cancellationRiskScore: signals?.cancellationRiskScore || 0,
    activeDrivers: signals?.activeDrivers || 0,
    pendingRequests: signals?.pendingRequests || 0
});

const assertRuleEditable = (rule = {}) => {
    if (![SURGE_RULE_STATUSES.DRAFT, SURGE_RULE_STATUSES.PAUSED].includes(rule.status)) {
        throw AppError.badRequest('Only draft or paused surge rules can be edited');
    }
};

const resolveInitialStatus = (startsAt, now) => (
    new Date(startsAt) > now ? SURGE_RULE_STATUSES.SCHEDULED : SURGE_RULE_STATUSES.DRAFT
);

const simulateSurge = (rule, { requestedAt, serviceZone, vehicleType, baseFare, demandScore, supplyScore }) => {
    const isWithinWindow = new Date(rule.startsAt) <= requestedAt && requestedAt < new Date(rule.endsAt);
    const applied = rule.status === SURGE_RULE_STATUSES.ACTIVE && isWithinWindow;
    const signalMultiplier = resolveSignalMultiplier({
        baseMultiplier: rule.currentMultiplier,
        maxMultiplier: rule.maxMultiplier,
        demandScore: demandScore ?? rule.signals.demandScore,
        supplyScore: supplyScore ?? rule.signals.supplyScore
    });
    const multiplier = applied ? signalMultiplier : 1;
    const level = resolveSurgeLevel(multiplier);
    const addedFare = roundMoney(baseFare * (multiplier - 1));

    return {
        requestedAt,
        serviceZone: serviceZone || rule.serviceZone,
        vehicleType,
        multiplier,
        level,
        applied,
        fareImpact: {
            baseFare,
            addedFare,
            estimatedFare: roundMoney(baseFare + addedFare)
        },
        guidance: {
            withinWindow: isWithinWindow,
            cappedByMaxMultiplier: signalMultiplier >= rule.maxMultiplier,
            nextAction: applied
                ? 'Surge would apply to this ride'
                : 'Surge would not apply for this ride'
        }
    };
};

const resolveSignalMultiplier = ({ baseMultiplier, maxMultiplier, demandScore = 0, supplyScore = 100 }) => {
    const demandBoost = demandScore >= 85 ? 0.12 : demandScore >= 70 ? 0.06 : 0;
    const supplyBoost = supplyScore <= 20 ? 0.12 : supplyScore <= 40 ? 0.06 : 0;

    return Math.min(roundMultiplier(baseMultiplier + demandBoost + supplyBoost), maxMultiplier);
};

const resolveSurgeLevel = (multiplier) => {
    if (multiplier >= SURGE_LEVEL_THRESHOLDS[FARE_SURGE_LEVELS.HIGH]) {
        return FARE_SURGE_LEVELS.HIGH;
    }

    if (multiplier >= SURGE_LEVEL_THRESHOLDS[FARE_SURGE_LEVELS.MODERATE]) {
        return FARE_SURGE_LEVELS.MODERATE;
    }

    return FARE_SURGE_LEVELS.NORMAL;
};

const baselineSurgeRule = (vehicleType, requestedAt) => ({
    id: `baseline-surge-${vehicleType}`,
    surgeCode: `BASELINE-SURGE-${vehicleType.toUpperCase()}`,
    label: 'Baseline no-surge policy',
    serviceZone: SURGE_DEFAULT_SERVICE_ZONE,
    vehicleTypes: [vehicleType],
    trigger: 'manual',
    decisionType: SURGE_DECISION_TYPES.MANUAL,
    baseMultiplier: 1,
    maxMultiplier: 1,
    currentMultiplier: 1,
    level: FARE_SURGE_LEVELS.NORMAL,
    status: SURGE_RULE_STATUSES.ACTIVE,
    startsAt: new Date(0),
    endsAt: new Date(requestedAt.getTime() + 60 * 60 * 1000),
    reason: 'No active surge rule matched this request',
    signals: normalizeSignals(),
    createdAt: null,
    updatedAt: null
});

const createSurgeCode = (serviceZone, trigger, date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const normalizedZone = normalizeServiceZone(serviceZone).replace(/[^a-z0-9]+/g, '-').toUpperCase();

    return `SURGE-${normalizedZone}-${trigger.toUpperCase()}-${compactTimestamp}`;
};

const normalizeServiceZone = (serviceZone) => serviceZone?.trim?.().toLowerCase() || SURGE_DEFAULT_SERVICE_ZONE;

const uniqueStrings = (items = []) => [...new Set(items.filter(Boolean))];

const roundMoney = (value) => Number(value.toFixed(2));

const roundMultiplier = (value) => Number(value.toFixed(2));

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
