import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import FraudCase from './fraud.model.js';

export default class FraudDao {
    constructor(fraudCaseModel = FraudCase, privateAuthModel = PrivateAuthUser) {
        this.fraudCaseModel = fraudCaseModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }

    findDashboardCases({ limit = 50 } = {}) {
        return this.fraudCaseModel
            .find({})
            .sort({ riskScore: -1, updatedAt: -1 })
            .limit(limit);
    }

    findCases(query = {}) {
        const filter = buildFraudCaseFilter(query);

        return this.fraudCaseModel
            .find(filter)
            .sort({ status: 1, riskScore: -1, updatedAt: -1 })
            .limit(query.limit || 25);
    }

    findById(caseId) {
        if (!mongoose.isValidObjectId(caseId)) {
            return null;
        }

        return this.fraudCaseModel.findById(caseId);
    }

    createCase(payload) {
        return this.fraudCaseModel.create(payload);
    }

    updateCase(caseId, payload) {
        if (!mongoose.isValidObjectId(caseId)) {
            return null;
        }

        return this.fraudCaseModel.findByIdAndUpdate(
            caseId,
            { $set: payload },
            { new: true, runValidators: true }
        );
    }
}

const buildFraudCaseFilter = (query = {}) => {
    const filter = {};

    if (query.subjectType) {
        filter.subjectType = query.subjectType;
    }

    if (query.caseType) {
        filter.caseType = query.caseType;
    }

    if (query.source) {
        filter.source = query.source;
    }

    if (query.severity) {
        filter.severity = query.severity;
    }

    if (query.status) {
        filter.status = query.status;
    }

    if (query.assignedReviewerId) {
        filter.assignedReviewerId = query.assignedReviewerId;
    }

    if (query.q) {
        const searchPattern = new RegExp(escapeRegExp(query.q), 'i');

        filter.$or = [
            { caseCode: searchPattern },
            { subjectId: searchPattern },
            { subjectLabel: searchPattern },
            { 'linkedEntities.rideId': searchPattern },
            { 'linkedEntities.paymentId': searchPattern },
            { 'linkedEntities.promoCode': searchPattern },
            { 'linkedEntities.deviceId': searchPattern }
        ];
    }

    return filter;
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
