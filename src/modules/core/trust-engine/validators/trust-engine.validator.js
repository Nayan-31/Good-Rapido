import z from 'zod';
import { RIDE_BOOKING_RISK_LEVELS } from '../../../public/ride-booking/ride-booking.constants.js';
import {
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SUBJECT_TYPES
} from '../../../private/trust/trust.constants.js';

const scoreSchema = z.coerce.number().min(0).max(100);
const optionalScoreSchema = scoreSchema.optional();

const scoresSchema = z.object({
    overall: optionalScoreSchema,
    safety: optionalScoreSchema,
    reliability: optionalScoreSchema,
    payment: optionalScoreSchema,
    cancellation: optionalScoreSchema,
    fraud: optionalScoreSchema
}).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one trust score is required' }
).optional();

const metricsSchema = z.object({
    completedRides: z.coerce.number().int().min(0).max(100000).optional(),
    cancelledRides: z.coerce.number().int().min(0).max(100000).optional(),
    disputeCount: z.coerce.number().int().min(0).max(10000).optional(),
    incidentCount: z.coerce.number().int().min(0).max(10000).optional(),
    paymentFailureCount: z.coerce.number().int().min(0).max(10000).optional(),
    ratingAverage: z.coerce.number().min(0).max(5).optional(),
    lastRideAt: z.coerce.date().optional()
}).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one trust metric is required' }
).optional();

const driverSignalsSchema = z.object({
    driverId: z.string().trim().min(1).max(80).optional(),
    id: z.string().trim().min(1).max(80).optional(),
    fullName: z.string().trim().min(1).max(120).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    trustScore: scoreSchema,
    reliabilityScore: scoreSchema.optional(),
    routeFairnessScore: scoreSchema,
    onTimeArrivalScore: scoreSchema,
    cancellationRiskScore: scoreSchema,
    cancellationRiskLevel: z.enum(Object.values(RIDE_BOOKING_RISK_LEVELS)).optional(),
    cancellationRatio: z.coerce.number().min(0).max(100).optional(),
    detourPercentage: z.coerce.number().min(0).max(100).optional(),
    completedRides: z.coerce.number().int().min(0).max(100000).optional()
}).strict().refine(
    (body) => body.driverId || body.id,
    { message: 'driverId is required', path: ['driverId'] }
);

export const assessTrustSchema = z.object({
    body: z.object({
        subjectType: z.enum(Object.values(TRUST_SUBJECT_TYPES)).default(TRUST_SUBJECT_TYPES.RIDER),
        scores: scoresSchema,
        metrics: metricsSchema,
        riskLevel: z.enum(Object.values(TRUST_RISK_LEVELS)).optional(),
        status: z.enum(Object.values(TRUST_PROFILE_STATUSES)).optional(),
        reviewStatus: z.enum(Object.values(TRUST_REVIEW_STATUSES)).optional()
    }).strict().refine(
        (body) => body.scores || body.metrics || body.riskLevel,
        { message: 'At least scores, metrics, or riskLevel is required' }
    )
});

export const evaluateDriverTrustSchema = z.object({
    body: z.object({
        driver: driverSignalsSchema,
        fareSource: z.object({
            confidenceScore: scoreSchema.optional(),
            confidence: z.object({
                score: scoreSchema.optional()
            }).strict().optional()
        }).strict().optional()
    }).strict()
});
