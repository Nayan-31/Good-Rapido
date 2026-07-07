import z from 'zod';
import {
    DISPUTE_EVIDENCE_TYPES,
    DISPUTE_REASONS,
    DISPUTE_REQUESTED_RESOLUTIONS,
    DISPUTE_STATUSES,
    DISPUTE_TYPES
} from '../disputes.constants.js';

const nonEmptyString = z.string().trim().min(1);
const noteSchema = z.string().trim().max(240);

const evidenceItemSchema = z.object({
    type: z.enum(Object.values(DISPUTE_EVIDENCE_TYPES)),
    label: z.string().trim().max(80).optional(),
    url: z.string().trim().url().max(500).optional(),
    note: noteSchema.optional(),
    capturedAt: z.coerce.date().optional()
}).refine(
    (item) => Boolean(item.url || item.note),
    { message: 'Evidence requires either url or note' }
);

export const disputeHistoryQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(DISPUTE_STATUSES)).optional(),
        type: z.enum(Object.values(DISPUTE_TYPES)).optional(),
        limit: z.coerce.number().int().min(1).max(30).default(10)
    })
});

export const disputeParamsSchema = z.object({
    params: z.object({
        disputeId: nonEmptyString
    })
});

export const rideDisputeParamsSchema = z.object({
    params: z.object({
        rideId: nonEmptyString
    })
});

export const submitRideDisputeSchema = z.object({
    params: z.object({
        rideId: nonEmptyString
    }),
    body: z.object({
        type: z.enum(Object.values(DISPUTE_TYPES)),
        reason: z.enum(Object.values(DISPUTE_REASONS)),
        title: z.string().trim().min(4).max(120).optional(),
        description: z.string().trim().min(10).max(800),
        requestedResolution: z.enum(Object.values(DISPUTE_REQUESTED_RESOLUTIONS)).optional(),
        requestedRefundAmount: z.coerce.number().min(1).max(200000).optional(),
        evidence: z.array(evidenceItemSchema).max(5).default([])
    })
});

export const addDisputeEvidenceSchema = z.object({
    params: z.object({
        disputeId: nonEmptyString
    }),
    body: z.object({
        evidence: z.array(evidenceItemSchema).min(1).max(5)
    })
});

export const cancelDisputeSchema = z.object({
    params: z.object({
        disputeId: nonEmptyString
    }),
    body: z.object({
        note: noteSchema.optional()
    }).default({})
});
