export const IDENTITY_SCOPES = Object.freeze({
    PUBLIC: 'public',
    PRIVATE: 'private'
});

export const IDENTITY_SUBJECT_ROLES = Object.freeze({
    RIDER: 'rider',
    PASSENGER: 'passenger',
    DRIVER: 'driver',
    ADMIN: 'admin',
    OPS: 'ops'
});

export const IDENTITY_STATUSES = Object.freeze({
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
});

export const IDENTITY_DOCUMENT_TYPES = Object.freeze({
    GOVERNMENT_ID: 'government_id',
    DRIVING_LICENSE: 'driving_license',
    PAN_CARD: 'pan_card',
    PROFILE_PHOTO: 'profile_photo',
    ADDRESS_PROOF: 'address_proof'
});

export const IDENTITY_DOCUMENT_STATUSES = Object.freeze({
    UPLOADED: 'uploaded',
    APPROVED: 'approved',
    REJECTED: 'rejected'
});

export const IDENTITY_REVIEW_DECISIONS = Object.freeze({
    VERIFIED: IDENTITY_STATUSES.VERIFIED,
    REJECTED: IDENTITY_STATUSES.REJECTED
});

export const IDENTITY_REQUIRED_DOCUMENTS_BY_ROLE = Object.freeze({
    [IDENTITY_SUBJECT_ROLES.RIDER]: Object.freeze([
        IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID,
        IDENTITY_DOCUMENT_TYPES.PROFILE_PHOTO
    ]),
    [IDENTITY_SUBJECT_ROLES.PASSENGER]: Object.freeze([
        IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID,
        IDENTITY_DOCUMENT_TYPES.PROFILE_PHOTO
    ]),
    [IDENTITY_SUBJECT_ROLES.DRIVER]: Object.freeze([
        IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID,
        IDENTITY_DOCUMENT_TYPES.DRIVING_LICENSE,
        IDENTITY_DOCUMENT_TYPES.PROFILE_PHOTO
    ]),
    [IDENTITY_SUBJECT_ROLES.ADMIN]: Object.freeze([
        IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID
    ]),
    [IDENTITY_SUBJECT_ROLES.OPS]: Object.freeze([
        IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID
    ])
});

export const IDENTITY_DOCUMENT_TYPE_CATALOG = Object.freeze([
    Object.freeze({
        type: IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID,
        label: 'Government ID',
        requiredForRoles: [
            IDENTITY_SUBJECT_ROLES.RIDER,
            IDENTITY_SUBJECT_ROLES.PASSENGER,
            IDENTITY_SUBJECT_ROLES.DRIVER,
            IDENTITY_SUBJECT_ROLES.ADMIN,
            IDENTITY_SUBJECT_ROLES.OPS
        ]
    }),
    Object.freeze({
        type: IDENTITY_DOCUMENT_TYPES.DRIVING_LICENSE,
        label: 'Driving license',
        requiredForRoles: [IDENTITY_SUBJECT_ROLES.DRIVER]
    }),
    Object.freeze({
        type: IDENTITY_DOCUMENT_TYPES.PAN_CARD,
        label: 'PAN card',
        requiredForRoles: []
    }),
    Object.freeze({
        type: IDENTITY_DOCUMENT_TYPES.PROFILE_PHOTO,
        label: 'Profile photo',
        requiredForRoles: [
            IDENTITY_SUBJECT_ROLES.RIDER,
            IDENTITY_SUBJECT_ROLES.PASSENGER,
            IDENTITY_SUBJECT_ROLES.DRIVER
        ]
    }),
    Object.freeze({
        type: IDENTITY_DOCUMENT_TYPES.ADDRESS_PROOF,
        label: 'Address proof',
        requiredForRoles: []
    })
]);
