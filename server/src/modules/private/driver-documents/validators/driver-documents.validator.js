import z from 'zod';
import {
    DRIVER_DOCUMENT_REVIEW_STATUSES,
    DRIVER_DOCUMENT_TYPES
} from '../driver-documents.constants.js';

const documentTypeSchema = z.enum(Object.values(DRIVER_DOCUMENT_TYPES));

export const documentTypeParamSchema = z.object({
    params: z.object({
        documentType: documentTypeSchema
    })
});

export const reviewDocumentParamSchema = z.object({
    params: z.object({
        driverId: z.string().trim().min(1).max(80),
        documentType: documentTypeSchema
    })
});

export const uploadDriverDocumentSchema = z.object({
    params: z.object({
        documentType: documentTypeSchema
    }),
    body: z.object({
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
    )
});

export const reviewDriverDocumentSchema = z.object({
    params: z.object({
        driverId: z.string().trim().min(1).max(80),
        documentType: documentTypeSchema
    }),
    body: z.object({
        status: z.enum(Object.values(DRIVER_DOCUMENT_REVIEW_STATUSES)),
        rejectionReason: z.string().trim().min(5).max(500).optional()
    }).strict().refine(
        (body) => body.status !== DRIVER_DOCUMENT_REVIEW_STATUSES.REJECTED || Boolean(body.rejectionReason),
        { message: 'Rejection reason is required when rejecting a document', path: ['rejectionReason'] }
    )
});

export const driverDocumentReviewQueueSchema = z.object({
    query: z.object({
        status: z.string().trim().optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    }).strict()
});
