import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import Dispute from '../../public/disputes/disputes.model.js';

export default class PrivateDisputesDao {
    constructor(disputeModel = Dispute, privateAuthModel = PrivateAuthUser) {
        this.disputeModel = disputeModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }

    findDashboardDisputes({ limit = 50 } = {}) {
        return this.disputeModel
            .find({})
            .sort({ priority: -1, latestActivityAt: -1, createdAt: -1 })
            .limit(limit);
    }

    findDisputes(query = {}) {
        const filter = buildDisputeFilter(query);

        return this.disputeModel
            .find(filter)
            .sort({ priority: -1, latestActivityAt: -1, createdAt: -1 })
            .limit(query.limit || 25);
    }

    findById(disputeId) {
        if (!mongoose.isValidObjectId(disputeId)) {
            return null;
        }

        return this.disputeModel.findById(disputeId);
    }

    updateDispute(disputeId, payload) {
        if (!mongoose.isValidObjectId(disputeId)) {
            return null;
        }

        return this.disputeModel.findByIdAndUpdate(
            disputeId,
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }
}

const buildDisputeFilter = (query = {}) => {
    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.type) {
        filter.type = query.type;
    }

    if (query.priority) {
        filter.priority = query.priority;
    }

    if (query.assignedOpsUserId) {
        filter['ops.assignedOpsUserId'] = query.assignedOpsUserId;
    }

    if (query.q) {
        const searchPattern = new RegExp(escapeRegExp(query.q), 'i');

        filter.$or = [
            { disputeCode: searchPattern },
            { title: searchPattern },
            { description: searchPattern },
            { 'rideSnapshot.bookingCode': searchPattern },
            { 'rideSnapshot.driver.driverId': searchPattern },
            { 'rideSnapshot.driver.fullName': searchPattern }
        ];
    }

    return filter;
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
