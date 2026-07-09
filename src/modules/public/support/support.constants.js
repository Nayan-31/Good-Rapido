export const SUPPORT_STATUSES = Object.freeze({
    OPEN: 'open',
    WAITING_FOR_SUPPORT: 'waiting_for_support',
    WAITING_FOR_USER: 'waiting_for_user',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    CANCELLED: 'cancelled'
});

export const SUPPORT_OPEN_STATUSES = Object.freeze([
    SUPPORT_STATUSES.OPEN,
    SUPPORT_STATUSES.WAITING_FOR_SUPPORT,
    SUPPORT_STATUSES.WAITING_FOR_USER
]);

export const SUPPORT_CATEGORIES = Object.freeze({
    RIDE_BOOKING: 'ride_booking',
    ACTIVE_RIDE: 'active_ride',
    FARE_PAYMENT: 'fare_payment',
    SAFETY: 'safety',
    ACCOUNT_PROFILE: 'account_profile',
    PROMOS_REWARDS: 'promos_rewards',
    DRIVER_FEEDBACK: 'driver_feedback',
    TECHNICAL_ISSUE: 'technical_issue',
    OTHER: 'other'
});

export const SUPPORT_PRIORITIES = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
});

export const SUPPORT_CHANNELS = Object.freeze({
    IN_APP: 'in_app',
    CHAT: 'chat',
    EMAIL: 'email',
    PHONE: 'phone'
});

export const SUPPORT_CONTACT_METHODS = Object.freeze({
    IN_APP: 'in_app',
    CALLBACK: 'callback',
    EMAIL: 'email'
});

export const SUPPORT_ATTACHMENT_TYPES = Object.freeze({
    IMAGE: 'image',
    RECEIPT: 'receipt',
    LOCATION_SNAPSHOT: 'location_snapshot',
    AUDIO: 'audio',
    TEXT_NOTE: 'text_note'
});

export const SUPPORT_ENTITY_TYPES = Object.freeze({
    RIDE: 'ride',
    PAYMENT: 'payment',
    PROMO: 'promo',
    PROFILE: 'profile',
    DRIVER: 'driver',
    DISPUTE: 'dispute',
    NOTIFICATION: 'notification',
    SYSTEM: 'system'
});

export const SUPPORT_MESSAGE_SENDERS = Object.freeze({
    USER: 'user',
    SUPPORT: 'support',
    SYSTEM: 'system'
});

export const SUPPORT_CATEGORY_CATALOG = Object.freeze([
    Object.freeze({
        category: SUPPORT_CATEGORIES.RIDE_BOOKING,
        label: 'Ride booking',
        defaultPriority: SUPPORT_PRIORITIES.MEDIUM,
        responseHours: 12,
        suggestedChannel: SUPPORT_CHANNELS.IN_APP
    }),
    Object.freeze({
        category: SUPPORT_CATEGORIES.ACTIVE_RIDE,
        label: 'Active ride help',
        defaultPriority: SUPPORT_PRIORITIES.HIGH,
        responseHours: 2,
        suggestedChannel: SUPPORT_CHANNELS.CHAT
    }),
    Object.freeze({
        category: SUPPORT_CATEGORIES.FARE_PAYMENT,
        label: 'Fare or payment',
        defaultPriority: SUPPORT_PRIORITIES.HIGH,
        responseHours: 12,
        suggestedChannel: SUPPORT_CHANNELS.IN_APP
    }),
    Object.freeze({
        category: SUPPORT_CATEGORIES.SAFETY,
        label: 'Safety',
        defaultPriority: SUPPORT_PRIORITIES.URGENT,
        responseHours: 1,
        suggestedChannel: SUPPORT_CHANNELS.PHONE
    }),
    Object.freeze({
        category: SUPPORT_CATEGORIES.ACCOUNT_PROFILE,
        label: 'Account or profile',
        defaultPriority: SUPPORT_PRIORITIES.MEDIUM,
        responseHours: 24,
        suggestedChannel: SUPPORT_CHANNELS.IN_APP
    }),
    Object.freeze({
        category: SUPPORT_CATEGORIES.PROMOS_REWARDS,
        label: 'Promos or rewards',
        defaultPriority: SUPPORT_PRIORITIES.LOW,
        responseHours: 24,
        suggestedChannel: SUPPORT_CHANNELS.IN_APP
    }),
    Object.freeze({
        category: SUPPORT_CATEGORIES.DRIVER_FEEDBACK,
        label: 'Driver feedback',
        defaultPriority: SUPPORT_PRIORITIES.MEDIUM,
        responseHours: 12,
        suggestedChannel: SUPPORT_CHANNELS.IN_APP
    }),
    Object.freeze({
        category: SUPPORT_CATEGORIES.TECHNICAL_ISSUE,
        label: 'Technical issue',
        defaultPriority: SUPPORT_PRIORITIES.MEDIUM,
        responseHours: 24,
        suggestedChannel: SUPPORT_CHANNELS.EMAIL
    }),
    Object.freeze({
        category: SUPPORT_CATEGORIES.OTHER,
        label: 'Other help',
        defaultPriority: SUPPORT_PRIORITIES.LOW,
        responseHours: 48,
        suggestedChannel: SUPPORT_CHANNELS.IN_APP
    })
]);

