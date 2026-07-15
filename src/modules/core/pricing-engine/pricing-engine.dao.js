import mongoose from 'mongoose';
import PublicAuthUser from '../../public/auth/auth.model.js';
import PrivateAuthUser from '../../private/auth/auth.model.js';
import PricingRule from '../../private/pricing/pricing.model.js';
import { PRICING_RULE_STATUSES } from '../../private/pricing/pricing.constants.js';

export default class PricingEngineDao {
    constructor(
        pricingRuleModel = PricingRule,
        publicAuthModel = PublicAuthUser,
        privateAuthModel = PrivateAuthUser
    ) {
        this.pricingRuleModel = pricingRuleModel;
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

    findActivePricingRule({ vehicleType, serviceZone, now = new Date() }) {
        return this.pricingRuleModel
            .findOne({
                vehicleType,
                serviceZone,
                status: PRICING_RULE_STATUSES.ACTIVE,
                effectiveFrom: { $lte: now },
                $or: [
                    { effectiveUntil: null },
                    { effectiveUntil: { $exists: false } },
                    { effectiveUntil: { $gt: now } }
                ]
            })
            .sort({ effectiveFrom: -1, updatedAt: -1 });
    }
}
