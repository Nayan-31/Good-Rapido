import mongoose from 'mongoose';
import PublicAuthUser from '../../public/auth/auth.model.js';
import PrivateAuthUser from '../../private/auth/auth.model.js';
import RideBooking from '../../public/ride-booking/ride-booking.model.js';

export default class RideLifecycleDao {
    constructor(
        rideModel = RideBooking,
        publicAuthModel = PublicAuthUser,
        privateAuthModel = PrivateAuthUser
    ) {
        this.rideModel = rideModel;
        this.publicAuthModel = publicAuthModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPublicUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.publicAuthModel.findById(userId);
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }

    findRideById(rideId) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.rideModel.findById(rideId);
    }

    findRideByIdForUser(rideId, authUserId, role) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.rideModel.findOne({ _id: rideId, authUserId, role });
    }

    updateRideById(rideId, payload) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.rideModel.findByIdAndUpdate(
            rideId,
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }

    updateRideTrackingById(rideId, location, { pathLimit = 50 } = {}) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.rideModel.findByIdAndUpdate(
            rideId,
            {
                $set: {
                    'tracking.lastDriverLocation': location,
                    'tracking.updatedAt': location.receivedAt
                },
                $push: {
                    'tracking.path': {
                        $each: [location],
                        $slice: -pathLimit
                    }
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
    }
}
