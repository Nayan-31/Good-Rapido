import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import { PRIVATE_AUTH_ROLES } from '../auth/auth.constants.js';
import DriverProfile from '../driver/driver.model.js';

export default class DriverAvailabilityDao {
    constructor(profileModel = DriverProfile, authModel = PrivateAuthUser) {
        this.profileModel = profileModel;
        this.authModel = authModel;
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

        return this.profileModel.findOne({ authUserId });
    }

    updateAvailability(authUserId, availability) {
        if (!mongoose.isValidObjectId(authUserId)) {
            return null;
        }

        return this.profileModel.findOneAndUpdate(
            { authUserId },
            { $set: { availability } },
            { new: true, runValidators: true }
        );
    }
}
