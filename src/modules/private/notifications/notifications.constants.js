export const PRIVATE_NOTIFICATION_AUDIENCES = Object.freeze({
    USER: 'user',
    MULTI_USER: 'multi_user'
});

export const PRIVATE_NOTIFICATION_DELIVERY_STATUSES = Object.freeze({
    PENDING: 'pending',
    SCHEDULED: 'scheduled',
    SENT: 'sent',
    FAILED: 'failed',
    READ: 'read',
    ARCHIVED: 'archived'
});

export const PRIVATE_NOTIFICATION_ACTIONS = Object.freeze({
    CREATE: 'create',
    SEND: 'send',
    FAIL: 'fail',
    RETRY: 'retry',
    CANCEL: 'cancel'
});

export const PRIVATE_NOTIFICATION_DEFAULT_LIMIT = 25;
export const PRIVATE_NOTIFICATION_DASHBOARD_LIMIT = 50;
export const PRIVATE_NOTIFICATION_MAX_LIMIT = 100;
export const PRIVATE_NOTIFICATION_ACTION_LOG_LIMIT = 50;
