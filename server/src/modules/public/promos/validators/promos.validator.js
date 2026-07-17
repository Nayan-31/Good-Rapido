import z from 'zod';
import { PROMO_APPLICATION_STATUSES } from '../promos.constants.js';

const nonEmptyString = z.string().trim().min(1);
const optionalShortString = z.string().trim().min(1).max(120).optional();
const promoCode = z.string().trim().min(2).max(40).transform((value) => value.toUpperCase());

export const promoEligibilityQuerySchema = z.object({
    query: z.object({
        fareAmount: z.coerce.number().min(0).max(200000).default(0),
        rideCount: z.coerce.number().int().min(0).max(2000).default(0),
        city: z.string().trim().min(1).max(80).optional(),
        deviceFingerprint: optionalShortString,
        referralCode: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()).optional()
    })
});

export const promoHistoryQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(PROMO_APPLICATION_STATUSES)).optional(),
        limit: z.coerce.number().int().min(1).max(30).default(10)
    })
});

export const applyPromoSchema = z.object({
    body: z.object({
        promoCode,
        fareAmount: z.coerce.number().min(1).max(200000),
        rideId: nonEmptyString.optional(),
        rideCount: z.coerce.number().int().min(0).max(2000).default(0),
        city: z.string().trim().min(1).max(80).optional(),
        referralCode: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()).optional(),
        deviceFingerprint: optionalShortString
    })
});
