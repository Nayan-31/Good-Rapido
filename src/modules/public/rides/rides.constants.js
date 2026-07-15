import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';
export {
    RIDE_LIFECYCLE_STATUSES,
    RIDE_PROGRESS_STEPS
} from '../../core/ride-lifecycle/ride-lifecycle.constants.js';

export const RIDE_HISTORY_FILTERS = Object.freeze({
    ALL: 'all',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
});

export const RIDE_VISIBLE_BOOKING_STATUSES = Object.freeze([
    RIDE_BOOKING_STATUSES.CONFIRMED,
    RIDE_BOOKING_STATUSES.CANCELLED
]);
