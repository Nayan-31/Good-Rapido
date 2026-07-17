export const AUTH_ROLES = Object.freeze({
    RIDER: 'rider',
    PASSENGER: 'passenger'
});

export const AUTH_ROLE_LABELS = Object.freeze({
    [AUTH_ROLES.RIDER]: 'Rider',
    [AUTH_ROLES.PASSENGER]: 'Passenger'
});

export const AUTH_ACCOUNT_STATUSES = Object.freeze({
    ACTIVE: 'active',
    BLOCKED: 'blocked',
    PENDING: 'pending'
});
