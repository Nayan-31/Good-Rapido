import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import { PRIVATE_AUTH_ROLES } from '../auth/auth.constants.js';
import DriverProfile from '../driver/driver.model.js';
import RideBooking from '../../public/ride-booking/ride-booking.model.js';
import { RIDE_BOOKING_STATUSES } from '../../public/ride-booking/ride-booking.constants.js';
import Payment from '../../public/payments/payments.model.js';

export default class EarningsDao {
    constructor({
        authModel = PrivateAuthUser,
        driverProfileModel = DriverProfile,
        rideBookingModel = RideBooking,
        paymentModel = Payment
    } = {}) {
        this.authModel = authModel;
        this.driverProfileModel = driverProfileModel;
        this.rideBookingModel = rideBookingModel;
        this.paymentModel = paymentModel;
    }

    findAuthUserById(authUserId) {
        if (!mongoose.isValidObjectId(authUserId)) {
            return null;
        }

        return this.authModel.findOne({
            _id: authUserId,
            role: PRIVATE_AUTH_ROLES.DRIVER
        });
    }

    findProfileByAuthUserId(authUserId) {
        if (!mongoose.isValidObjectId(authUserId)) {
            return null;
        }

        return this.driverProfileModel.findOne({ authUserId });
    }

    findEarningRides({ driverId, from, to, limit = 20 } = {}) {
        const filter = {
            'selectedDriver.driverId': driverId,
            status: {
                $in: [
                    RIDE_BOOKING_STATUSES.CONFIRMED,
                    RIDE_BOOKING_STATUSES.CANCELLED
                ]
            }
        };

        if (from || to) {
            filter.createdAt = {
                ...(from ? { $gte: from } : {}),
                ...(to ? { $lte: to } : {})
            };
        }

        return this.rideBookingModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    findRideByIdForDriver(rideId, driverId) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.rideBookingModel.findOne({
            _id: rideId,
            'selectedDriver.driverId': driverId
        });
    }

    findPaymentsForRideIds(rideIds = []) {
        const validRideIds = rideIds.filter((rideId) => mongoose.isValidObjectId(rideId));

        if (!validRideIds.length) {
            return [];
        }

        return this.paymentModel.find({
            rideId: {
                $in: validRideIds
            }
        });
    }
}
