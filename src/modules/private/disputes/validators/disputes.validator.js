import z from 'zod';
import {
    DISPUTE_PRIORITIES,
    DISPUTE_RESOLUTION_TYPES,
    DISPUTE_STATUSES,
    DISPUTE_TYPES
} from '../../../public/disputes/disputes.constants.js';
import { PRIVATE_DISPUTE_MAX_QUEUE_LIMIT } from '../disputes.constants.js';

const disputeIdSchema = z.string().trim().min(1).max(80);
const noteSchema = z.string().trim().min(2).max(500);

export const privateDisputeParamsSchema = z.object({
    params: z.object({
        disputeId: disputeIdSchema
    })
});

export const privateDisputeQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(DISPUTE_STATUSES)).optional(),
        type: z.enum(Object.values(DISPUTE_TYPES)).optional(),
        priority: z.enum(Object.values(DISPUTE_PRIORITIES)).optional(),
        assignedOpsUserId: z.string().trim().min(1).max(80).optional(),
        q: z.string().trim().min(1).max(120).optional(),
        limit: z.coerce.number().int().min(1).max(PRIVATE_DISPUTE_MAX_QUEUE_LIMIT).optional()
    }).strict()
});

export const updatePrivateDisputeStateSchema = z.object({
    params: z.object({
        disputeId: disputeIdSchema
    }),
    body: z.object({
        priority: z.enum(Object.values(DISPUTE_PRIORITIES)).optional(),
        assignedOpsUserId: z.string().trim().min(1).max(80).nullable().optional(),
        note: noteSchema.optional()
    }).strict().refine(
        (body) => ['priority', 'assignedOpsUserId', 'note'].some((field) => body[field] !== undefined),
        { message: 'At least one dispute state field is required' }
    )
});

export const assignPrivateDisputeSchema = z.object({
    params: z.object({
        disputeId: disputeIdSchema
    }),
    body: z.object({
        assignedOpsUserId: z.string().trim().min(1).max(80),
        note: noteSchema.optional()
    }).strict()
});

export const requestDisputeEvidenceSchema = z.object({
    params: z.object({
        disputeId: disputeIdSchema
    }),
    body: z.object({
        note: noteSchema
    }).strict()
});

export const addPrivateDisputeNoteSchema = z.object({
    params: z.object({
        disputeId: disputeIdSchema
    }),
    body: z.object({
        note: noteSchema
    }).strict()
});

export const resolvePrivateDisputeSchema = z.object({
    params: z.object({
        disputeId: disputeIdSchema
    }),
    body: z.object({
        resolutionType: z.enum(Object.values(DISPUTE_RESOLUTION_TYPES)),
        note: noteSchema,
        refundAmount: z.coerce.number().min(0).max(100000).optional()
    }).strict().refine(
        (body) => body.resolutionType !== DISPUTE_RESOLUTION_TYPES.REFUND_APPROVED || body.refundAmount !== undefined,
        { message: 'refundAmount is required for refund approvals', path: ['refundAmount'] }
    )
});

export const rejectPrivateDisputeSchema = z.object({
    params: z.object({
        disputeId: disputeIdSchema
    }),
    body: z.object({
        note: noteSchema
    }).strict()
});
