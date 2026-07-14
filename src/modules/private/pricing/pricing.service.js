import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    FARE_CURRENCY,
    FARE_SURGE_LEVELS,
    FARE_TAX_RATE
} from '../../public/fare/fare.constants.js';
import {
    PRICING_BASELINE_RULES,
    PRICING_DEFAULT_SERVICE_ZONE,
    PRICING_DEFAULT_SURGE_RULES,
    PRICING_RULE_STATUSES
} from './pricing.constants.js';
import {
    toPricingDashboard,
    toPricingOptions,
    toPricingRule,
    toPricingRuleList,
    toPricingSimulation
} from './dto/pricing.dto.js';

export default class PricingService {
    constructor({ pricingDao, now = () => new Date() }) {
        this.pricingDao = pricingDao;
        this.now = now;
    }

    options(authContext) {
        this.assertPricingReadContext(authContext);

        return buildSuccessResponse({
            message: 'Pricing options fetched successfully',
            data: {
                options: toPricingOptions()
            }
        });
    }

    async dashboard(authContext) {
        await this.getPricingUserContext(authContext, { write: false });
        const rules = toPlainArray(await this.pricingDao.findDashboardRules({ limit: 50 }));

        return buildSuccessResponse({
            message: 'Pricing dashboard fetched successfully',
            data: {
                dashboard: toPricingDashboard(rules)
            }
        });
    }

    async listRules(authContext, query = {}) {
        await this.getPricingUserContext(authContext, { write: false });
        const rules = toPlainArray(await this.pricingDao.findRules({
            ...query,
            limit: query.limit || 25
        }));

        return buildSuccessResponse({
            message: 'Pricing rules fetched successfully',
            data: {
                pricing: toPricingRuleList(rules)
            }
        });
    }

    async getRule(authContext, ruleId) {
        await this.getPricingUserContext(authContext, { write: false });
        const rule = await this.findRule(ruleId);

        return buildSuccessResponse({
            message: 'Pricing rule fetched successfully',
            data: {
                rule: toPricingRule(rule)
            }
        });
    }

