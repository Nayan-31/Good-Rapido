import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import PricingRule from './pricing.model.js';
import {
    PRICING_DEFAULT_SERVICE_ZONE,
    PRICING_RULE_STATUSES
} from './pricing.constants.js';

export default class PricingDao {
    constructor(pricingRuleModel = PricingRule, privateAuthModel = PrivateAuthUser) {
        this.pricingRuleModel = pricingRuleModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }

    findDashboardRules({ limit = 50 } = {}) {
        return this.pricingRuleModel
            .find({})
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(limit);
    }

    findRules(query = {}) {
        const filter = buildPricingRuleFilter(query);

        return this.pricingRuleModel
            .find(filter)
            .sort({ status: 1, effectiveFrom: -1, updatedAt: -1 })
            .limit(query.limit || 25);
    }

    findById(ruleId) {
        if (!mongoose.isValidObjectId(ruleId)) {
            return null;
        }

        return this.pricingRuleModel.findById(ruleId);
    }

    findActiveRule({ vehicleType, serviceZone = PRICING_DEFAULT_SERVICE_ZONE, now = new Date() } = {}) {
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

    createRule(payload) {
        return this.pricingRuleModel.create(payload);
    }

    updateRule(ruleId, payload) {
        if (!mongoose.isValidObjectId(ruleId)) {
            return null;
        }

        return this.pricingRuleModel.findByIdAndUpdate(
            ruleId,
            { $set: payload },
            { returnDocument: 'after', runValidators: true }
        );
    }

    archiveActiveRules({ vehicleType, serviceZone, exceptRuleId, archivedAt, updatedBy }) {
        const filter = {
            vehicleType,
            serviceZone,
            status: PRICING_RULE_STATUSES.ACTIVE
        };

        if (mongoose.isValidObjectId(exceptRuleId)) {
            filter._id = { $ne: exceptRuleId };
        }

        return this.pricingRuleModel.updateMany(filter, {
            $set: {
                status: PRICING_RULE_STATUSES.ARCHIVED,
                archivedAt,
                updatedBy
            }
        });
    }
}

const buildPricingRuleFilter = (query = {}) => {
    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.vehicleType) {
        filter.vehicleType = query.vehicleType;
    }

    if (query.serviceZone) {
        filter.serviceZone = query.serviceZone;
    }

    return filter;
};
