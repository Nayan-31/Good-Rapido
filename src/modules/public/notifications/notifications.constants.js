export const NOTIFICATION_STATUSES = Object.freeze({
    UNREAD: 'unread',
    READ: 'read',
    ARCHIVED: 'archived'
});

export const NOTIFICATION_TYPES = Object.freeze({
    RIDE_ALERT: 'ride_alert',
    FARE_LOCK_EXPIRY: 'fare_lock_expiry',
    PAYMENT_UPDATE: 'payment_update',
    PROMO_OFFER: 'promo_offer',
    RATING_REMINDER: 'rating_reminder',
    DISPUTE_UPDATE: 'dispute_update',
    SAFETY_ALERT: 'safety_alert',
    SYSTEM: 'system'
});

export const NOTIFICATION_CATEGORIES = Object.freeze({
    RIDES: 'rides',
    FARES: 'fares',
    PAYMENTS: 'payments',
    PROMOS: 'promos',
    RATINGS: 'ratings',
    DISPUTES: 'disputes',
    SAFETY: 'safety',
    SYSTEM: 'system'
});

export const NOTIFICATION_PRIORITIES = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
});

export const NOTIFICATION_CHANNELS = Object.freeze({
    IN_APP: 'in_app',
    PUSH: 'push',
    SMS: 'sms',
    EMAIL: 'email'
});

export const NOTIFICATION_DEVICE_PLATFORMS = Object.freeze({
    IOS: 'ios',
    ANDROID: 'android',
    WEB: 'web'
});

export const NOTIFICATION_ENTITY_TYPES = Object.freeze({
    RIDE: 'ride',
    PAYMENT: 'payment',
    PROMO: 'promo',
    RATING: 'rating',
    DISPUTE: 'dispute',
    PROFILE: 'profile',
    SYSTEM: 'system'
});

export const NOTIFICATION_TYPE_CATALOG = Object.freeze([
    Object.freeze({
        type: NOTIFICATION_TYPES.RIDE_ALERT,
        category: NOTIFICATION_CATEGORIES.RIDES,
        label: 'Ride alerts',
        defaultPriority: NOTIFICATION_PRIORITIES.HIGH,
        defaultChannel: NOTIFICATION_CHANNELS.PUSH
    }),
    Object.freeze({
        type: NOTIFICATION_TYPES.FARE_LOCK_EXPIRY,
        category: NOTIFICATION_CATEGORIES.FARES,
        label: 'Fare lock expiry',
        defaultPriority: NOTIFICATION_PRIORITIES.MEDIUM,
        defaultChannel: NOTIFICATION_CHANNELS.PUSH
    }),
    Object.freeze({
        type: NOTIFICATION_TYPES.PAYMENT_UPDATE,
        category: NOTIFICATION_CATEGORIES.PAYMENTS,
        label: 'Payment updates',
        defaultPriority: NOTIFICATION_PRIORITIES.HIGH,
        defaultChannel: NOTIFICATION_CHANNELS.PUSH
    }),
    Object.freeze({
        type: NOTIFICATION_TYPES.PROMO_OFFER,
        category: NOTIFICATION_CATEGORIES.PROMOS,
        label: 'Promo offers',
        defaultPriority: NOTIFICATION_PRIORITIES.LOW,
        defaultChannel: NOTIFICATION_CHANNELS.IN_APP
    }),
    Object.freeze({
        type: NOTIFICATION_TYPES.RATING_REMINDER,
        category: NOTIFICATION_CATEGORIES.RATINGS,
        label: 'Rating reminders',
        defaultPriority: NOTIFICATION_PRIORITIES.LOW,
        defaultChannel: NOTIFICATION_CHANNELS.IN_APP
    }),
    Object.freeze({
        type: NOTIFICATION_TYPES.DISPUTE_UPDATE,
        category: NOTIFICATION_CATEGORIES.DISPUTES,
        label: 'Dispute updates',
        defaultPriority: NOTIFICATION_PRIORITIES.HIGH,
        defaultChannel: NOTIFICATION_CHANNELS.PUSH
    }),
    Object.freeze({
        type: NOTIFICATION_TYPES.SAFETY_ALERT,
        category: NOTIFICATION_CATEGORIES.SAFETY,
        label: 'Safety alerts',
        defaultPriority: NOTIFICATION_PRIORITIES.URGENT,
        defaultChannel: NOTIFICATION_CHANNELS.PUSH
    }),
    Object.freeze({
        type: NOTIFICATION_TYPES.SYSTEM,
        category: NOTIFICATION_CATEGORIES.SYSTEM,
        label: 'System notices',
        defaultPriority: NOTIFICATION_PRIORITIES.MEDIUM,
        defaultChannel: NOTIFICATION_CHANNELS.IN_APP
    })
]);

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
    channels: Object.freeze({
        inApp: true,
        push: true,
        sms: false,
        email: true
    }),
    categories: Object.freeze({
        rides: true,
        fares: true,
        payments: true,
        promos: true,
        ratings: true,
        disputes: true,
        safety: true,
        system: true
    }),
    quietHours: Object.freeze({
        enabled: false,
        start: '22:00',
        end: '07:00',
        timezone: 'Asia/Kolkata'
    })
});
