import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import { PRIVATE_AUTH_ROLES } from '../auth/auth.constants.js';
import DriverProfile from './driver.model.js';

export default class DriverDao {
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

    createProfile(payload) {
        return this.profileModel.create(payload);
    }

    updateProfile(authUserId, payload) {
        if (!mongoose.isValidObjectId(authUserId)) {
            return null;
        }

        return this.profileModel.findOneAndUpdate(
            { authUserId },
            { $set: payload },
            { new: true, runValidators: true }
        );
    }
}
