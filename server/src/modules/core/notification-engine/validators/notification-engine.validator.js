import z from 'zod';
import { AUTH_ROLES } from '../../../public/auth/auth.constants.js';
import {
    NOTIFICATION_ENGINE_CATEGORIES,
    NOTIFICATION_ENGINE_CHANNELS,
    NOTIFICATION_ENGINE_ENTITY_TYPES,
    NOTIFICATION_ENGINE_PRIORITIES,
    NOTIFICATION_ENGINE_TYPES
} from '../notification-engine.constants.js';

const timeString = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const recipientSchema = z.object({
    authUserId: z.string().trim().min(1).max(80),
    role: z.enum(Object.values(AUTH_ROLES))
}).strict();
const preferencesSchema = z.object({
    channels: z.object({
        inApp: z.boolean().optional(),
        push: z.boolean().optional(),
        sms: z.boolean().optional(),
        email: z.boolean().optional()
    }).strict().optional(),
    categories: z.object({
        rides: z.boolean().optional(),
        fares: z.boolean().optional(),
        payments: z.boolean().optional(),
        promos: z.boolean().optional(),
        ratings: z.boolean().optional(),
        disputes: z.boolean().optional(),
        safety: z.boolean().optional(),
        system: z.boolean().optional()
    }).strict().optional(),
    quietHours: z.object({
        enabled: z.boolean().optional(),
        start: timeString.optional(),
        end: timeString.optional(),
        timezone: z.string().trim().min(1).max(60).optional()
    }).strict().optional()
}).strict().optional();
const relatedEntitySchema = z.object({
    type: z.enum(Object.values(NOTIFICATION_ENGINE_ENTITY_TYPES)),
    id: z.string().trim().min(1).max(120).optional(),
    code: z.string().trim().min(1).max(120).optional()
}).strict();

export const planNotificationDeliverySchema = z.object({
    body: z.object({
        type: z.enum(Object.values(NOTIFICATION_ENGINE_TYPES)),
        category: z.enum(Object.values(NOTIFICATION_ENGINE_CATEGORIES)).optional(),
        priority: z.enum(Object.values(NOTIFICATION_ENGINE_PRIORITIES)).optional(),
        channel: z.enum(Object.values(NOTIFICATION_ENGINE_CHANNELS)).optional(),
        preferences: preferencesSchema,
        scheduledAt: z.coerce.date().optional(),
        expiresAt: z.coerce.date().optional(),
        requestedAt: z.coerce.date().optional()
    }).strict()
});

export const composeNotificationSchema = z.object({
    body: z.object({
        recipient: recipientSchema,
        type: z.enum(Object.values(NOTIFICATION_ENGINE_TYPES)),
        category: z.enum(Object.values(NOTIFICATION_ENGINE_CATEGORIES)).optional(),
        priority: z.enum(Object.values(NOTIFICATION_ENGINE_PRIORITIES)).optional(),
        channel: z.enum(Object.values(NOTIFICATION_ENGINE_CHANNELS)).optional(),
        title: z.string().trim().min(2).max(120),
        message: z.string().trim().min(2).max(500),
        actionLabel: z.string().trim().min(2).max(60).optional(),
        actionUrl: z.string().trim().min(1).max(500).optional(),
        relatedEntity: relatedEntitySchema.optional(),
        scheduledAt: z.coerce.date().optional(),
        expiresAt: z.coerce.date().optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
    }).strict().refine(
        (body) => !body.scheduledAt || !body.expiresAt || body.expiresAt > body.scheduledAt,
        { message: 'expiresAt must be after scheduledAt', path: ['expiresAt'] }
    )
});
