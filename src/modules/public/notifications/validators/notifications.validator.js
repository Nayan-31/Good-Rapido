import z from 'zod';
import {
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_DEVICE_PLATFORMS,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPES
} from '../notifications.constants.js';

const nonEmptyString = z.string().trim().min(1);
const timeString = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const channelPreferencesSchema = z.object({
    inApp: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    email: z.boolean().optional()
}).strict();

const categoryPreferencesSchema = z.object({
    rides: z.boolean().optional(),
    fares: z.boolean().optional(),
    payments: z.boolean().optional(),
    promos: z.boolean().optional(),
    ratings: z.boolean().optional(),
    disputes: z.boolean().optional(),
    safety: z.boolean().optional(),
    system: z.boolean().optional()
}).strict();

const quietHoursSchema = z.object({
    enabled: z.boolean().optional(),
    start: timeString.optional(),
    end: timeString.optional(),
    timezone: z.string().trim().min(1).max(60).optional()
}).strict();

export const notificationQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(NOTIFICATION_STATUSES)).optional(),
        type: z.enum(Object.values(NOTIFICATION_TYPES)).optional(),
        category: z.enum(Object.values(NOTIFICATION_CATEGORIES)).optional(),
        priority: z.enum(Object.values(NOTIFICATION_PRIORITIES)).optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20)
    })
});

export const notificationParamsSchema = z.object({
    params: z.object({
        notificationId: nonEmptyString
    })
});

export const markAllReadSchema = z.object({
    body: z.object({
        type: z.enum(Object.values(NOTIFICATION_TYPES)).optional(),
        category: z.enum(Object.values(NOTIFICATION_CATEGORIES)).optional()
    }).default({})
});

export const updateNotificationPreferencesSchema = z.object({
    body: z.object({
        channels: channelPreferencesSchema.optional(),
        categories: categoryPreferencesSchema.optional(),
        quietHours: quietHoursSchema.optional()
    }).refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one preference field is required' }
    )
});

export const registerNotificationDeviceSchema = z.object({
    body: z.object({
        token: z.string().trim().min(8).max(300),
        platform: z.enum(Object.values(NOTIFICATION_DEVICE_PLATFORMS)),
        appVersion: z.string().trim().max(40).optional(),
        enabled: z.boolean().default(true)
    })
});
