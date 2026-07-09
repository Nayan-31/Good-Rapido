import PromoApplication from './promos.model.js';
import { PROMO_APPLICATION_STATUSES } from './promos.constants.js';

export default class PromosDao {
    constructor(model = PromoApplication) {
        this.model = model;
    }

    create(payload) {
        return this.model.create(payload);
    }

    findRecentForUser(authUserId, role, { status, limit = 10 } = {}) {
        const filter = { authUserId, role };

        if (status) {
            filter.status = status;
        }

        return this.model.find(filter).sort({ createdAt: -1 }).limit(limit);
    }

    findAppliedCodeForUser(authUserId, role, promoCode) {
        return this.model.findOne({
            authUserId,
            role,
            promoCode,
            status: PROMO_APPLICATION_STATUSES.APPLIED
        });
    }

    findAppliedForDeviceFingerprintHash(deviceFingerprintHash, promoCode) {
        if (!deviceFingerprintHash) {
            return null;
        }

        return this.model.findOne({
            deviceFingerprintHash,
            promoCode,
            status: PROMO_APPLICATION_STATUSES.APPLIED
        });
    }

    countApplicationsForUserSince(authUserId, role, since) {
        return this.model.countDocuments({
            authUserId,
            role,
            createdAt: { $gte: since }
        });
    }
}
