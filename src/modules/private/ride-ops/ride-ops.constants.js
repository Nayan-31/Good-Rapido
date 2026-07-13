import { RIDE_BOOKING_STATUSES } from '../../public/ride-booking/ride-booking.constants.js';
import { RIDE_LIFECYCLE_STATUSES } from '../../public/rides/rides.constants.js';

export const RIDE_OPS_FILTERS = Object.freeze({
    ALL: 'all',
    PENDING_CONFIRMATION: RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION,
    ACTIVE: 'active',
    DRIVER_EN_ROUTE: RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE,
    IN_PROGRESS: RIDE_LIFECYCLE_STATUSES.IN_PROGRESS,
    COMPLETED: RIDE_LIFECYCLE_STATUSES.COMPLETED,
    CANCELLED: RIDE_LIFECYCLE_STATUSES.CANCELLED,
    HIGH_RISK: 'high_risk'
});

export const RIDE_OPS_PRIORITY_LEVELS = Object.freeze({
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
});

export const RIDE_OPS_ISSUE_STATUSES = Object.freeze({
    NONE: 'none',
    MONITORING: 'monitoring',
    ESCALATED: 'escalated',
    RESOLVED: 'resolved'
});

export const RIDE_OPS_ACTIONS = Object.freeze({
    ASSIGN_OWNER: 'assign_owner',
    UPDATE_PRIORITY: 'update_priority',
    UPDATE_ISSUE_STATUS: 'update_issue_status',
    REASSIGN_DRIVER: 'reassign_driver',
    CONFIRM_RIDE: 'confirm_ride',
    CANCEL_RIDE: 'cancel_ride',
    ADD_NOTE: 'add_note'
});

export const RIDE_OPS_MUTABLE_BOOKING_STATUSES = Object.freeze([
    RIDE_BOOKING_STATUSES.DRIVER_SELECTED,
    RIDE_BOOKING_STATUSES.CONFIRMED
]);

export const RIDE_OPS_DEFAULT_DASHBOARD_HOURS = 24;

export const RIDE_OPS_HIGH_RISK_THRESHOLD = 70;
