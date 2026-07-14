import mongoose from 'mongoose';
import {
    FARE_CURRENCY,
    FARE_VEHICLE_TYPES
} from '../../public/fare/fare.constants.js';
import {
    PRICING_DEFAULT_SERVICE_ZONE,
    PRICING_DEFAULT_SURGE_RULES,
    PRICING_RULE_STATUSES
} from './pricing.constants.js';

const pricingAmountsSchema = new mongoose.Schema(
    {
        currency: {
            type: String,
            default: FARE_CURRENCY,
            trim: true,
            uppercase: true,
            maxlength: 8
        },
        baseFare: {
            type: Number,
            required: true,
            min: 0
        },
        perKm: {
            type: Number,
            required: true,
            min: 0
        },
        perMinute: {
            type: Number,
            required: true,
            min: 0
        },
        minimumFare: {
            type: Number,
            required: true,
            min: 0
        },
        platformFee: {
            type: Number,
            required: true,
            min: 0
        },
        taxRate: {
            type: Number,
            required: true,
            min: 0,
            max: 1
        },
        averageSpeedKmph: {
            type: Number,
            required: true,
            min: 1,
            max: 200
        }
    },
    { _id: false }
);

const surgeRulesSchema = new mongoose.Schema(
    {
        morningPeakMultiplier: {
            type: Number,
            default: PRICING_DEFAULT_SURGE_RULES.morningPeakMultiplier,
            min: 1,
            max: 5
        },
        eveningPeakMultiplier: {
            type: Number,
            default: PRICING_DEFAULT_SURGE_RULES.eveningPeakMultiplier,
            min: 1,
            max: 5
        },
        lateNightMultiplier: {
            type: Number,
            default: PRICING_DEFAULT_SURGE_RULES.lateNightMultiplier,
            min: 1,
            max: 5
        },
        maxSurgeMultiplier: {
            type: Number,
            default: PRICING_DEFAULT_SURGE_RULES.maxSurgeMultiplier,
            min: 1,
            max: 5
        }
    },
    { _id: false }
);

const pricingRuleSchema = new mongoose.Schema(
    {
        ruleCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true
        },
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500
        },
        vehicleType: {
            type: String,
            enum: Object.values(FARE_VEHICLE_TYPES),
            required: true,
            index: true
        },
        serviceZone: {
            type: String,
            trim: true,
            lowercase: true,
            default: PRICING_DEFAULT_SERVICE_ZONE,
            index: true,
            maxlength: 80
        },
        pricing: {
            type: pricingAmountsSchema,
            required: true
        },
        surgeRules: {
            type: surgeRulesSchema,
            default: {}
        },
        status: {
            type: String,
            enum: Object.values(PRICING_RULE_STATUSES),
            default: PRICING_RULE_STATUSES.DRAFT,
            index: true
        },
        effectiveFrom: {
            type: Date,
            required: true,
            index: true
        },
        effectiveUntil: {
            type: Date,
            index: true
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 500
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        activatedAt: {
            type: Date
        },
        archivedAt: {
            type: Date
        }
    },
    {
        collection: 'private_pricing_rules',
        timestamps: true,
        versionKey: false
    }
);

pricingRuleSchema.index({ vehicleType: 1, serviceZone: 1, status: 1, effectiveFrom: -1 });
pricingRuleSchema.index({ status: 1, updatedAt: -1 });

const PricingRule = mongoose.models.PricingRule || mongoose.model('PricingRule', pricingRuleSchema);

export default PricingRule;
