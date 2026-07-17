import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import {
    FARE_CONFIDENCE_LEVELS,
    FARE_CURRENCY,
    FARE_SURGE_LEVELS,
    FARE_VEHICLE_TYPES
} from './fare.constants.js';

const geoPointSchema = new mongoose.Schema(
    {
        address: {
            type: String,
            trim: true,
            maxlength: 180
        },
        latitude: {
            type: Number,
            required: true,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            required: true,
            min: -180,
            max: 180
        }
    },
    { _id: false }
);

const fareBreakdownSchema = new mongoose.Schema(
    {
        currency: {
            type: String,
            default: FARE_CURRENCY
        },
        baseFare: {
            type: Number,
            required: true,
            min: 0
        },
        distanceFare: {
            type: Number,
            required: true,
            min: 0
        },
        timeFare: {
            type: Number,
            required: true,
            min: 0
        },
        minFareAdjustment: {
            type: Number,
            default: 0,
            min: 0
        },
        surgeFare: {
            type: Number,
            default: 0,
            min: 0
        },
        platformFee: {
            type: Number,
            required: true,
            min: 0
        },
        taxes: {
            type: Number,
            required: true,
            min: 0
        },
        totalFare: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { _id: false }
);

const surgeSchema = new mongoose.Schema(
    {
        multiplier: {
            type: Number,
            required: true,
            min: 1
        },
        level: {
            type: String,
            enum: Object.values(FARE_SURGE_LEVELS),
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true
        }
    },
    { _id: false }
);

const confidenceSchema = new mongoose.Schema(
    {
        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        level: {
            type: String,
            enum: Object.values(FARE_CONFIDENCE_LEVELS),
            required: true
        },
        factors: {
            type: [String],
            default: []
        }
    },
    { _id: false }
);

const alternativePickupSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true
        },
        pickup: {
            type: geoPointSchema,
            required: true
        },
        walkingDistanceMeters: {
            type: Number,
            required: true,
            min: 0
        },
        estimatedSavings: {
            type: Number,
            required: true,
            min: 0
        },
        estimatedFare: {
            type: Number,
            required: true,
            min: 0
        },
        reason: {
            type: String,
            required: true,
            trim: true
        }
    },
    { _id: false }
);

const fareEstimateSchema = new mongoose.Schema(
    {
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
        pickup: {
            type: geoPointSchema,
            required: true
        },
        dropoff: {
            type: geoPointSchema,
            required: true
        },
        vehicleType: {
            type: String,
            enum: Object.values(FARE_VEHICLE_TYPES),
            required: true,
            index: true
        },
        requestedAt: {
            type: Date,
            required: true
        },
        distanceKm: {
            type: Number,
            required: true,
            min: 0
        },
        durationMinutes: {
            type: Number,
            required: true,
            min: 0
        },
        breakdown: {
            type: fareBreakdownSchema,
            required: true
        },
        surge: {
            type: surgeSchema,
            required: true
        },
        confidence: {
            type: confidenceSchema,
            required: true
        },
        alternativePickups: {
            type: [alternativePickupSchema],
            default: []
        },
        validUntil: {
            type: Date,
            required: true,
            index: true
        },
        lock: {
            isLocked: {
                type: Boolean,
                default: false
            },
            lockedUntil: {
                type: Date
            }
        }
    },
    {
        collection: 'public_fare_estimates',
        timestamps: true,
        versionKey: false
    }
);

fareEstimateSchema.index({ authUserId: 1, role: 1, createdAt: -1 });
fareEstimateSchema.index({ authUserId: 1, role: 1, vehicleType: 1, createdAt: -1 });

const FareEstimate = mongoose.models.FareEstimate || mongoose.model('FareEstimate', fareEstimateSchema);

export default FareEstimate;
