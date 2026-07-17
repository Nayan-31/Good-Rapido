export const DRIVER_ONBOARDING_STATUSES = Object.freeze({
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected'
});

export const DRIVER_APPROVAL_STATUSES = Object.freeze({
    PENDING: 'pending',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended'
});

export const DRIVER_ONBOARDING_STEP_STATUSES = Object.freeze({
    PENDING: 'pending',
    COMPLETED: 'completed',
    SKIPPED: 'skipped',
    REJECTED: 'rejected'
});

export const DRIVER_ONBOARDING_STEP_KEYS = Object.freeze({
    PROFILE: 'profile',
    SERVICE_ZONE: 'service_zone',
    VEHICLE_PREFERENCE: 'vehicle_preference',
    DOCUMENTS: 'documents',
    BANK_DETAILS: 'bank_details',
    SAFETY_TRAINING: 'safety_training'
});

export const DRIVER_VEHICLE_TYPES = Object.freeze({
    BIKE: 'bike',
    AUTO: 'auto',
    CAB_ECONOMY: 'cab_economy',
    CAB_PREMIUM: 'cab_premium'
});

export const DRIVER_CONTACT_CHANNELS = Object.freeze({
    IN_APP: 'in_app',
    PHONE: 'phone',
    EMAIL: 'email'
});

export const DRIVER_DEFAULT_PREFERRED_RADIUS_KM = 8;

export const DRIVER_ONBOARDING_STEP_CATALOG = Object.freeze([
    Object.freeze({
        key: DRIVER_ONBOARDING_STEP_KEYS.PROFILE,
        label: 'Driver profile',
        required: true
    }),
    Object.freeze({
        key: DRIVER_ONBOARDING_STEP_KEYS.SERVICE_ZONE,
        label: 'Service zone',
        required: true
    }),
    Object.freeze({
        key: DRIVER_ONBOARDING_STEP_KEYS.VEHICLE_PREFERENCE,
        label: 'Vehicle preference',
        required: true
    }),
    Object.freeze({
        key: DRIVER_ONBOARDING_STEP_KEYS.DOCUMENTS,
        label: 'Documents',
        required: true
    }),
    Object.freeze({
        key: DRIVER_ONBOARDING_STEP_KEYS.BANK_DETAILS,
        label: 'Bank details',
        required: true
    }),
    Object.freeze({
        key: DRIVER_ONBOARDING_STEP_KEYS.SAFETY_TRAINING,
        label: 'Safety training',
        required: true
    })
]);
