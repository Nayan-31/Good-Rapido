import z from 'zod';
import { FARE_VEHICLE_TYPES } from '../../../public/fare/fare.constants.js';
import {
    PRICING_DEFAULT_SERVICE_ZONE,
    PRICING_RULE_STATUSES
} from '../pricing.constants.js';

const pricingRuleIdSchema = z.string().trim().min(1).max(80);
const serviceZoneSchema = z.string().trim().min(1).max(80).transform((value) => value.toLowerCase());

const pricingAmountsSchema = z.object({
    currency: z.string().trim().min(3).max(8).transform((value) => value.toUpperCase()).optional(),
    baseFare: z.coerce.number().min(0).max(10000),
    perKm: z.coerce.number().min(0).max(10000),
    perMinute: z.coerce.number().min(0).max(10000),
    minimumFare: z.coerce.number().min(0).max(10000),
    platformFee: z.coerce.number().min(0).max(10000),
    taxRate: z.coerce.number().min(0).max(1),
    averageSpeedKmph: z.coerce.number().min(1).max(200)
}).strict();

const partialPricingAmountsSchema = pricingAmountsSchema.partial().refine(
    (pricing) => Object.values(pricing).some((value) => value !== undefined),
    { message: 'At least one pricing amount is required' }
);

const surgeRulesSchema = z.object({
    morningPeakMultiplier: z.coerce.number().min(1).max(5).optional(),
    eveningPeakMultiplier: z.coerce.number().min(1).max(5).optional(),
    lateNightMultiplier: z.coerce.number().min(1).max(5).optional(),
    maxSurgeMultiplier: z.coerce.number().min(1).max(5).optional()
}).strict().refine(
    (rules) => Object.values(rules).some((value) => value !== undefined),
    { message: 'At least one surge rule is required' }
);

const effectiveDatesRefinement = (body) => (
    !body.effectiveFrom
    || !body.effectiveUntil
    || body.effectiveUntil > body.effectiveFrom
);

export const pricingRuleParamsSchema = z.object({
    params: z.object({
        ruleId: pricingRuleIdSchema
    })
});

export const pricingRuleQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(PRICING_RULE_STATUSES)).optional(),
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)).optional(),
        serviceZone: serviceZoneSchema.optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    }).strict()
});

export const createPricingRuleSchema = z.object({
    body: z.object({
        label: z.string().trim().min(2).max(120),
        description: z.string().trim().min(5).max(500).optional(),
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)),
        serviceZone: serviceZoneSchema.default(PRICING_DEFAULT_SERVICE_ZONE),
        pricing: pricingAmountsSchema,
        surgeRules: surgeRulesSchema.optional(),
        effectiveFrom: z.coerce.date().optional(),
        effectiveUntil: z.coerce.date().optional(),
        notes: z.string().trim().max(500).optional()
    }).strict().refine(
        effectiveDatesRefinement,
        { message: 'Pricing rule effectiveUntil must be after effectiveFrom', path: ['effectiveUntil'] }
    )
});

export const updatePricingRuleSchema = z.object({
    params: z.object({
        ruleId: pricingRuleIdSchema
    }),
    body: z.object({
        label: z.string().trim().min(2).max(120).optional(),
        description: z.string().trim().min(5).max(500).nullable().optional(),
        serviceZone: serviceZoneSchema.optional(),
        pricing: partialPricingAmountsSchema.optional(),
        surgeRules: surgeRulesSchema.optional(),
        effectiveFrom: z.coerce.date().optional(),
        effectiveUntil: z.coerce.date().nullable().optional(),
        notes: z.string().trim().max(500).nullable().optional()
    }).strict().refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one pricing rule field is required' }
    ).refine(
        effectiveDatesRefinement,
        { message: 'Pricing rule effectiveUntil must be after effectiveFrom', path: ['effectiveUntil'] }
    )
});

export const simulatePricingSchema = z.object({
    body: z.object({
        ruleId: pricingRuleIdSchema.optional(),
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)).optional(),
        serviceZone: serviceZoneSchema.default(PRICING_DEFAULT_SERVICE_ZONE),
        distanceKm: z.coerce.number().min(0.1).max(500),
        durationMinutes: z.coerce.number().min(1).max(1440).optional(),
        requestedAt: z.coerce.date().optional()
    }).strict().refine(
        (body) => Boolean(body.ruleId || body.vehicleType),
        { message: 'ruleId or vehicleType is required' }
    )
});
