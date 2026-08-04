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

    findEarningRides({ driverId, driverIdentifiers = [], driverName, from, to, limit = 20 } = {}) {
        const filter = {
            status: {
                $in: [
                    RIDE_BOOKING_STATUSES.CONFIRMED,
                    RIDE_BOOKING_STATUSES.CANCELLED
                ]
            }
        };
        const driverFilter = buildDriverFilter({ driverId, driverIdentifiers, driverName });

        if (driverFilter) {
            Object.assign(filter, driverFilter);
        }

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

    findRideByIdForDriver(rideId, { driverId, driverIdentifiers = [], driverName } = {}) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }
        const driverFilter = buildDriverFilter({ driverId, driverIdentifiers, driverName });

        return this.rideBookingModel.findOne({
            _id: rideId,
            ...(driverFilter || {})
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

const buildDriverFilter = ({ driverId, driverIdentifiers = [], driverName } = {}) => {
    const driverFilters = [];
    const identifiers = driverIdentifiers.length ? driverIdentifiers : [driverId].filter(Boolean);

    if (identifiers.length) {
        driverFilters.push({
            'selectedDriver.driverId': { $in: identifiers }
        });
    }

    if (driverName) {
        driverFilters.push({
            'selectedDriver.fullName': new RegExp(`^${escapeRegExp(driverName)}$`, 'i')
        });
    }

    if (!driverFilters.length) {
        return null;
    }

    return { $or: driverFilters };
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