    async createRule(authContext, payload) {
        const actor = await this.getPricingUserContext(authContext, { write: true });
        const now = this.now();
        const normalizedPayload = normalizeCreatePayload(payload, {
            actor,
            now
        });

        let rule;

        try {
            rule = toPlainObject(await this.pricingDao.createRule(normalizedPayload));
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('Pricing rule already exists with this code');
            }

            throw err;
        }

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Pricing rule created successfully',
            data: {
                rule: toPricingRule(rule)
            }
        });
    }

    async updateRule(authContext, ruleId, payload) {
        const actor = await this.getPricingUserContext(authContext, { write: true });
        const existingRule = await this.findRule(ruleId);

        if (existingRule.status !== PRICING_RULE_STATUSES.DRAFT) {
            throw AppError.badRequest('Only draft pricing rules can be edited');
        }

        const updatePayload = normalizeUpdatePayload(existingRule, payload, {
            actor
        });
        const updatedRule = await this.updatePricingRule(ruleId, updatePayload);

        return buildSuccessResponse({
            message: 'Pricing rule updated successfully',
            data: {
                rule: toPricingRule(updatedRule)
            }
        });
    }

    async activateRule(authContext, ruleId) {
        const actor = await this.getPricingUserContext(authContext, { write: true });
        const existingRule = await this.findRule(ruleId);

        if (existingRule.status === PRICING_RULE_STATUSES.ARCHIVED) {
            throw AppError.badRequest('Archived pricing rules cannot be activated');
        }

        const now = this.now();
        const effectiveFrom = new Date(existingRule.effectiveFrom);

        if (existingRule.effectiveUntil && new Date(existingRule.effectiveUntil) <= now) {
            throw AppError.badRequest('Expired pricing rules cannot be activated');
        }

        await this.pricingDao.archiveActiveRules({
            vehicleType: existingRule.vehicleType,
            serviceZone: existingRule.serviceZone || PRICING_DEFAULT_SERVICE_ZONE,
            exceptRuleId: ruleId,
            archivedAt: now,
            updatedBy: getId(actor)
        });

        const activatedRule = await this.updatePricingRule(ruleId, {
            status: PRICING_RULE_STATUSES.ACTIVE,
            effectiveFrom: effectiveFrom > now ? effectiveFrom : now,
            activatedAt: now,
            archivedAt: null,
            updatedBy: getId(actor)
        });

        return buildSuccessResponse({
            message: 'Pricing rule activated successfully',
            data: {
                rule: toPricingRule(activatedRule)
            }
        });
    }

    async archiveRule(authContext, ruleId) {
        const actor = await this.getPricingUserContext(authContext, { write: true });
        const existingRule = await this.findRule(ruleId);

        if (existingRule.status === PRICING_RULE_STATUSES.ARCHIVED) {
            throw AppError.badRequest('Pricing rule is already archived');
        }

        const archivedRule = await this.updatePricingRule(ruleId, {
            status: PRICING_RULE_STATUSES.ARCHIVED,
            archivedAt: this.now(),
            updatedBy: getId(actor)
        });

        return buildSuccessResponse({
            message: 'Pricing rule archived successfully',
            data: {
                rule: toPricingRule(archivedRule)
            }
        });
    }

    async simulate(authContext, payload) {
        await this.getPricingUserContext(authContext, { write: false });
        const requestedAt = payload.requestedAt || this.now();
        const rule = payload.ruleId
            ? await this.findRule(payload.ruleId)
            : await this.findSimulationRule({
                vehicleType: payload.vehicleType,
                serviceZone: payload.serviceZone,
                requestedAt
            });
        const simulation = simulateFare(rule, {
            distanceKm: payload.distanceKm,
            durationMinutes: payload.durationMinutes,
            requestedAt
        });

        return buildSuccessResponse({
            message: 'Pricing simulation completed successfully',
            data: toPricingSimulation({
                rule,
                simulation
            })
        });
    }

    async findSimulationRule({ vehicleType, serviceZone, requestedAt }) {
        const normalizedServiceZone = serviceZone || PRICING_DEFAULT_SERVICE_ZONE;
        const activeRule = toPlainObject(await this.pricingDao.findActiveRule({
            vehicleType,
            serviceZone: normalizedServiceZone,
            now: requestedAt
        }));

        if (activeRule) {
            return normalizeRule(activeRule);
        }

        if (normalizedServiceZone !== PRICING_DEFAULT_SERVICE_ZONE) {
            const defaultRule = toPlainObject(await this.pricingDao.findActiveRule({
                vehicleType,
                serviceZone: PRICING_DEFAULT_SERVICE_ZONE,
                now: requestedAt
            }));

            if (defaultRule) {
                return normalizeRule(defaultRule);
            }
        }

        return baselineRuleFor(vehicleType);
    }

    async findRule(ruleId) {
        const rule = normalizeRule(toPlainObject(await this.pricingDao.findById(ruleId)));

        if (!rule) {
            throw AppError.notFound('Pricing rule not found');
        }

        return rule;
    }

    async updatePricingRule(ruleId, payload) {
        const updatedRule = normalizeRule(toPlainObject(await this.pricingDao.updateRule(ruleId, payload)));

        if (!updatedRule) {
            throw AppError.notFound('Pricing rule not found');
        }

        return updatedRule;
    }

    async getPricingUserContext(authContext, { write = false } = {}) {
        if (write) {
            this.assertPricingWriteContext(authContext);
        } else {
            this.assertPricingReadContext(authContext);
        }

        const privateUser = toPlainObject(await this.pricingDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertPricingReadContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Pricing private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.PRICING_READ)) {
            throw AppError.forbidden('Pricing read permission is required');
        }

        return authContext;
    }

    assertPricingWriteContext(authContext) {
        this.assertPricingReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.PRICING_WRITE)) {
            throw AppError.forbidden('Pricing write permission is required');
        }
    }
}

const normalizeCreatePayload = (payload = {}, { actor, now }) => ({
    ruleCode: createPricingRuleCode(payload.vehicleType, payload.serviceZone || PRICING_DEFAULT_SERVICE_ZONE, now),
    label: payload.label.trim(),
    description: payload.description?.trim() || null,
    vehicleType: payload.vehicleType,
    serviceZone: normalizeServiceZone(payload.serviceZone),
    pricing: normalizePricingAmounts(payload.pricing),
    surgeRules: normalizeSurgeRules(payload.surgeRules),
    status: PRICING_RULE_STATUSES.DRAFT,
    effectiveFrom: payload.effectiveFrom || now,
    effectiveUntil: payload.effectiveUntil || null,
    notes: payload.notes?.trim() || null,
    createdBy: getId(actor),
    updatedBy: getId(actor)
});

const normalizeUpdatePayload = (existingRule, payload = {}, { actor }) => ({
    ...(payload.label !== undefined ? { label: payload.label.trim() } : {}),
    ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
    ...(payload.serviceZone !== undefined ? { serviceZone: normalizeServiceZone(payload.serviceZone) } : {}),
    ...(payload.pricing !== undefined ? { pricing: normalizePricingAmounts({ ...existingRule.pricing, ...payload.pricing }) } : {}),
    ...(payload.surgeRules !== undefined ? { surgeRules: normalizeSurgeRules({ ...existingRule.surgeRules, ...payload.surgeRules }) } : {}),
    ...(payload.effectiveFrom !== undefined ? { effectiveFrom: payload.effectiveFrom } : {}),
    ...(payload.effectiveUntil !== undefined ? { effectiveUntil: payload.effectiveUntil || null } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes?.trim() || null } : {}),
    updatedBy: getId(actor)
});

