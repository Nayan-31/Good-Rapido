import z from 'zod';
import { AUTH_ROLES } from '../../../public/auth/auth.constants.js';
import {
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_ENTITY_TYPES,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPES
} from '../../../public/notifications/notifications.constants.js';
import {
    PRIVATE_NOTIFICATION_DELIVERY_STATUSES,
    PRIVATE_NOTIFICATION_MAX_LIMIT
} from '../notifications.constants.js';

const notificationIdSchema = z.string().trim().min(1).max(80);
const authUserIdSchema = z.string().trim().min(1).max(80);
const noteSchema = z.string().trim().min(2).max(500);

const recipientSchema = z.object({
    authUserId: authUserIdSchema,
    role: z.enum(Object.values(AUTH_ROLES))
}).strict();

const relatedEntitySchema = z.object({
    type: z.enum(Object.values(NOTIFICATION_ENTITY_TYPES)),
    id: z.string().trim().min(1).max(120).optional(),
    code: z.string().trim().min(1).max(120).optional()
}).strict();

const metadataSchema = z.record(z.string(), z.unknown()).optional();

export const privateNotificationParamsSchema = z.object({
    params: z.object({
        notificationId: notificationIdSchema
    })
});

export const privateNotificationQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(NOTIFICATION_STATUSES)).optional(),
        deliveryStatus: z.enum(Object.values(PRIVATE_NOTIFICATION_DELIVERY_STATUSES)).optional(),
        type: z.enum(Object.values(NOTIFICATION_TYPES)).optional(),
        category: z.enum(Object.values(NOTIFICATION_CATEGORIES)).optional(),
        priority: z.enum(Object.values(NOTIFICATION_PRIORITIES)).optional(),
        channel: z.enum(Object.values(NOTIFICATION_CHANNELS)).optional(),
        role: z.enum(Object.values(AUTH_ROLES)).optional(),
        q: z.string().trim().min(1).max(120).optional(),
        limit: z.coerce.number().int().min(1).max(PRIVATE_NOTIFICATION_MAX_LIMIT).optional()
    }).strict()
});

export const createPrivateNotificationSchema = z.object({
    body: z.object({
        recipient: recipientSchema.optional(),
        recipients: z.array(recipientSchema).min(1).max(100).optional(),
        type: z.enum(Object.values(NOTIFICATION_TYPES)),
        category: z.enum(Object.values(NOTIFICATION_CATEGORIES)).optional(),
        priority: z.enum(Object.values(NOTIFICATION_PRIORITIES)).optional(),
        channel: z.enum(Object.values(NOTIFICATION_CHANNELS)).optional(),
        title: z.string().trim().min(2).max(120),
        message: z.string().trim().min(2).max(500),
        actionLabel: z.string().trim().min(2).max(60).optional(),
        actionUrl: z.string().trim().min(1).max(500).optional(),
        relatedEntity: relatedEntitySchema.optional(),
        scheduledAt: z.coerce.date().optional(),
        expiresAt: z.coerce.date().optional(),
        metadata: metadataSchema
    }).strict().refine(
        (body) => Boolean(body.recipient || body.recipients),
        { message: 'recipient or recipients is required' }
    ).refine(
        (body) => !(body.recipient && body.recipients),
        { message: 'Use recipient or recipients, not both' }
    ).refine(
        (body) => !body.scheduledAt || !body.expiresAt || body.expiresAt > body.scheduledAt,
        { message: 'expiresAt must be after scheduledAt', path: ['expiresAt'] }
    )
});

export const failPrivateNotificationSchema = z.object({
    params: z.object({
        notificationId: notificationIdSchema
    }),
    body: z.object({
        failureReason: z.string().trim().min(2).max(180),
        note: noteSchema.optional()
    }).strict()
});

export const cancelPrivateNotificationSchema = z.object({
    params: z.object({
        notificationId: notificationIdSchema
    }),
    body: z.object({
        note: noteSchema.optional()
    }).default({})
});
