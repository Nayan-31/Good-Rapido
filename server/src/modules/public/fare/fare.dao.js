import mongoose from 'mongoose';
import FareEstimate from './fare.model.js';

export default class FareDao {
    constructor(model = FareEstimate) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findByIdForUser(estimateId, authUserId, role) {
        if (!mongoose.isValidObjectId(estimateId)) {
            return null;
        }

        return this.model.findOne({ _id: estimateId, authUserId, role });
    }

    lockEstimate(estimateId, authUserId, role, lockedUntil) {
        if (!mongoose.isValidObjectId(estimateId)) {
            return null;
        }

        return this.model.findOneAndUpdate(
            { _id: estimateId, authUserId, role },
            {
                $set: {
                    lock: {
                        isLocked: true,
                        lockedUntil
                    }
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
    }

    findRecentForUser(authUserId, role, { vehicleType, limit = 10 } = {}) {
        const filter = { authUserId, role };

        if (vehicleType) {
            filter.vehicleType = vehicleType;
        }

        return this.model.find(filter).sort({ createdAt: -1 }).limit(limit);
    }
}
