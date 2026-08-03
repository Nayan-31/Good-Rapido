import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import RideBooking from '../../public/ride-booking/ride-booking.model.js';

export default class RideOpsDao {
    constructor(rideModel = RideBooking, privateAuthModel = PrivateAuthUser) {
        this.rideModel = rideModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }

    findById(rideId) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.rideModel.findById(rideId);
    }

    findDashboardRides({ since, limit = 50 } = {}) {
        const filter = {};

        if (since) {
            filter.createdAt = { $gte: since };
        }

        return this.rideModel.find(filter).sort({ updatedAt: -1, createdAt: -1 }).limit(limit);
    }

    findRides(query = {}) {
        const filter = buildRideFilter(query);

        return this.rideModel
            .find(filter)
            .sort({ 'ops.priority': -1, updatedAt: -1, createdAt: -1 })
            .limit(query.lookupLimit || query.limit || 25);
    }

    updateById(rideId, payload) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.rideModel.findByIdAndUpdate(
            rideId,
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }
}

const buildRideFilter = (query = {}) => {
    const filter = {};
    const andFilters = [];

    if (query.bookingStatuses?.length) {
        filter.status = { $in: query.bookingStatuses };
    } else if (query.bookingStatus) {
        filter.status = query.bookingStatus;
    }

    if (query.vehicleType) {
        filter.vehicleType = query.vehicleType;
    }

    if (query.driverId) {
        filter['selectedDriver.driverId'] = query.driverId;
    }

    if (query.driverIdentifiers?.length || query.driverName) {
        const driverFilters = [];

        if (query.driverIdentifiers?.length) {
            driverFilters.push({
                'selectedDriver.driverId': { $in: query.driverIdentifiers }
            });
        }

        if (query.driverName) {
            driverFilters.push({
                'selectedDriver.fullName': new RegExp(`^${escapeRegExp(query.driverName)}$`, 'i')
            });
        }

        if (driverFilters.length) {
            andFilters.push({ $or: driverFilters });
        }
    }

    if (query.priority) {
        filter['ops.priority'] = query.priority;
    }

    if (query.issueStatus) {
        filter['ops.issueStatus'] = query.issueStatus;
    }

    if (query.q) {
        const expression = new RegExp(escapeRegExp(query.q), 'i');

        andFilters.push({ $or: [
            { bookingCode: expression },
            { 'pickup.address': expression },
            { 'dropoff.address': expression },
            { 'selectedDriver.fullName': expression },
            { 'selectedDriver.vehicleNumber': expression }
        ] });
    }

    if (andFilters.length) {
        filter.$and = andFilters;
    }

    return filter;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
