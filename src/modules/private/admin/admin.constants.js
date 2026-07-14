import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';

export const ADMIN_USER_LIST_DEFAULT_LIMIT = 20;
export const ADMIN_USER_LIST_MAX_LIMIT = 50;

export const ADMIN_DASHBOARD_MODULES = Object.freeze([
    Object.freeze({
        key: 'users',
        label: 'Private users',
        description: 'Manage driver, admin, and ops accounts',
        requiredPermission: PRIVATE_AUTH_PERMISSIONS.ADMIN_USERS_READ
    }),
    Object.freeze({
        key: 'ride_ops',
        label: 'Ride operations',
        description: 'Monitor live and reviewed rides',
        requiredPermission: PRIVATE_AUTH_PERMISSIONS.OPS_RIDES_READ
    }),
    Object.freeze({
        key: 'pricing',
        label: 'Pricing',
        description: 'Manage vehicle fares, surge rules, and pricing simulations',
        requiredPermission: PRIVATE_AUTH_PERMISSIONS.PRICING_READ
    }),
    Object.freeze({
        key: 'surge',
        label: 'Surge controls',
        description: 'Manage live surge windows, multipliers, and rider impact',
        requiredPermission: PRIVATE_AUTH_PERMISSIONS.PRICING_READ
    }),
    Object.freeze({
        key: 'disputes',
        label: 'Dispute operations',
        description: 'Review user disputes and evidence',
        requiredPermission: PRIVATE_AUTH_PERMISSIONS.OPS_DISPUTES_READ
    }),
    Object.freeze({
        key: 'trust',
        label: 'Trust signals',
        description: 'Inspect rider and driver trust scores',
        requiredPermission: PRIVATE_AUTH_PERMISSIONS.TRUST_READ
    }),
    Object.freeze({
        key: 'fraud',
        label: 'Fraud review',
        description: 'Review suspicious trips, promos, and account behavior',
        requiredPermission: PRIVATE_AUTH_PERMISSIONS.FRAUD_READ
    }),
    Object.freeze({
        key: 'analytics',
        label: 'Analytics',
        description: 'View operational and demand insights',
        requiredPermission: PRIVATE_AUTH_PERMISSIONS.ANALYTICS_READ
    })
]);

export const ADMIN_MANAGED_ROLES = Object.freeze(Object.values(PRIVATE_AUTH_ROLES));
export const ADMIN_MANAGED_STATUSES = Object.freeze(Object.values(PRIVATE_AUTH_ACCOUNT_STATUSES));
export const ADMIN_MANAGED_PERMISSIONS = Object.freeze(Object.values(PRIVATE_AUTH_PERMISSIONS));
