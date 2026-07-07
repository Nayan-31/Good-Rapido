import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import {
    RATING_DIMENSIONS,
    RATING_MAX_SCORE,
    RATING_MIN_SCORE,
    RATING_SENTIMENTS,
    RATING_STATUSES,
    RATING_TAGS
} from './ratings.constants.js';

const locationSnapshotSchema = new mongoose.Schema(
    {
        address: {
            type: String,
            trim: true,
            maxlength: 180
        },
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        }
    },
    { _id: false }
);

const driverSnapshotSchema = new mongoose.Schema(
    {
        driverId: {
            type: String,
            trim: true,
            index: true
        },
        fullName: {
            type: String,
            trim: true
        },
        vehicleName: {
            type: String,
            trim: true
        },
        vehicleNumber: {
            type: String,
            trim: true
        }
    },
    { _id: false }
);

const rideSnapshotSchema = new mongoose.Schema(
    {
        bookingCode: {
            type: String,
            trim: true,
            index: true
        },
        pickup: {
            type: locationSnapshotSchema,
            default: null
        },
        dropoff: {
            type: locationSnapshotSchema,
            default: null
        },
        vehicleType: {
            type: String,
            trim: true
        },
        driver: {
            type: driverSnapshotSchema,
            default: null
        }
    },
    { _id: false }
);

const dimensionsSchema = new mongoose.Schema(
    Object.values(RATING_DIMENSIONS).reduce((schema, key) => ({
        ...schema,
        [key]: {
            type: Number,
            min: RATING_MIN_SCORE,
            max: RATING_MAX_SCORE
        }
    }), {}),
    { _id: false }
);

const ratingSchema = new mongoose.Schema(
    {
        ratingCode: {
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
        rideId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RideBooking',
            required: true,
            index: true
        },
        rideSnapshot: {
            type: rideSnapshotSchema,
            required: true
        },
        score: {
            type: Number,
            required: true,
            min: RATING_MIN_SCORE,
            max: RATING_MAX_SCORE,
            index: true
        },
        sentiment: {
            type: String,
            enum: Object.values(RATING_SENTIMENTS),
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(RATING_STATUSES),
            default: RATING_STATUSES.SUBMITTED,
            index: true
        },
        tags: [{
            type: String,
            enum: Object.values(RATING_TAGS)
        }],
        dimensions: {
            type: dimensionsSchema,
            default: null
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 400
        },
        isAnonymous: {
            type: Boolean,
            default: false
        },
        submittedAt: {
            type: Date,
            required: true,
            index: true
        },
        editableUntil: {
            type: Date,
            required: true
        },
        editCount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        collection: 'public_ratings',
        timestamps: true,
        versionKey: false
    }
);

ratingSchema.index({ authUserId: 1, role: 1, createdAt: -1 });
ratingSchema.index({ authUserId: 1, role: 1, rideId: 1 }, { unique: true });
ratingSchema.index({ 'rideSnapshot.driver.driverId': 1, score: -1, createdAt: -1 });

const Rating = mongoose.models.Rating || mongoose.model('Rating', ratingSchema);

export default Rating;
