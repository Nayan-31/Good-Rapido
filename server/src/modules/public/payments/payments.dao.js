import mongoose from 'mongoose';
import Payment from './payments.model.js';
import { PAYMENT_STATUSES } from './payments.constants.js';

export default class PaymentsDao {
    constructor(model = Payment) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findByIdForUser(paymentId, authUserId, role) {
        if (!mongoose.isValidObjectId(paymentId)) {
            return null;
        }

        return this.model.findOne({ _id: paymentId, authUserId, role });
    }

    findHistoryForUser(authUserId, role, { status, limit = 10 } = {}) {
        const filter = { authUserId, role };

        if (status) {
            filter.status = status;
        }

        return this.model.find(filter).sort({ createdAt: -1 }).limit(limit);
    }

    findSuccessfulByRideForUser(rideId, authUserId, role) {
        if (!mongoose.isValidObjectId(rideId)) {
            return null;
        }

        return this.model.findOne({
            rideId,
            authUserId,
            role,
            status: PAYMENT_STATUSES.SUCCEEDED
        });
    }

    requestRefund(paymentId, authUserId, role, refund) {
        if (!mongoose.isValidObjectId(paymentId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: paymentId, authUserId, role },
            {
                $set: {
                    status: PAYMENT_STATUSES.REFUND_REQUESTED,
                    refund
                }
            },
            { new: true, runValidators: true }
        );
    }
}