export const SUPPORT_FAQ_CATALOG = Object.freeze([
    Object.freeze({
        id: 'fare-breakdown',
        category: SUPPORT_CATEGORIES.FARE_PAYMENT,
        title: 'How is my fare calculated?',
        answer: 'Your fare combines base fare, distance, trip time, surge multiplier, taxes, and any active promo or wallet adjustment.',
        tags: Object.freeze(['fare', 'pricing', 'breakdown']),
        relatedActions: Object.freeze(['View fare receipt', 'Open fare dispute'])
    }),
    Object.freeze({
        id: 'fare-lock-expiry',
        category: SUPPORT_CATEGORIES.RIDE_BOOKING,
        title: 'Why did my fare lock expire?',
        answer: 'Fare locks are held for a short booking window. If the booking is not confirmed in time, the latest live fare is shown before you continue.',
        tags: Object.freeze(['fare_lock', 'booking']),
        relatedActions: Object.freeze(['Estimate fare again'])
    }),
    Object.freeze({
        id: 'driver-cancelled',
        category: SUPPORT_CATEGORIES.ACTIVE_RIDE,
        title: 'What happens if a driver cancels?',
        answer: 'You can search again immediately. Repeated or suspicious driver cancellations are tracked and may affect driver reliability signals.',
        tags: Object.freeze(['driver', 'cancellation', 'trust']),
        relatedActions: Object.freeze(['Book another ride', 'Report cancellation issue'])
    }),
    Object.freeze({
        id: 'payment-deducted',
        category: SUPPORT_CATEGORIES.FARE_PAYMENT,
        title: 'My payment was deducted but the ride failed',
        answer: 'Failed ride payments are reconciled automatically. If the amount is not reversed within the expected window, create a support ticket with the payment reference.',
        tags: Object.freeze(['payment', 'refund']),
        relatedActions: Object.freeze(['Create payment ticket'])
    }),
    Object.freeze({
        id: 'safety-emergency',
        category: SUPPORT_CATEGORIES.SAFETY,
        title: 'How do I get urgent safety help?',
        answer: 'Use the in-ride safety action for immediate help. For past rides, create a safety support ticket and include ride details, screenshots, or notes.',
        tags: Object.freeze(['safety', 'emergency']),
        relatedActions: Object.freeze(['Contact safety support'])
    }),
    Object.freeze({
        id: 'update-profile',
        category: SUPPORT_CATEGORIES.ACCOUNT_PROFILE,
        title: 'How do I update my profile details?',
        answer: 'You can update basic profile details from your profile page. Phone and identity changes may require additional verification.',
        tags: Object.freeze(['profile', 'account']),
        relatedActions: Object.freeze(['Open profile'])
    })
]);
