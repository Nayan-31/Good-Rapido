import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_DEVICE_PLATFORMS,
    NOTIFICATION_ENTITY_TYPES,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPES
} from './notifications.constants.js';

const relatedEntitySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(NOTIFICATION_ENTITY_TYPES)
        },
        id: {
            type: String,
            trim: true
        },
        code: {
            type: String,
            trim: true
        }
    },
    { _id: false }
);

const deliverySchema = new mongoose.Schema(
    {
        scheduledAt: {
            type: Date
        },
        sentAt: {
            type: Date
        },
        readAt: {
            type: Date
        },
        archivedAt: {
            type: Date
        },
        failedAt: {
            type: Date
        },
        failureReason: {
            type: String,
            trim: true,
            maxlength: 180
        }
    },
    { _id: false }
);

const notificationSchema = new mongoose.Schema(
    {
        notificationCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },
        authUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AuthUser',
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: Object.values(AUTH_ROLES),
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: Object.values(NOTIFICATION_TYPES),
            required: true,
            index: true
        },
        category: {
            type: String,
            enum: Object.values(NOTIFICATION_CATEGORIES),
            required: true,
            index: true
        },
        priority: {
            type: String,
            enum: Object.values(NOTIFICATION_PRIORITIES),
            default: NOTIFICATION_PRIORITIES.MEDIUM,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(NOTIFICATION_STATUSES),
            default: NOTIFICATION_STATUSES.UNREAD,
            index: true
        },
        channel: {
            type: String,
            enum: Object.values(NOTIFICATION_CHANNELS),
            default: NOTIFICATION_CHANNELS.IN_APP,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        actionLabel: {
            type: String,
            trim: true,
            maxlength: 60
        },
        actionUrl: {
            type: String,
            trim: true,
            maxlength: 500
        },
        relatedEntity: {
            type: relatedEntitySchema,
            default: null
        },
        delivery: {
            type: deliverySchema,
            default: {}
        },
        expiresAt: {
            type: Date,
            index: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        collection: 'public_notifications',
        timestamps: true,
        versionKey: false
    }
);

const notificationChannelPreferencesSchema = new mongoose.Schema(
    {
        inApp: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.channels.inApp
        },
        push: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.channels.push
        },
        sms: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.channels.sms
        },
        email: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.channels.email
        }
    },
    { _id: false }
);

const notificationCategoryPreferencesSchema = new mongoose.Schema(
    {
        rides: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.categories.rides
        },
        fares: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.categories.fares
        },
        payments: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.categories.payments
        },
        promos: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.categories.promos
        },
        ratings: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.categories.ratings
        },
        disputes: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.categories.disputes
        },
        safety: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.categories.safety
        },
        system: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.categories.system
        }
    },
    { _id: false }
);

const quietHoursSchema = new mongoose.Schema(
    {
        enabled: {
            type: Boolean,
            default: DEFAULT_NOTIFICATION_PREFERENCES.quietHours.enabled
        },
        start: {
            type: String,
            default: DEFAULT_NOTIFICATION_PREFERENCES.quietHours.start,
            trim: true,
            maxlength: 5
        },
        end: {
            type: String,
            default: DEFAULT_NOTIFICATION_PREFERENCES.quietHours.end,
            trim: true,
            maxlength: 5
        },
        timezone: {
            type: String,
            default: DEFAULT_NOTIFICATION_PREFERENCES.quietHours.timezone,
            trim: true,
            maxlength: 60
        }
    },
    { _id: false }
);

const deviceSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300
        },
        platform: {
            type: String,
            enum: Object.values(NOTIFICATION_DEVICE_PLATFORMS),
            required: true
        },
        appVersion: {
            type: String,
            trim: true,
            maxlength: 40
        },
        enabled: {
            type: Boolean,
            default: true
        },
        lastSeenAt: {
            type: Date,
            required: true
        }
    },
    { _id: false }
);

const notificationPreferenceSchema = new mongoose.Schema(
    {
        authUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AuthUser',
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: Object.values(AUTH_ROLES),
            required: true,
            index: true
        },
        channels: {
            type: notificationChannelPreferencesSchema,
            default: {}
        },
        categories: {
            type: notificationCategoryPreferencesSchema,
            default: {}
        },
        quietHours: {
            type: quietHoursSchema,
            default: {}
        },
        devices: {
            type: [deviceSchema],
            default: []
        }
    },
    {
        collection: 'public_notification_preferences',
        timestamps: true,
        versionKey: false
    }
);

notificationSchema.index({ authUserId: 1, role: 1, status: 1, createdAt: -1 });
notificationSchema.index({ authUserId: 1, role: 1, type: 1, createdAt: -1 });
notificationSchema.index({ authUserId: 1, role: 1, category: 1, createdAt: -1 });
notificationPreferenceSchema.index({ authUserId: 1, role: 1 }, { unique: true });

export const NotificationPreference = mongoose.models.NotificationPreference
    || mongoose.model('NotificationPreference', notificationPreferenceSchema);

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
