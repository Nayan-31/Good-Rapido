export const DRIVER_DOCUMENT_TYPES = Object.freeze({
    DRIVING_LICENSE: 'driving_license',
    IDENTITY_PROOF: 'identity_proof',
    ADDRESS_PROOF: 'address_proof',
    PROFILE_PHOTO: 'profile_photo',
    BANK_PROOF: 'bank_proof',
    POLICE_VERIFICATION: 'police_verification'
});

export const DRIVER_DOCUMENT_COLLECTION_STATUSES = Object.freeze({
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected'
});

export const DRIVER_DOCUMENT_STATUSES = Object.freeze({
    MISSING: 'missing',
    UPLOADED: 'uploaded',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected'
});

export const DRIVER_DOCUMENT_REVIEW_STATUSES = Object.freeze({
    APPROVED: DRIVER_DOCUMENT_STATUSES.APPROVED,
    REJECTED: DRIVER_DOCUMENT_STATUSES.REJECTED
});

export const DRIVER_REQUIRED_DOCUMENT_TYPES = Object.freeze([
    DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE,
    DRIVER_DOCUMENT_TYPES.IDENTITY_PROOF,
    DRIVER_DOCUMENT_TYPES.ADDRESS_PROOF,
    DRIVER_DOCUMENT_TYPES.PROFILE_PHOTO
]);

export const DRIVER_DOCUMENT_TYPE_CATALOG = Object.freeze([
    Object.freeze({
        type: DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE,
        label: 'Driving license',
        required: true,
        expires: true
    }),
    Object.freeze({
        type: DRIVER_DOCUMENT_TYPES.IDENTITY_PROOF,
        label: 'Identity proof',
        required: true,
        expires: false
    }),
    Object.freeze({
        type: DRIVER_DOCUMENT_TYPES.ADDRESS_PROOF,
        label: 'Address proof',
        required: true,
        expires: false
    }),
    Object.freeze({
        type: DRIVER_DOCUMENT_TYPES.PROFILE_PHOTO,
        label: 'Profile photo',
        required: true,
        expires: false
    }),
    Object.freeze({
        type: DRIVER_DOCUMENT_TYPES.BANK_PROOF,
        label: 'Bank proof',
        required: false,
        expires: false
    }),
    Object.freeze({
        type: DRIVER_DOCUMENT_TYPES.POLICE_VERIFICATION,
        label: 'Police verification',
        required: false,
        expires: true
    })
]);
