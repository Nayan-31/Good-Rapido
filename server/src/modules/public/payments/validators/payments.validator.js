import z from 'zod';
import {
    PAYMENT_METHODS,
    PAYMENT_REFUND_REASONS,
    PAYMENT_STATUSES
} from '../payments.constants.js';

const nonEmptyString = z.string().trim().min(1);

export const paymentHistoryQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(PAYMENT_STATUSES)).optional(),
        limit: z.coerce.number().int().min(1).max(30).default(10)
    })
});

export const paymentParamsSchema = z.object({
    params: z.object({
        paymentId: nonEmptyString
    })
});

export const ridePaymentSchema = z.object({
    params: z.object({
        rideId: nonEmptyString
    }),
    body: z.object({
        paymentMethod: z.enum(Object.values(PAYMENT_METHODS)).default(PAYMENT_METHODS.PERSONAL_WALLET),
        tipAmount: z.coerce.number().min(0).max(500).default(0),
        discountAmount: z.coerce.number().min(0).max(5000).default(0),
        idempotencyKey: z.string().trim().min(8).max(80).optional()
    })
});

export const refundPaymentSchema = z.object({
    params: z.object({
        paymentId: nonEmptyString
    }),
    body: z.object({
        reason: z.enum(Object.values(PAYMENT_REFUND_REASONS)),
        note: z.string().trim().max(180).optional(),
        amount: z.coerce.number().min(1).max(200000).optional()
    })
});

export const paymentSuccessSchema = z.object({
    params: z.object({
        paymentId: nonEmptyString
    }),
    body: z.object({
        providerPaymentId: z.string().trim().min(2).max(120).optional(),
        providerOrderId: z.string().trim().min(2).max(120).optional(),
        providerPaymentIntentId: z.string().trim().min(2).max(120).optional(),
        providerSignature: z.string().trim().min(8).max(260).optional(),
        razorpayPaymentId: z.string().trim().min(2).max(120).optional(),
        razorpayOrderId: z.string().trim().min(2).max(120).optional(),
        razorpaySignature: z.string().trim().min(8).max(260).optional(),
        rawProviderStatus: z.string().trim().min(2).max(80).optional()
    }).strict()
});

export const paymentFailureSchema = z.object({
    params: z.object({
        paymentId: nonEmptyString
    }),
    body: z.object({
        failureReason: z.string().trim().min(2).max(180),
        providerPaymentId: z.string().trim().min(2).max(120).optional(),
        providerOrderId: z.string().trim().min(2).max(120).optional(),
        providerPaymentIntentId: z.string().trim().min(2).max(120).optional(),
        rawProviderStatus: z.string().trim().min(2).max(80).optional()
    }).strict()
});
