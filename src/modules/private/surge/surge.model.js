import mongoose from 'mongoose';
import { FARE_SURGE_LEVELS, FARE_VEHICLE_TYPES } from '../../public/fare/fare.constants.js';
import {
    SURGE_DECISION_TYPES,
    SURGE_DEFAULT_COOLDOWN_MINUTES,
    SURGE_DEFAULT_MAX_MULTIPLIER,
    SURGE_DEFAULT_SERVICE_ZONE,
    SURGE_MAX_MULTIPLIER,
    SURGE_MIN_MULTIPLIER,
    SURGE_RULE_STATUSES,
    SURGE_TRIGGERS
} from './surge.constants.js';

const surgeSignalSchema = new mongoose.Schema(
    {
        demandScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        supplyScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 100
        },
        cancellationRiskScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        activeDrivers: {
            type: Number,
            min: 0,
            default: 0
        },
        pendingRequests: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    { _id: false }
);

const surgeRuleSchema = new mongoose.Schema(
    {
        surgeCode: {
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
        serviceZone: {
            type: String,
            trim: true,
            lowercase: true,
            default: SURGE_DEFAULT_SERVICE_ZONE,
            index: true,
            maxlength: 80
        },
        vehicleTypes: [{
            type: String,
            enum: Object.values(FARE_VEHICLE_TYPES),
            required: true
        }],
        trigger: {
            type: String,
            enum: Object.values(SURGE_TRIGGERS),
            required: true,
            index: true
        },
        decisionType: {
            type: String,
            enum: Object.values(SURGE_DECISION_TYPES),
            default: SURGE_DECISION_TYPES.MANUAL
        },
        baseMultiplier: {
            type: Number,
            required: true,
            min: SURGE_MIN_MULTIPLIER,
            max: SURGE_MAX_MULTIPLIER
        },
        maxMultiplier: {
            type: Number,
            default: SURGE_DEFAULT_MAX_MULTIPLIER,
            min: SURGE_MIN_MULTIPLIER,
            max: SURGE_MAX_MULTIPLIER
        },
        currentMultiplier: {
            type: Number,
            required: true,
            min: SURGE_MIN_MULTIPLIER,
            max: SURGE_MAX_MULTIPLIER
        },
        level: {
            type: String,
            enum: Object.values(FARE_SURGE_LEVELS),
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(SURGE_RULE_STATUSES),
            default: SURGE_RULE_STATUSES.DRAFT,
            index: true
        },
        startsAt: {
            type: Date,
            required: true,
            index: true
        },
        endsAt: {
            type: Date,
            required: true,
            index: true
        },
        cooldownMinutes: {
            type: Number,
            default: SURGE_DEFAULT_COOLDOWN_MINUTES,
            min: 0,
            max: 240
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 240
        },
        customerMessage: {
            type: String,
            trim: true,
            maxlength: 240
        },
        signals: {
            type: surgeSignalSchema,
            default: {}
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
        pausedAt: {
            type: Date
        },
        endedAt: {
            type: Date
        },
        archivedAt: {
            type: Date
        }
    },
    {
        collection: 'private_surge_rules',
        timestamps: true,
        versionKey: false
    }
);

surgeRuleSchema.index({ serviceZone: 1, status: 1, startsAt: -1 });
surgeRuleSchema.index({ vehicleTypes: 1, status: 1, startsAt: -1 });
surgeRuleSchema.index({ status: 1, level: 1, updatedAt: -1 });

const SurgeRule = mongoose.models.SurgeRule || mongoose.model('SurgeRule', surgeRuleSchema);

export default SurgeRule;
