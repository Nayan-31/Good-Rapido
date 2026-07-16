import z from 'zod';
import {
    FRAUD_ENGINE_CASE_STATUSES,
    FRAUD_ENGINE_CASE_TYPES,
    FRAUD_ENGINE_SEVERITY_LEVELS,
    FRAUD_ENGINE_SIGNAL_FIELDS,
    FRAUD_ENGINE_SUBJECT_TYPES
} from '../fraud-engine.constants.js';

const scoreSchema = z.coerce.number().int().min(0).max(100);

const fraudSignalsSchema = z.object(
    Object.fromEntries(FRAUD_ENGINE_SIGNAL_FIELDS.map((field) => [field, scoreSchema.optional()]))
).strict().refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one fraud signal is required' }
);

export const assessFraudEngineSchema = z.object({
    body: z.object({
        subjectType: z.enum(Object.values(FRAUD_ENGINE_SUBJECT_TYPES)).optional(),
        caseType: z.enum(Object.values(FRAUD_ENGINE_CASE_TYPES)).optional(),
        riskScore: scoreSchema.optional(),
        confidenceScore: scoreSchema.optional(),
        severity: z.enum(Object.values(FRAUD_ENGINE_SEVERITY_LEVELS)).optional(),
        status: z.enum(Object.values(FRAUD_ENGINE_CASE_STATUSES)).optional(),
        signals: fraudSignalsSchema.optional()
    }).strict().refine(
        (body) => Boolean(body.riskScore !== undefined || body.signals),
        { message: 'riskScore or signals is required' }
    )
});
