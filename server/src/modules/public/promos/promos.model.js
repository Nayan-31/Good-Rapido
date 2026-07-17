import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import {
    PROMO_APPLICATION_STATUSES,
    PROMO_CURRENCY,
    PROMO_DISCOUNT_TYPES
} from './promos.constants.js';

const abuseSignalSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },
        level: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180
        }
    },
    { _id: false }
);

const promoEligibilitySnapshotSchema = new mongoose.Schema(
    {
        rideCount: {
            type: Number,
            default: 0,
            min: 0
        },
        discountType: {
            type: String,
            enum: Object.values(PROMO_DISCOUNT_TYPES),
            required: true
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0
        },
        maxDiscount: {
            type: Number,
            min: 0
        },
        minimumFare: {
            type: Number,
            required: true,
            min: 0
        },
        ineligibilityReasons: {
            type: [String],
            default: []
        },
        abuseSignals: {
            type: [abuseSignalSchema],
            default: []
        }
    },
    { _id: false }
);

const promoApplicationSchema = new mongoose.Schema(
    {
        applicationCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },
        authUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AuthUser',
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: Object.values(AUTH_ROLES),
            required: true,
            index: true
        },
        promoCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },
        rideId: {
            type: String,
            trim: true,
            index: true
        },
        referralCode: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: 40
        },
        deviceFingerprintHash: {
            type: String,
            trim: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(PROMO_APPLICATION_STATUSES),
            default: PROMO_APPLICATION_STATUSES.APPLIED,
            index: true
        },
        currency: {
            type: String,
            default: PROMO_CURRENCY
        },
        fareAmount: {
            type: Number,
            required: true,
            min: 0
        },
        discountAmount: {
            type: Number,
            required: true,
            min: 0
        },
        finalAmount: {
            type: Number,
            required: true,
            min: 0
        },
        eligibilitySnapshot: {
            type: promoEligibilitySnapshotSchema,
            required: true
        },
        appliedAt: {
            type: Date,
            required: true,
            index: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true
        }
    },
    {
        collection: 'public_promo_applications',
        timestamps: true,
        versionKey: false
    }
);

promoApplicationSchema.index({ authUserId: 1, role: 1, createdAt: -1 });
promoApplicationSchema.index({ authUserId: 1, role: 1, promoCode: 1, status: 1 });
promoApplicationSchema.index({ deviceFingerprintHash: 1, promoCode: 1, status: 1 });

const PromoApplication = mongoose.models.PromoApplication
    || mongoose.model('PromoApplication', promoApplicationSchema);

export default PromoApplication;
