import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import { PRIVATE_AUTH_ROLES } from '../auth/auth.constants.js';
import DriverProfile from '../driver/driver.model.js';
import { DRIVER_DOCUMENT_COLLECTION_STATUSES } from './driver-documents.constants.js';

export default class DriverDocumentsDao {
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

    findReviewQueue({ status = DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED, limit = 25 } = {}) {
        return this.profileModel
            .find({ 'documents.status': status })
            .sort({ 'documents.submittedAt': 1, updatedAt: -1 })
            .limit(limit);
    }

    updateDriverDocumentsByAuthUserId(authUserId, payload) {
        if (!mongoose.isValidObjectId(authUserId)) {
            return null;
        }

        return this.profileModel.findOneAndUpdate(
            { authUserId },
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }

    updateDriverDocumentsByProfileId(profileId, payload) {
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