const normalizeRule = (rule) => {
    if (!rule) {
        return null;
    }

    return {
        ...rule,
        serviceZone: rule.serviceZone || PRICING_DEFAULT_SERVICE_ZONE,
        pricing: normalizePricingAmounts(rule.pricing),
        surgeRules: normalizeSurgeRules(rule.surgeRules),
        status: rule.status || PRICING_RULE_STATUSES.DRAFT
    };
};

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
    ...PRICING_DEFAULT_SURGE_RULES,
    ...(surgeRules || {})
});

const normalizeServiceZone = (serviceZone) => serviceZone?.trim?.().toLowerCase() || PRICING_DEFAULT_SERVICE_ZONE;

const baselineRuleFor = (vehicleType) => {
    const baselineRule = PRICING_BASELINE_RULES.find((rule) => rule.vehicleType === vehicleType);

    if (!baselineRule) {
        throw AppError.badRequest('Unsupported vehicle type');
    }

    return normalizeRule({
        id: `baseline-${vehicleType}`,
        ruleCode: `BASELINE-${vehicleType.toUpperCase()}`,
        label: baselineRule.label,
        vehicleType,
        serviceZone: baselineRule.serviceZone,
        pricing: {
            currency: baselineRule.currency,
            baseFare: baselineRule.baseFare,
            perKm: baselineRule.perKm,
            perMinute: baselineRule.perMinute,
            minimumFare: baselineRule.minimumFare,
            platformFee: baselineRule.platformFee,
            taxRate: baselineRule.taxRate,
            averageSpeedKmph: baselineRule.averageSpeedKmph
        },
        surgeRules: baselineRule.surgeRules,
        status: PRICING_RULE_STATUSES.ACTIVE,
        effectiveFrom: null,
        effectiveUntil: null
    });
};

const simulateFare = (rule, { distanceKm, durationMinutes, requestedAt }) => {
    const pricing = rule.pricing;
    const resolvedDurationMinutes = durationMinutes
        || Math.max(2, Math.round((distanceKm / pricing.averageSpeedKmph) * 60 + 4));
    const surge = calculateSurge(rule.surgeRules, requestedAt);
    const breakdown = calculateBreakdown({
        pricing,
        distanceKm,
        durationMinutes: resolvedDurationMinutes,
        surgeMultiplier: surge.multiplier
    });

    return {
        currency: pricing.currency,
        distanceKm: roundDistance(distanceKm),
        durationMinutes: resolvedDurationMinutes,
        surge,
        breakdown,
        guidance: {
            withinMinimumFare: breakdown.minFareAdjustment > 0,
            highSurge: surge.level === FARE_SURGE_LEVELS.HIGH,
            nextAction: surge.level === FARE_SURGE_LEVELS.HIGH
                ? 'Review surge impact before activation'
                : 'Pricing output is within normal policy range'
        }
    };
};

const calculateSurge = (surgeRules, requestedAt = new Date()) => {
    const hour = new Date(requestedAt).getHours();
    let multiplier = 1;
    let level = FARE_SURGE_LEVELS.NORMAL;
    let reason = 'Demand and driver availability are normal';

    if (hour >= 17 && hour <= 21) {
        multiplier = surgeRules.eveningPeakMultiplier;
        level = multiplier >= 1.3 ? FARE_SURGE_LEVELS.HIGH : FARE_SURGE_LEVELS.MODERATE;
        reason = 'Evening commute demand is higher than usual';
    } else if (hour >= 8 && hour <= 10) {
        multiplier = surgeRules.morningPeakMultiplier;
        level = multiplier > 1 ? FARE_SURGE_LEVELS.MODERATE : FARE_SURGE_LEVELS.NORMAL;
        reason = 'Morning commute demand is above normal';
    } else if (hour >= 22 || hour <= 5) {
        multiplier = surgeRules.lateNightMultiplier;
        level = multiplier > 1 ? FARE_SURGE_LEVELS.MODERATE : FARE_SURGE_LEVELS.NORMAL;
        reason = 'Late-night driver availability is lower';
    }

    return {
        multiplier: Math.min(multiplier, surgeRules.maxSurgeMultiplier),
        level,
        reason
    };
};

const calculateBreakdown = ({ pricing, distanceKm, durationMinutes, surgeMultiplier }) => {
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

const createPricingRuleCode = (vehicleType, serviceZone, date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const normalizedZone = normalizeServiceZone(serviceZone).replace(/[^a-z0-9]+/g, '-').toUpperCase();

    return `PRICE-${vehicleType.toUpperCase()}-${normalizedZone}-${compactTimestamp}`;
};

const roundMoney = (value) => Number(value.toFixed(2));

const roundDistance = (value) => Number(value.toFixed(2));

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
