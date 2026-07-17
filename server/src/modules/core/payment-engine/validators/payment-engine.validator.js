import z from 'zod';
import {
    PAYMENT_ENGINE_METHODS,
    PAYMENT_ENGINE_REFUND_REASONS,
    PAYMENT_ENGINE_STATUSES
} from '../payment-engine.constants.js';

const scoreAmountSchema = z.coerce.number().min(0).max(200000);
const idSchema = z.string().trim().min(1).max(80);

export const previewPaymentIntentSchema = z.object({
    body: z.object({
        rideId: idSchema.optional(),
        paymentMethod: z.enum(Object.values(PAYMENT_ENGINE_METHODS)).default(PAYMENT_ENGINE_METHODS.PERSONAL_WALLET),
        fareAmount: scoreAmountSchema,
        tipAmount: z.coerce.number().min(0).max(500).default(0),
        discountAmount: z.coerce.number().min(0).max(5000).default(0),
        walletBalance: z.coerce.number().min(0).max(1000000).optional(),
        requestedAt: z.coerce.date().optional()
    }).strict()
});

export const previewRefundSchema = z.object({
    body: z.object({
        payment: z.object({
            id: idSchema.optional(),
            paymentCode: z.string().trim().min(1).max(120).optional(),
            status: z.enum(Object.values(PAYMENT_ENGINE_STATUSES)),
            amount: scoreAmountSchema,
            currency: z.string().trim().min(2).max(8).optional(),
            refundableUntil: z.coerce.date().nullable().optional(),
            refund: z.object({}).passthrough().nullable().optional()
        }).strict(),
        reason: z.enum(Object.values(PAYMENT_ENGINE_REFUND_REASONS)),
        note: z.string().trim().max(180).optional(),
        amount: z.coerce.number().min(1).max(200000).optional(),
        requestedAt: z.coerce.date().optional()
    }).strict()
});
