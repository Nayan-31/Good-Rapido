import z from 'zod';
import {
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SUBJECT_TYPES
} from '../trust.constants.js';

const trustProfileIdSchema = z.string().trim().min(1).max(80);
const subjectIdSchema = z.string().trim().min(1).max(80);
const noteSchema = z.string().trim().min(2).max(500);
const optionalNullableTextSchema = z.string().trim().max(240).nullable().optional();
const scoreSchema = z.coerce.number().int().min(0).max(100);
const metricCountSchema = z.coerce.number().int().min(0).max(100000);

const trustScoresSchema = z.object({
    overall: scoreSchema.optional(),
    safety: scoreSchema.optional(),
    reliability: scoreSchema.optional(),
    payment: scoreSchema.optional(),
    cancellation: scoreSchema.optional(),
    fraud: scoreSchema.optional()
}).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one trust score is required' }
);

const trustMetricsSchema = z.object({
    completedRides: metricCountSchema.optional(),
    cancelledRides: metricCountSchema.optional(),
    disputeCount: metricCountSchema.optional(),
    incidentCount: metricCountSchema.optional(),
    paymentFailureCount: metricCountSchema.optional(),
    ratingAverage: z.coerce.number().min(0).max(5).optional(),
    lastRideAt: z.coerce.date().nullable().optional()
}).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one trust metric is required' }
);

const trustRestrictionsSchema = z.object({
    rideBookingBlocked: z.boolean().optional(),
    driverPayoutHold: z.boolean().optional(),
    promoBlocked: z.boolean().optional(),
    reason: optionalNullableTextSchema,
    expiresAt: z.coerce.date().nullable().optional()
}).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one trust restriction is required' }
);

export const trustProfileParamsSchema = z.object({
    params: z.object({
        profileId: trustProfileIdSchema
    })
});

export const trustProfileQuerySchema = z.object({
    query: z.object({
        subjectType: z.enum(Object.values(TRUST_SUBJECT_TYPES)).optional(),
        riskLevel: z.enum(Object.values(TRUST_RISK_LEVELS)).optional(),
        status: z.enum(Object.values(TRUST_PROFILE_STATUSES)).optional(),
        reviewStatus: z.enum(Object.values(TRUST_REVIEW_STATUSES)).optional(),
        assignedReviewerId: z.string().trim().min(1).max(80).optional(),
        q: z.string().trim().min(1).max(120).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    }).strict()
});

export const createTrustProfileSchema = z.object({
    body: z.object({
        subjectType: z.enum(Object.values(TRUST_SUBJECT_TYPES)),
        subjectId: subjectIdSchema,
        subjectLabel: z.string().trim().min(2).max(120).optional(),
        scores: trustScoresSchema.optional(),
        metrics: trustMetricsSchema.optional(),
        restrictions: trustRestrictionsSchema.optional(),
        riskLevel: z.enum(Object.values(TRUST_RISK_LEVELS)).optional(),
        status: z.enum(Object.values(TRUST_PROFILE_STATUSES)).optional(),
        reviewStatus: z.enum(Object.values(TRUST_REVIEW_STATUSES)).optional(),
        assignedReviewerId: z.string().trim().min(1).max(80).optional(),
        note: noteSchema.optional()
    }).strict()
});

export const updateTrustProfileSchema = z.object({
    params: z.object({
        profileId: trustProfileIdSchema
    }),
    body: z.object({
        subjectLabel: z.string().trim().min(2).max(120).nullable().optional(),
        scores: trustScoresSchema.optional(),
        metrics: trustMetricsSchema.optional(),
        restrictions: trustRestrictionsSchema.optional(),
        riskLevel: z.enum(Object.values(TRUST_RISK_LEVELS)).optional(),
        status: z.enum(Object.values(TRUST_PROFILE_STATUSES)).optional(),
        reviewStatus: z.enum(Object.values(TRUST_REVIEW_STATUSES)).optional(),
        assignedReviewerId: z.string().trim().min(1).max(80).nullable().optional(),
        note: noteSchema.optional()
    }).strict().refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one trust profile field is required' }
    )
});

export const assignTrustReviewerSchema = z.object({
    params: z.object({
        profileId: trustProfileIdSchema
    }),
    body: z.object({
        assignedReviewerId: z.string().trim().min(1).max(80),
        note: noteSchema.optional()
    }).strict()
});

export const addTrustNoteSchema = z.object({
    params: z.object({
        profileId: trustProfileIdSchema
    }),
    body: z.object({
        note: noteSchema
    }).strict()
});

export const resolveTrustReviewSchema = z.object({
    params: z.object({
        profileId: trustProfileIdSchema
    }),
    body: z.object({
        note: noteSchema.optional(),
        status: z.enum([
            TRUST_PROFILE_STATUSES.CLEAR,
            TRUST_PROFILE_STATUSES.MONITORING,
            TRUST_PROFILE_STATUSES.RESTRICTED,
            TRUST_PROFILE_STATUSES.SUSPENDED
        ]).optional()
    }).strict()
});

export const simulateTrustScoreSchema = z.object({
    body: z.object({
        scores: trustScoresSchema.optional(),
        metrics: trustMetricsSchema.optional(),
        riskLevel: z.enum(Object.values(TRUST_RISK_LEVELS)).optional(),
        status: z.enum(Object.values(TRUST_PROFILE_STATUSES)).optional(),
        reviewStatus: z.enum(Object.values(TRUST_REVIEW_STATUSES)).optional()
    }).strict().refine(
        (body) => Boolean(body.scores || body.metrics || body.riskLevel),
        { message: 'scores, metrics, or riskLevel is required' }
    )
});
