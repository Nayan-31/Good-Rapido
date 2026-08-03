import mongoose from 'mongoose';
import RideBooking from './ride-booking.model.js';
import { RIDE_BOOKING_STATUSES } from './ride-booking.constants.js';

export default class RideBookingDao {
    constructor(model = RideBooking) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findByIdForUser(bookingId, authUserId, role) {
        if (!mongoose.isValidObjectId(bookingId)) {
            return null;
        }

        return this.model.findOne({ _id: bookingId, authUserId, role });
    }

    updateSelectedDriver(bookingId, authUserId, role, selectedDriver, trustSignals) {
        if (!mongoose.isValidObjectId(bookingId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: bookingId, authUserId, role },
            {
                $set: {
                    selectedDriver,
                    trustSignals,
                    status: RIDE_BOOKING_STATUSES.DRIVER_SELECTED
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
    }

    confirmBooking(bookingId, authUserId, role, confirmedAt) {
        if (!mongoose.isValidObjectId(bookingId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: bookingId, authUserId, role },
            {
                $set: {
                    status: RIDE_BOOKING_STATUSES.CONFIRMED,
                    confirmedAt
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
    }

    cancelBooking(bookingId, authUserId, role, cancellation) {
        if (!mongoose.isValidObjectId(bookingId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: bookingId, authUserId, role },
            {
                $set: {
                    status: RIDE_BOOKING_STATUSES.CANCELLED,
                    cancellation
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
    }
}
