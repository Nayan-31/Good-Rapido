export const DISPUTE_CURRENCY = 'INR';
export const DISPUTE_MAX_EVIDENCE_ITEMS = 10;

export const DISPUTE_TYPES = Object.freeze({
    WAITING_CHARGE: 'waiting_charge',
    WRONG_ROUTE: 'wrong_route',
    FAKE_TRIP: 'fake_trip',
    FARE_OVERCHARGE: 'fare_overcharge',
    DRIVER_CANCELLATION: 'driver_cancellation',
    SAFETY_CONCERN: 'safety_concern',
    PAYMENT_ISSUE: 'payment_issue',
    OTHER: 'other'
});

export const DISPUTE_REASONS = Object.freeze({
    WAITING_CHARGE_INCORRECT: 'waiting_charge_incorrect',
    DRIVER_ARRIVED_LATE: 'driver_arrived_late',
    UNNECESSARY_DETOUR: 'unnecessary_detour',
    WRONG_DROP_LOCATION: 'wrong_drop_location',
    RIDE_MARKED_COMPLETE: 'ride_marked_complete',
    DRIVER_DID_NOT_ARRIVE: 'driver_did_not_arrive',
    FARE_HIGHER_THAN_QUOTE: 'fare_higher_than_quote',
    SURGE_NOT_EXPLAINED: 'surge_not_explained',
    DRIVER_FORCED_CANCEL: 'driver_forced_cancel',
    UNSAFE_DRIVING: 'unsafe_driving',
    DRIVER_BEHAVIOR: 'driver_behavior',
    PAYMENT_DEDUCTED_TWICE: 'payment_deducted_twice',
    REFUND_NOT_RECEIVED: 'refund_not_received',
    OTHER: 'other'
});

export const DISPUTE_STATUSES = Object.freeze({
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    EVIDENCE_REQUESTED: 'evidence_requested',
    RESOLVED: 'resolved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled'
});

export const DISPUTE_OPEN_STATUSES = Object.freeze([
    DISPUTE_STATUSES.SUBMITTED,
    DISPUTE_STATUSES.UNDER_REVIEW,
    DISPUTE_STATUSES.EVIDENCE_REQUESTED
]);

export const DISPUTE_PRIORITIES = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
});

export const DISPUTE_EVIDENCE_TYPES = Object.freeze({
    IMAGE: 'image',
    RECEIPT: 'receipt',
    LOCATION_SNAPSHOT: 'location_snapshot',
    AUDIO: 'audio',
    TEXT_NOTE: 'text_note',
    SUPPORT_NOTE: 'support_note'
});

export const DISPUTE_REQUESTED_RESOLUTIONS = Object.freeze({
    REFUND: 'refund',
    FARE_ADJUSTMENT: 'fare_adjustment',
    DRIVER_REVIEW: 'driver_review',
    ROUTE_REVIEW: 'route_review',
    SAFETY_REVIEW: 'safety_review',
    PAYMENT_REVIEW: 'payment_review',
    OTHER: 'other'
});

export const DISPUTE_RESOLUTION_TYPES = Object.freeze({
    REFUND_APPROVED: 'refund_approved',
    FARE_ADJUSTED: 'fare_adjusted',
    DRIVER_COACHING: 'driver_coaching',
    TRUST_SCORE_UPDATED: 'trust_score_updated',
    NO_ACTION: 'no_action',
    REJECTED: 'rejected'
});

export const DISPUTE_TYPE_CATALOG = Object.freeze([
    Object.freeze({
        type: DISPUTE_TYPES.WAITING_CHARGE,
        label: 'Waiting charge dispute',
        defaultResolution: DISPUTE_REQUESTED_RESOLUTIONS.FARE_ADJUSTMENT,
        priority: DISPUTE_PRIORITIES.MEDIUM,
        responseHours: 24
    }),
    Object.freeze({
        type: DISPUTE_TYPES.WRONG_ROUTE,
        label: 'Wrong route or detour',
        defaultResolution: DISPUTE_REQUESTED_RESOLUTIONS.ROUTE_REVIEW,
        priority: DISPUTE_PRIORITIES.HIGH,
        responseHours: 12
    }),
    Object.freeze({
        type: DISPUTE_TYPES.FAKE_TRIP,
        label: 'Fake trip or ghost ride',
        defaultResolution: DISPUTE_REQUESTED_RESOLUTIONS.SAFETY_REVIEW,
        priority: DISPUTE_PRIORITIES.URGENT,
        responseHours: 6
    }),
    Object.freeze({
        type: DISPUTE_TYPES.FARE_OVERCHARGE,
        label: 'Fare overcharge',
        defaultResolution: DISPUTE_REQUESTED_RESOLUTIONS.FARE_ADJUSTMENT,
        priority: DISPUTE_PRIORITIES.MEDIUM,
        responseHours: 24
    }),
    Object.freeze({
        type: DISPUTE_TYPES.DRIVER_CANCELLATION,
        label: 'Driver cancellation issue',
        defaultResolution: DISPUTE_REQUESTED_RESOLUTIONS.DRIVER_REVIEW,
        priority: DISPUTE_PRIORITIES.HIGH,
        responseHours: 12
    }),
    Object.freeze({
        type: DISPUTE_TYPES.SAFETY_CONCERN,
        label: 'Safety concern',
        defaultResolution: DISPUTE_REQUESTED_RESOLUTIONS.SAFETY_REVIEW,
        priority: DISPUTE_PRIORITIES.URGENT,
        responseHours: 2
    }),
    Object.freeze({
        type: DISPUTE_TYPES.PAYMENT_ISSUE,
        label: 'Payment or refund issue',
        defaultResolution: DISPUTE_REQUESTED_RESOLUTIONS.PAYMENT_REVIEW,
        priority: DISPUTE_PRIORITIES.HIGH,
        responseHours: 12
    }),
    Object.freeze({
        type: DISPUTE_TYPES.OTHER,
        label: 'Other ride issue',
        defaultResolution: DISPUTE_REQUESTED_RESOLUTIONS.OTHER,
        priority: DISPUTE_PRIORITIES.LOW,
        responseHours: 48
    })
]);
