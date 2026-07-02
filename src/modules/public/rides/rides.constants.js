import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';

export const RIDE_LIFECYCLE_STATUSES = Object.freeze({
    PENDING_CONFIRMATION: 'pending_confirmation',
    DRIVER_EN_ROUTE: 'driver_en_route',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
});

export const RIDE_HISTORY_FILTERS = Object.freeze({
    ALL: 'all',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
});

export const RIDE_PROGRESS_STEPS = Object.freeze({
    [RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION]: 'Awaiting ride confirmation',
    [RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE]: 'Driver is on the way to pickup',
    [RIDE_LIFECYCLE_STATUSES.IN_PROGRESS]: 'Ride is in progress',
    [RIDE_LIFECYCLE_STATUSES.COMPLETED]: 'Ride completed',
    [RIDE_LIFECYCLE_STATUSES.CANCELLED]: 'Ride cancelled'
});

export const RIDE_VISIBLE_BOOKING_STATUSES = Object.freeze([
    RIDE_BOOKING_STATUSES.CONFIRMED,
    RIDE_BOOKING_STATUSES.CANCELLED
]);
