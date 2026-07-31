export const PRIVATE_AUTH_ROLES = Object.freeze({
    DRIVER: 'driver',
    ADMIN: 'admin',
    OPS: 'ops'
});

export const PRIVATE_AUTH_ROLE_LABELS = Object.freeze({
    [PRIVATE_AUTH_ROLES.DRIVER]: 'Driver',
    [PRIVATE_AUTH_ROLES.ADMIN]: 'Admin',
    [PRIVATE_AUTH_ROLES.OPS]: 'Ops'
});

export const PRIVATE_AUTH_ACCOUNT_STATUSES = Object.freeze({
    ACTIVE: 'active',
    PENDING: 'pending',
    BLOCKED: 'blocked',
    SUSPENDED: 'suspended'
});

export const PRIVATE_AUTH_PERMISSIONS = Object.freeze({
    DRIVER_PROFILE_READ: 'driver:profile:read',
    DRIVER_PROFILE_WRITE: 'driver:profile:write',
    DRIVER_AVAILABILITY_WRITE: 'driver:availability:write',
    DRIVER_DOCUMENTS_READ: 'driver:documents:read',
    DRIVER_DOCUMENTS_WRITE: 'driver:documents:write',
    DRIVER_DOCUMENTS_REVIEW: 'driver:documents:review',
    DRIVER_VEHICLES_READ: 'driver:vehicles:read',
    DRIVER_VEHICLES_WRITE: 'driver:vehicles:write',
    DRIVER_VEHICLES_REVIEW: 'driver:vehicles:review',
    DRIVER_RIDES_READ: 'driver:rides:read',
    DRIVER_RIDES_WRITE: 'driver:rides:write',
    DRIVER_EARNINGS_READ: 'driver:earnings:read',
    ADMIN_USERS_READ: 'admin:users:read',
    ADMIN_USERS_WRITE: 'admin:users:write',
    OPS_RIDES_READ: 'ops:rides:read',
    OPS_RIDES_WRITE: 'ops:rides:write',
    OPS_DISPUTES_READ: 'ops:disputes:read',
    OPS_DISPUTES_WRITE: 'ops:disputes:write',
    OPS_NOTIFICATIONS_WRITE: 'ops:notifications:write',
    PRICING_READ: 'pricing:read',
    PRICING_WRITE: 'pricing:write',
    TRUST_READ: 'trust:read',
    TRUST_WRITE: 'trust:write',
    FRAUD_READ: 'fraud:read',
    FRAUD_WRITE: 'fraud:write',
    ANALYTICS_READ: 'analytics:read'
});

export const DEFAULT_PRIVATE_ROLE_PERMISSIONS = Object.freeze({
    [PRIVATE_AUTH_ROLES.DRIVER]: Object.freeze([
        PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_READ,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_WRITE,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_AVAILABILITY_WRITE,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_READ,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_WRITE,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_READ,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_WRITE,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_RIDES_READ,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_RIDES_WRITE,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_EARNINGS_READ
    ]),
    [PRIVATE_AUTH_ROLES.ADMIN]: Object.freeze(Object.values(PRIVATE_AUTH_PERMISSIONS)),
    [PRIVATE_AUTH_ROLES.OPS]: Object.freeze([
        PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ,
        PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_WRITE,
        PRIVATE_AUTH_PERMISSIONS.OPS_DISPUTES_READ,
        PRIVATE_AUTH_PERMISSIONS.OPS_DISPUTES_WRITE,
        PRIVATE_AUTH_PERMISSIONS.OPS_NOTIFICATIONS_WRITE,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_REVIEW,
        PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_REVIEW,
        PRIVATE_AUTH_PERMISSIONS.TRUST_READ,
        PRIVATE_AUTH_PERMISSIONS.FRAUD_READ,
        PRIVATE_AUTH_PERMISSIONS.ANALYTICS_READ
    ])
});

export const PRIVATE_AUTH_TOKEN_SCOPE = 'private';
