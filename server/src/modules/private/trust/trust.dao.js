import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import TrustProfile from './trust.model.js';

export default class TrustDao {
    constructor(trustProfileModel = TrustProfile, privateAuthModel = PrivateAuthUser) {
        this.trustProfileModel = trustProfileModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }

    findDashboardProfiles({ limit = 50 } = {}) {
        return this.trustProfileModel
            .find({})
            .sort({ riskLevel: -1, updatedAt: -1 })
            .limit(limit);
    }

    findProfiles(query = {}) {
        const filter = buildTrustProfileFilter(query);

        return this.trustProfileModel
            .find(filter)
            .sort({ riskLevel: -1, reviewStatus: 1, updatedAt: -1 })
            .limit(query.limit || 25);
    }

    findById(profileId) {
        if (!mongoose.isValidObjectId(profileId)) {
            return null;
        }

        return this.trustProfileModel.findById(profileId);
    }

    findBySubject(subjectType, subjectId) {
        return this.trustProfileModel.findOne({
            subjectType,
            subjectId
        });
    }

    createProfile(payload) {
        return this.trustProfileModel.create(payload);
    }

    updateProfile(profileId, payload) {
        if (!mongoose.isValidObjectId(profileId)) {
            return null;
        }

        return this.trustProfileModel.findByIdAndUpdate(
            profileId,
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }
}

const buildTrustProfileFilter = (query = {}) => {
    const filter = {};

    if (query.subjectType) {
        filter.subjectType = query.subjectType;
    }

    if (query.riskLevel) {
        filter.riskLevel = query.riskLevel;
    }

    if (query.status) {
        filter.status = query.status;
    }

    if (query.reviewStatus) {
        filter.reviewStatus = query.reviewStatus;
    }

    if (query.assignedReviewerId) {
        filter.assignedReviewerId = query.assignedReviewerId;
    }

    if (query.q) {
        const searchPattern = new RegExp(escapeRegExp(query.q), 'i');

        filter.$or = [
            { trustCode: searchPattern },
            { subjectId: searchPattern },
            { subjectLabel: searchPattern }
        ];
    }

    return filter;
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
