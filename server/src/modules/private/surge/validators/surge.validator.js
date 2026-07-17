import z from 'zod';
import { FARE_VEHICLE_TYPES } from '../../../public/fare/fare.constants.js';
import {
    SURGE_DECISION_TYPES,
    SURGE_DEFAULT_COOLDOWN_MINUTES,
    SURGE_DEFAULT_MAX_MULTIPLIER,
    SURGE_DEFAULT_SERVICE_ZONE,
    SURGE_MAX_MULTIPLIER,
    SURGE_MIN_MULTIPLIER,
    SURGE_RULE_STATUSES,
    SURGE_TRIGGERS
} from '../surge.constants.js';

const surgeRuleIdSchema = z.string().trim().min(1).max(80);
const serviceZoneSchema = z.string().trim().min(1).max(80).transform((value) => value.toLowerCase());
const multiplierSchema = z.coerce.number().min(SURGE_MIN_MULTIPLIER).max(SURGE_MAX_MULTIPLIER);

const signalsSchema = z.object({
    demandScore: z.coerce.number().min(0).max(100).optional(),
    supplyScore: z.coerce.number().min(0).max(100).optional(),
    cancellationRiskScore: z.coerce.number().min(0).max(100).optional(),
    activeDrivers: z.coerce.number().int().min(0).optional(),
    pendingRequests: z.coerce.number().int().min(0).optional()
}).strict();

const timeWindowRefinement = (body) => !body.startsAt || !body.endsAt || body.endsAt > body.startsAt;

const multiplierRefinement = (body) => (
    body.baseMultiplier === undefined
    || body.maxMultiplier === undefined
    || body.maxMultiplier >= body.baseMultiplier
);

export const surgeRuleParamsSchema = z.object({
    params: z.object({
        ruleId: surgeRuleIdSchema
    })
});

export const surgeRuleQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(SURGE_RULE_STATUSES)).optional(),
        serviceZone: serviceZoneSchema.optional(),
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)).optional(),
        trigger: z.enum(Object.values(SURGE_TRIGGERS)).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    }).strict()
});

export const createSurgeRuleSchema = z.object({
    body: z.object({
        label: z.string().trim().min(2).max(120),
        description: z.string().trim().min(5).max(500).optional(),
        serviceZone: serviceZoneSchema.default(SURGE_DEFAULT_SERVICE_ZONE),
        vehicleTypes: z.array(z.enum(Object.values(FARE_VEHICLE_TYPES))).min(1).max(4),
        trigger: z.enum(Object.values(SURGE_TRIGGERS)),
        decisionType: z.enum(Object.values(SURGE_DECISION_TYPES)).optional(),
        baseMultiplier: multiplierSchema,
        maxMultiplier: multiplierSchema.default(SURGE_DEFAULT_MAX_MULTIPLIER),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        cooldownMinutes: z.coerce.number().int().min(0).max(240).default(SURGE_DEFAULT_COOLDOWN_MINUTES),
        reason: z.string().trim().min(5).max(240),
        customerMessage: z.string().trim().min(5).max(240).optional(),
        signals: signalsSchema.optional(),
        notes: z.string().trim().max(500).optional()
    }).strict().refine(
        timeWindowRefinement,
        { message: 'Surge rule endsAt must be after startsAt', path: ['endsAt'] }
    ).refine(
        multiplierRefinement,
        { message: 'maxMultiplier must be greater than or equal to baseMultiplier', path: ['maxMultiplier'] }
    )
});

export const updateSurgeRuleSchema = z.object({
    params: z.object({
        ruleId: surgeRuleIdSchema
    }),
    body: z.object({
        label: z.string().trim().min(2).max(120).optional(),
        description: z.string().trim().min(5).max(500).nullable().optional(),
        serviceZone: serviceZoneSchema.optional(),
        vehicleTypes: z.array(z.enum(Object.values(FARE_VEHICLE_TYPES))).min(1).max(4).optional(),
        trigger: z.enum(Object.values(SURGE_TRIGGERS)).optional(),
        decisionType: z.enum(Object.values(SURGE_DECISION_TYPES)).optional(),
        baseMultiplier: multiplierSchema.optional(),
        maxMultiplier: multiplierSchema.optional(),
        startsAt: z.coerce.date().optional(),
        endsAt: z.coerce.date().optional(),
        cooldownMinutes: z.coerce.number().int().min(0).max(240).optional(),
        reason: z.string().trim().min(5).max(240).optional(),
        customerMessage: z.string().trim().min(5).max(240).nullable().optional(),
        signals: signalsSchema.optional(),
        notes: z.string().trim().max(500).nullable().optional()
    }).strict().refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one surge rule field is required' }
    ).refine(
        timeWindowRefinement,
        { message: 'Surge rule endsAt must be after startsAt', path: ['endsAt'] }
    ).refine(
        multiplierRefinement,
        { message: 'maxMultiplier must be greater than or equal to baseMultiplier', path: ['maxMultiplier'] }
    )
});

export const simulateSurgeSchema = z.object({
    body: z.object({
        ruleId: surgeRuleIdSchema.optional(),
        serviceZone: serviceZoneSchema.default(SURGE_DEFAULT_SERVICE_ZONE),
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)).optional(),
        baseFare: z.coerce.number().min(0).max(100000).optional(),
        requestedAt: z.coerce.date().optional(),
        demandScore: z.coerce.number().min(0).max(100).optional(),
        supplyScore: z.coerce.number().min(0).max(100).optional()
    }).strict().refine(
        (body) => Boolean(body.ruleId || body.vehicleType),
        { message: 'ruleId or vehicleType is required' }
    )
});
