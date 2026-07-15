import mongoose from 'mongoose';
import PublicAuthUser from '../../public/auth/auth.model.js';
import PrivateAuthUser from '../../private/auth/auth.model.js';
import IdentityVerification from './identity.model.js';

export default class IdentityDao {
    constructor(
        identityModel = IdentityVerification,
        publicAuthModel = PublicAuthUser,
        privateAuthModel = PrivateAuthUser
    ) {
        this.identityModel = identityModel;
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

    findBySubject(subjectScope, subjectRole, subjectId) {
        return this.identityModel.findOne({ subjectScope, subjectRole, subjectId });
    }

    create(payload) {
        return this.identityModel.create(payload);
    }

    updateBySubject(subjectScope, subjectRole, subjectId, payload) {
        return this.identityModel.findOneAndUpdate(
            { subjectScope, subjectRole, subjectId },
            { $set: payload },
            { new: true, runValidators: true }
        );
    }

    findById(identityId) {
        if (!mongoose.isValidObjectId(identityId)) {
            return null;
        }

        return this.identityModel.findById(identityId);
    }

    findReviewQueue({ status, subjectRole, limit = 25 } = {}) {
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (subjectRole) {
            filter.subjectRole = subjectRole;
        }

        return this.identityModel
            .find(filter)
            .sort({ submittedAt: 1, updatedAt: -1 })
            .limit(limit);
    }

    updateById(identityId, payload) {
        if (!mongoose.isValidObjectId(identityId)) {
            return null;
        }

        return this.identityModel.findByIdAndUpdate(
            identityId,
            { $set: payload },
            { new: true, runValidators: true }
        );
    }
}
