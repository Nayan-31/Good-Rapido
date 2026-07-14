import mongoose from 'mongoose';
import {
    FRAUD_ACTION_TYPES,
    FRAUD_CASE_SOURCES,
    FRAUD_CASE_STATUSES,
    FRAUD_CASE_TYPES,
    FRAUD_EVIDENCE_TYPES,
    FRAUD_RESOLUTION_DECISIONS,
    FRAUD_SEVERITY_LEVELS,
    FRAUD_SUBJECT_TYPES
} from './fraud.constants.js';

const fraudSignalsSchema = new mongoose.Schema(
    {
        promoAbuseScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        paymentRiskScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        gpsMismatchScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        deviceReuseScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        cancellationAbuseScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        disputePatternScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        velocityScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },
    { _id: false }
);

const fraudEvidenceSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(FRAUD_EVIDENCE_TYPES),
            required: true
        },
        label: {
            type: String,
            trim: true,
            maxlength: 120
        },
        url: {
            type: String,
            trim: true,
            maxlength: 500
        },
        note: {
            type: String,
            trim: true,
            maxlength: 500
        },
        capturedAt: {
            type: Date
        }
    },
    { _id: false }
);

const linkedEntitiesSchema = new mongoose.Schema(
    {
        rideId: {
            type: String,
            trim: true,
            maxlength: 80
        },
        paymentId: {
            type: String,
            trim: true,
            maxlength: 80
        },
        promoCode: {
            type: String,
            trim: true,
            maxlength: 80
        },
        deviceId: {
            type: String,
            trim: true,
            maxlength: 120
        },
        ipAddress: {
            type: String,
            trim: true,
            maxlength: 80
        }
    },
    { _id: false }
);

const fraudActionsSchema = new mongoose.Schema(
    {
        accountBlocked: {
            type: Boolean,
            default: false
        },
        payoutHeld: {
            type: Boolean,
            default: false
        },
        promoDisabled: {
            type: Boolean,
            default: false
        },
        rideBookingBlocked: {
            type: Boolean,
            default: false
        },
        reason: {
            type: String,
            trim: true,
            maxlength: 240
        },
        expiresAt: {
            type: Date
        }
    },
    { _id: false }
);

const fraudResolutionSchema = new mongoose.Schema(
    {
        decision: {
            type: String,
            enum: Object.values(FRAUD_RESOLUTION_DECISIONS)
        },
        note: {
            type: String,
            trim: true,
            maxlength: 500
        },
        resolvedAt: {
            type: Date
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        }
    },
    { _id: false }
);

const fraudActionLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: Object.values(FRAUD_ACTION_TYPES),
            required: true
        },
        note: {
            type: String,
            trim: true,
            maxlength: 500
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        actorRole: {
            type: String,
            trim: true
        },
        createdAt: {
            type: Date,
            required: true
        }
    },
    { _id: false }
);

const fraudCaseSchema = new mongoose.Schema(
    {
        caseCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true
        },
        subjectType: {
            type: String,
            enum: Object.values(FRAUD_SUBJECT_TYPES),
            required: true,
            index: true
        },
        subjectId: {
            type: String,
            required: true,
            trim: true,
            index: true,
            maxlength: 80
        },
        subjectLabel: {
            type: String,
            trim: true,
            maxlength: 120
        },
        caseType: {
            type: String,
            enum: Object.values(FRAUD_CASE_TYPES),
            required: true,
            index: true
        },
        source: {
            type: String,
            enum: Object.values(FRAUD_CASE_SOURCES),
            default: FRAUD_CASE_SOURCES.SYSTEM,
            index: true
        },
        severity: {
            type: String,
            enum: Object.values(FRAUD_SEVERITY_LEVELS),
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(FRAUD_CASE_STATUSES),
            default: FRAUD_CASE_STATUSES.OPEN,
            index: true
        },
        riskScore: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
            index: true
        },
        confidenceScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },
        signals: {
            type: fraudSignalsSchema,
            default: {}
        },
        evidence: {
            type: [fraudEvidenceSchema],
            default: []
        },
        linkedEntities: {
            type: linkedEntitiesSchema,
            default: {}
        },
        actions: {
            type: fraudActionsSchema,
            default: {}
        },
        assignedReviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser',
            index: true
        },
        latestReviewNote: {
            type: String,
            trim: true,
            maxlength: 500
        },
        lastReviewedAt: {
            type: Date
        },
        lastReviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        resolution: {
            type: fraudResolutionSchema,
            default: {}
        },
        actionLog: {
            type: [fraudActionLogSchema],
            default: []
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        }
    },
    {
        collection: 'private_fraud_cases',
        timestamps: true,
        versionKey: false
    }
);

fraudCaseSchema.index({ subjectType: 1, subjectId: 1, status: 1, updatedAt: -1 });
fraudCaseSchema.index({ caseType: 1, severity: 1, status: 1, updatedAt: -1 });
fraudCaseSchema.index({ assignedReviewerId: 1, status: 1, updatedAt: -1 });
fraudCaseSchema.index({ source: 1, status: 1, updatedAt: -1 });

const FraudCase = mongoose.models.FraudCase || mongoose.model('FraudCase', fraudCaseSchema);

export default FraudCase;
