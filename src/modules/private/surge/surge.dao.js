import mongoose from 'mongoose';
import PrivateAuthUser from '../auth/auth.model.js';
import SurgeRule from './surge.model.js';
import {
    SURGE_DEFAULT_SERVICE_ZONE,
    SURGE_RULE_STATUSES
} from './surge.constants.js';

export default class SurgeDao {
    constructor(surgeRuleModel = SurgeRule, privateAuthModel = PrivateAuthUser) {
        this.surgeRuleModel = surgeRuleModel;
        this.privateAuthModel = privateAuthModel;
    }

    findPrivateUserById(userId) {
        if (!mongoose.isValidObjectId(userId)) {
            return null;
        }

        return this.privateAuthModel.findById(userId);
    }

    findDashboardRules({ limit = 50 } = {}) {
        return this.surgeRuleModel
            .find({})
            .sort({ updatedAt: -1, startsAt: -1 })
            .limit(limit);
    }

    findRules(query = {}) {
        const filter = buildSurgeRuleFilter(query);

        return this.surgeRuleModel
            .find(filter)
            .sort({ status: 1, startsAt: -1, updatedAt: -1 })
            .limit(query.limit || 25);
    }

    findById(ruleId) {
        if (!mongoose.isValidObjectId(ruleId)) {
            return null;
        }

        return this.surgeRuleModel.findById(ruleId);
    }

    findActiveRule({ serviceZone = SURGE_DEFAULT_SERVICE_ZONE, vehicleType, now = new Date() } = {}) {
        return this.surgeRuleModel
            .findOne({
                serviceZone,
                vehicleTypes: vehicleType,
                status: SURGE_RULE_STATUSES.ACTIVE,
                startsAt: { $lte: now },
                endsAt: { $gt: now }
            })
            .sort({ currentMultiplier: -1, startsAt: -1 });
    }

    createRule(payload) {
        return this.surgeRuleModel.create(payload);
    }

    updateRule(ruleId, payload) {
        if (!mongoose.isValidObjectId(ruleId)) {
            return null;
        }

        return this.surgeRuleModel.findByIdAndUpdate(
            ruleId,
            { $set: payload },
            { new: true, runValidators: true }
        );
    }
}

const buildSurgeRuleFilter = (query = {}) => {
    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.serviceZone) {
        filter.serviceZone = query.serviceZone;
    }

    if (query.vehicleType) {
        filter.vehicleTypes = query.vehicleType;
    }

    if (query.trigger) {
        filter.trigger = query.trigger;
    }

    return filter;
};
