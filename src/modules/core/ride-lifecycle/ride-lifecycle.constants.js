export const RIDE_LIFECYCLE_STATUSES = Object.freeze({
    PENDING_CONFIRMATION: 'pending_confirmation',
    DRIVER_EN_ROUTE: 'driver_en_route',
    DRIVER_ARRIVED: 'driver_arrived',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
});

export const RIDE_LIFECYCLE_EVENTS = Object.freeze({
    DRIVER_ARRIVED: 'driver_arrived',
    RIDE_STARTED: 'ride_started',
    RIDE_COMPLETED: 'ride_completed',
    RIDE_CANCELLED: 'ride_cancelled'
});

export const RIDE_PROGRESS_STEPS = Object.freeze({
    [RIDE_LIFECYCLE_STATUSES.PENDING_CONFIRMATION]: 'Awaiting ride confirmation',
    [RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE]: 'Driver is on the way to pickup',
    [RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED]: 'Driver arrived at pickup',
    [RIDE_LIFECYCLE_STATUSES.IN_PROGRESS]: 'Ride is in progress',
    [RIDE_LIFECYCLE_STATUSES.COMPLETED]: 'Ride completed',
    [RIDE_LIFECYCLE_STATUSES.CANCELLED]: 'Ride cancelled'
});

export const RIDE_LIFECYCLE_ACTIVE_STATUSES = Object.freeze([
    RIDE_LIFECYCLE_STATUSES.DRIVER_EN_ROUTE,
    RIDE_LIFECYCLE_STATUSES.DRIVER_ARRIVED,
    RIDE_LIFECYCLE_STATUSES.IN_PROGRESS
]);

export const RIDE_LIFECYCLE_TERMINAL_STATUSES = Object.freeze([
    RIDE_LIFECYCLE_STATUSES.COMPLETED,
    RIDE_LIFECYCLE_STATUSES.CANCELLED
]);

export const RIDE_LIFECYCLE_TRANSITION_LOG_LIMIT = 25;
