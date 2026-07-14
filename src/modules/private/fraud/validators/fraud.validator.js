import z from 'zod';
import {
    FRAUD_CASE_SOURCES,
    FRAUD_CASE_STATUSES,
    FRAUD_CASE_TYPES,
    FRAUD_EVIDENCE_TYPES,
    FRAUD_RESOLUTION_DECISIONS,
    FRAUD_SEVERITY_LEVELS,
    FRAUD_SUBJECT_TYPES
} from '../fraud.constants.js';

const fraudCaseIdSchema = z.string().trim().min(1).max(80);
const subjectIdSchema = z.string().trim().min(1).max(80);
const noteSchema = z.string().trim().min(2).max(500);
const optionalNullableTextSchema = z.string().trim().max(240).nullable().optional();
const scoreSchema = z.coerce.number().int().min(0).max(100);

const fraudSignalsSchema = z.object({
    promoAbuseScore: scoreSchema.optional(),
    paymentRiskScore: scoreSchema.optional(),
    gpsMismatchScore: scoreSchema.optional(),
    deviceReuseScore: scoreSchema.optional(),
    cancellationAbuseScore: scoreSchema.optional(),
    disputePatternScore: scoreSchema.optional(),
    velocityScore: scoreSchema.optional()
}).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one fraud signal is required' }
);

const fraudEvidenceSchema = z.object({
    type: z.enum(Object.values(FRAUD_EVIDENCE_TYPES)),
    label: z.string().trim().min(2).max(120).optional(),
    url: z.string().trim().url().max(500).optional(),
    note: z.string().trim().min(2).max(500).optional(),
    capturedAt: z.coerce.date().optional()
}).strict();

const linkedEntitiesSchema = z.object({
    rideId: z.string().trim().min(1).max(80).optional(),
    paymentId: z.string().trim().min(1).max(80).optional(),
    promoCode: z.string().trim().min(1).max(80).optional(),
    deviceId: z.string().trim().min(1).max(120).optional(),
    ipAddress: z.string().trim().min(1).max(80).optional()
}).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one linked entity is required' }
);

const fraudActionsSchema = z.object({
    accountBlocked: z.boolean().optional(),
    payoutHeld: z.boolean().optional(),
    promoDisabled: z.boolean().optional(),
    rideBookingBlocked: z.boolean().optional(),
    reason: optionalNullableTextSchema,
    expiresAt: z.coerce.date().nullable().optional()
}).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one fraud action is required' }
);

export const fraudCaseParamsSchema = z.object({
    params: z.object({
        caseId: fraudCaseIdSchema
    })
});

export const fraudCaseQuerySchema = z.object({
    query: z.object({
        subjectType: z.enum(Object.values(FRAUD_SUBJECT_TYPES)).optional(),
        caseType: z.enum(Object.values(FRAUD_CASE_TYPES)).optional(),
        source: z.enum(Object.values(FRAUD_CASE_SOURCES)).optional(),
        severity: z.enum(Object.values(FRAUD_SEVERITY_LEVELS)).optional(),
        status: z.enum(Object.values(FRAUD_CASE_STATUSES)).optional(),
        assignedReviewerId: z.string().trim().min(1).max(80).optional(),
        q: z.string().trim().min(1).max(120).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    }).strict()
});

export const createFraudCaseSchema = z.object({
    body: z.object({
        subjectType: z.enum(Object.values(FRAUD_SUBJECT_TYPES)),
        subjectId: subjectIdSchema,
        subjectLabel: z.string().trim().min(2).max(120).optional(),
        caseType: z.enum(Object.values(FRAUD_CASE_TYPES)),
        source: z.enum(Object.values(FRAUD_CASE_SOURCES)).optional(),
        riskScore: scoreSchema.optional(),
        confidenceScore: scoreSchema.optional(),
        severity: z.enum(Object.values(FRAUD_SEVERITY_LEVELS)).optional(),
        status: z.enum(Object.values(FRAUD_CASE_STATUSES)).optional(),
        signals: fraudSignalsSchema.optional(),
        evidence: z.array(fraudEvidenceSchema).max(20).optional(),
        linkedEntities: linkedEntitiesSchema.optional(),
        actions: fraudActionsSchema.optional(),
        assignedReviewerId: z.string().trim().min(1).max(80).optional(),
        note: noteSchema.optional()
    }).strict()
});

export const updateFraudCaseSchema = z.object({
    params: z.object({
        caseId: fraudCaseIdSchema
    }),
    body: z.object({
        subjectLabel: z.string().trim().min(2).max(120).nullable().optional(),
        caseType: z.enum(Object.values(FRAUD_CASE_TYPES)).optional(),
        source: z.enum(Object.values(FRAUD_CASE_SOURCES)).optional(),
        riskScore: scoreSchema.optional(),
        confidenceScore: scoreSchema.optional(),
        severity: z.enum(Object.values(FRAUD_SEVERITY_LEVELS)).optional(),
        status: z.enum(Object.values(FRAUD_CASE_STATUSES)).optional(),
        signals: fraudSignalsSchema.optional(),
        evidence: z.array(fraudEvidenceSchema).max(20).optional(),
        linkedEntities: linkedEntitiesSchema.optional(),
        actions: fraudActionsSchema.optional(),
        assignedReviewerId: z.string().trim().min(1).max(80).nullable().optional(),
        note: noteSchema.optional()
    }).strict().refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one fraud case field is required' }
    )
});

export const assignFraudReviewerSchema = z.object({
    params: z.object({
        caseId: fraudCaseIdSchema
    }),
    body: z.object({
        assignedReviewerId: z.string().trim().min(1).max(80),
        note: noteSchema.optional()
    }).strict()
});

export const addFraudNoteSchema = z.object({
    params: z.object({
        caseId: fraudCaseIdSchema
    }),
    body: z.object({
        note: noteSchema
    }).strict()
});

export const confirmFraudCaseSchema = z.object({
    params: z.object({
        caseId: fraudCaseIdSchema
    }),
    body: z.object({
        actions: fraudActionsSchema.optional(),
        note: noteSchema.optional()
    }).strict()
});

export const dismissFraudCaseSchema = z.object({
    params: z.object({
        caseId: fraudCaseIdSchema
    }),
    body: z.object({
        note: noteSchema.optional()
    }).strict()
});

export const resolveFraudCaseSchema = z.object({
    params: z.object({
        caseId: fraudCaseIdSchema
    }),
    body: z.object({
        decision: z.enum(Object.values(FRAUD_RESOLUTION_DECISIONS)).optional(),
        actions: fraudActionsSchema.optional(),
        note: noteSchema.optional()
    }).strict()
});

export const simulateFraudScoreSchema = z.object({
    body: z.object({
        caseType: z.enum(Object.values(FRAUD_CASE_TYPES)).optional(),
        riskScore: scoreSchema.optional(),
        confidenceScore: scoreSchema.optional(),
        severity: z.enum(Object.values(FRAUD_SEVERITY_LEVELS)).optional(),
        signals: fraudSignalsSchema.optional()
    }).strict().refine(
        (body) => Boolean(body.riskScore !== undefined || body.signals),
        { message: 'riskScore or signals is required' }
    )
});
