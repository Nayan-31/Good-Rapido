import z from 'zod';
import {
    IDENTITY_DOCUMENT_STATUSES,
    IDENTITY_DOCUMENT_TYPES,
    IDENTITY_REVIEW_DECISIONS,
    IDENTITY_STATUSES,
    IDENTITY_SUBJECT_ROLES
} from '../identity.constants.js';

const identityIdSchema = z.string().trim().min(1).max(80);
const documentTypeSchema = z.enum(Object.values(IDENTITY_DOCUMENT_TYPES));

const identityDocumentSchema = z.object({
    type: documentTypeSchema,
    documentNumber: z.string().trim().min(2).max(80).optional(),
    holderName: z.string().trim().min(2).max(120).optional(),
    fileUrl: z.string().trim().url().max(500),
    backFileUrl: z.string().trim().url().max(500).optional(),
    issuedAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    notes: z.string().trim().max(240).optional()
}).strict().refine(
    (body) => !body.issuedAt || !body.expiresAt || body.expiresAt > body.issuedAt,
    { message: 'Document expiry must be after issue date', path: ['expiresAt'] }
);

const identityDocumentReviewSchema = z.object({
    type: documentTypeSchema,
    status: z.enum([
        IDENTITY_DOCUMENT_STATUSES.APPROVED,
        IDENTITY_DOCUMENT_STATUSES.REJECTED
    ]),
    rejectionReason: z.string().trim().min(5).max(500).optional()
}).strict().refine(
    (body) => body.status !== IDENTITY_DOCUMENT_STATUSES.REJECTED || Boolean(body.rejectionReason),
    { message: 'Rejection reason is required when rejecting a document', path: ['rejectionReason'] }
);

export const upsertIdentitySchema = z.object({
    body: z.object({
        documents: z.array(identityDocumentSchema).min(1).max(12)
    }).strict().refine(
        (body) => new Set(body.documents.map((document) => document.type)).size === body.documents.length,
        { message: 'Each identity document type can be uploaded only once', path: ['documents'] }
    )
});

export const identityParamsSchema = z.object({
    params: z.object({
        identityId: identityIdSchema
    })
});

export const identityReviewQueueSchema = z.object({
    query: z.object({
        status: z.enum([
            IDENTITY_STATUSES.SUBMITTED,
            IDENTITY_STATUSES.VERIFIED,
            IDENTITY_STATUSES.REJECTED
        ]).optional(),
        subjectRole: z.enum(Object.values(IDENTITY_SUBJECT_ROLES)).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    }).strict()
});

export const reviewIdentitySchema = z.object({
    params: z.object({
        identityId: identityIdSchema
    }),
    body: z.object({
        status: z.enum(Object.values(IDENTITY_REVIEW_DECISIONS)),
        rejectionReason: z.string().trim().min(5).max(500).optional(),
        documentReviews: z.array(identityDocumentReviewSchema).max(12).optional()
    }).strict().refine(
        (body) => body.status !== IDENTITY_REVIEW_DECISIONS.REJECTED || Boolean(body.rejectionReason),
        { message: 'Rejection reason is required when rejecting identity', path: ['rejectionReason'] }
    ).refine(
        (body) => !body.documentReviews || new Set(body.documentReviews.map((review) => review.type)).size === body.documentReviews.length,
        { message: 'Each identity document type can be reviewed only once', path: ['documentReviews'] }
    )
});
