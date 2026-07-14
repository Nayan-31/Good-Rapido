import mongoose from 'mongoose';
import {
    TRUST_ACTION_TYPES,
    TRUST_PROFILE_STATUSES,
    TRUST_REVIEW_STATUSES,
    TRUST_RISK_LEVELS,
    TRUST_SCORE_DEFAULT,
    TRUST_SUBJECT_TYPES
} from './trust.constants.js';

const scoreSchema = new mongoose.Schema(
    {
        overall: {
            type: Number,
            min: 0,
            max: 100,
            default: TRUST_SCORE_DEFAULT
        },
        safety: {
            type: Number,
            min: 0,
            max: 100,
            default: TRUST_SCORE_DEFAULT
        },
        reliability: {
            type: Number,
            min: 0,
            max: 100,
            default: TRUST_SCORE_DEFAULT
        },
        payment: {
            type: Number,
            min: 0,
            max: 100,
            default: TRUST_SCORE_DEFAULT
        },
        cancellation: {
            type: Number,
            min: 0,
            max: 100,
            default: TRUST_SCORE_DEFAULT
        },
        fraud: {
            type: Number,
            min: 0,
            max: 100,
            default: TRUST_SCORE_DEFAULT
        }
    },
    { _id: false }
);

const metricSchema = new mongoose.Schema(
    {
        completedRides: {
            type: Number,
            min: 0,
            default: 0
        },
        cancelledRides: {
            type: Number,
            min: 0,
            default: 0
        },
        disputeCount: {
            type: Number,
            min: 0,
            default: 0
        },
        incidentCount: {
            type: Number,
            min: 0,
            default: 0
        },
        paymentFailureCount: {
            type: Number,
            min: 0,
            default: 0
        },
        ratingAverage: {
            type: Number,
            min: 0,
            max: 5
        },
        lastRideAt: {
            type: Date
        }
    },
    { _id: false }
);

const restrictionSchema = new mongoose.Schema(
    {
        rideBookingBlocked: {
            type: Boolean,
            default: false
        },
        driverPayoutHold: {
            type: Boolean,
            default: false
        },
        promoBlocked: {
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

const actionLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: Object.values(TRUST_ACTION_TYPES),
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

const trustProfileSchema = new mongoose.Schema(
    {
        trustCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true
        },
        subjectType: {
            type: String,
            enum: Object.values(TRUST_SUBJECT_TYPES),
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
        riskLevel: {
            type: String,
            enum: Object.values(TRUST_RISK_LEVELS),
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(TRUST_PROFILE_STATUSES),
            required: true,
            index: true
        },
        reviewStatus: {
            type: String,
            enum: Object.values(TRUST_REVIEW_STATUSES),
            default: TRUST_REVIEW_STATUSES.OPEN,
            index: true
        },
        scores: {
            type: scoreSchema,
            default: {}
        },
        metrics: {
            type: metricSchema,
            default: {}
        },
        restrictions: {
            type: restrictionSchema,
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
        actionLog: {
            type: [actionLogSchema],
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
        collection: 'private_trust_profiles',
        timestamps: true,
        versionKey: false
    }
);

trustProfileSchema.index({ subjectType: 1, subjectId: 1 }, { unique: true });
trustProfileSchema.index({ riskLevel: 1, reviewStatus: 1, updatedAt: -1 });
trustProfileSchema.index({ status: 1, reviewStatus: 1, updatedAt: -1 });
trustProfileSchema.index({ assignedReviewerId: 1, reviewStatus: 1, updatedAt: -1 });

const TrustProfile = mongoose.models.TrustProfile || mongoose.model('TrustProfile', trustProfileSchema);

export default TrustProfile;
