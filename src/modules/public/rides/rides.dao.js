import mongoose from 'mongoose';
import RideBooking from '../ride-booking/ride-booking.model.js';
import { RIDE_BOOKING_STATUSES } from '../ride-booking/ride-booking.constants.js';

export default class RidesDao {
    constructor(model = RideBooking) {
        this.model = model;
    }

    findByIdForUser(rideId, authUserId, role) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.model.findOne({ _id: rideId, authUserId, role });
    }

    findCurrentForUser(authUserId, role) {
        return this.model
            .findOne({
                authUserId,
                role,
                status: RIDE_BOOKING_STATUSES.CONFIRMED
            })
            .sort({ confirmedAt: -1, createdAt: -1 });
    }

    findHistoryForUser(authUserId, role, { bookingStatuses, limit = 10 } = {}) {
        const filter = { authUserId, role };

        if (bookingStatuses?.length) {
            filter.status = { $in: bookingStatuses };
        }

        return this.model.find(filter).sort({ createdAt: -1 }).limit(limit);
    }
}
