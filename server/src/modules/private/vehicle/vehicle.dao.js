import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import { PRIVATE_AUTH_ROLES } from '../auth/auth.constants.js';
import DriverProfile from '../driver/driver.model.js';
import { VEHICLE_STATUSES } from './vehicle.constants.js';

export default class VehicleDao {
    constructor(profileModel = DriverProfile, authModel = PrivateAuthUser) {
        this.profileModel = profileModel;
        this.authModel = authModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.authModel.findById(userId);
    }

    findDriverAuthUserById(authUserId) {
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

        return this.profileModel.findOne({ authUserId });
    }

    findProfileById(profileId) {
        if (!mongoose.isValidObjectId(profileId)) {
            return null;
        }

        return this.profileModel.findById(profileId);
    }

    findReviewQueue({ status = VEHICLE_STATUSES.SUBMITTED, limit = 25 } = {}) {
        return this.profileModel
            .find({ 'vehicles.status': status })
            .sort({ 'vehicles.submittedAt': 1, updatedAt: -1 })
            .limit(limit);
    }

    updateVehiclesByAuthUserId(authUserId, payload) {
        if (!mongoose.isValidObjectId(authUserId)) {
            return null;
        }

        return this.profileModel.findOneAndUpdate(
            { authUserId },
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }

    updateVehiclesByProfileId(profileId, payload) {
        if (!mongoose.isValidObjectId(profileId)) {
            return null;
        }

        return this.profileModel.findByIdAndUpdate(
            profileId,
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }
}
