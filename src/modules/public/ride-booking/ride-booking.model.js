import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { FARE_CURRENCY, FARE_VEHICLE_TYPES } from '../fare/fare.constants.js';
import {
    RIDE_BOOKING_CANCELLATION_REASONS,
    RIDE_BOOKING_RISK_LEVELS,
    RIDE_BOOKING_STATUSES
} from './ride-booking.constants.js';

const locationSnapshotSchema = new mongoose.Schema(
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

const fareSnapshotSchema = new mongoose.Schema(
    {
        currency: {
            type: String,
            default: FARE_CURRENCY
        },
        totalFare: {
            type: Number,
            required: true,
            min: 0
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
        surgeMultiplier: {
            type: Number,
            required: true,
            min: 1
        },
        confidenceScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        validUntil: {
            type: Date,
            required: true
        },
        lockedUntil: {
            type: Date
        }
    },
    { _id: false }
);

const driverSnapshotSchema = new mongoose.Schema(
    {
        driverId: {
            type: String,
            required: true,
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        rating: {
            type: Number,
            required: true,
            min: 0,
            max: 5
        },
        vehicleName: {
            type: String,
            required: true,
            trim: true
        },
        vehicleNumber: {
            type: String,
            required: true,
            trim: true
        },
        vehicleColor: {
            type: String,
            required: true,
            trim: true
        },
        etaMinutes: {
            type: Number,
            required: true,
            min: 0
        },
        distanceKm: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { _id: false }
);

const trustSignalsSchema = new mongoose.Schema(
    {
        driverTrustScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        driverReliabilityScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        routeFairnessScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        routeAccuracyScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        cancellationRiskScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        cancellationRiskLevel: {
            type: String,
            enum: Object.values(RIDE_BOOKING_RISK_LEVELS),
            required: true
        },
        cancellationRatio: {
            type: Number,
            required: true,
            min: 0
        },
        detourPercentage: {
            type: Number,
            required: true,
            min: 0
        },
        onTimeArrivalScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        fairPriceScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        }
    },
    { _id: false }
);

const cancellationSchema = new mongoose.Schema(
    {
        reason: {
            type: String,
            enum: Object.values(RIDE_BOOKING_CANCELLATION_REASONS)
        },
        note: {
            type: String,
            trim: true,
            maxlength: 180
        },
        cancelledAt: {
            type: Date
        }
    },
    { _id: false }
);

const rideOpsActionSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60
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
            trim: true,
            maxlength: 40
        },
        createdAt: {
            type: Date,
            required: true
        }
    },
    { _id: false }
);

const rideOpsSchema = new mongoose.Schema(
    {
        priority: {
            type: String,
            enum: ['normal', 'high', 'urgent'],
            default: 'normal',
            index: true
        },
        issueStatus: {
            type: String,
            enum: ['none', 'monitoring', 'escalated', 'resolved'],
            default: 'none',
            index: true
        },
        assignedOpsUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        lastAction: {
            type: String,
            trim: true,
            maxlength: 60
        },
        lastActionNote: {
            type: String,
            trim: true,
            maxlength: 500
        },
        lastActionAt: {
            type: Date
        },
        lastActionBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrivateAuthUser'
        },
        actionLog: {
            type: [rideOpsActionSchema],
            default: []
        }
    },
    { _id: false }
);

const rideBookingSchema = new mongoose.Schema(
    {
        bookingCode: {
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
        fareEstimateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FareEstimate',
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(RIDE_BOOKING_STATUSES),
            default: RIDE_BOOKING_STATUSES.DRIVER_SELECTED,
            index: true
        },
        pickup: {
            type: locationSnapshotSchema,
            required: true
        },
        dropoff: {
            type: locationSnapshotSchema,
            required: true
        },
        vehicleType: {
            type: String,
            enum: Object.values(FARE_VEHICLE_TYPES),
            required: true,
            index: true
        },
        selectedDriver: {
            type: driverSnapshotSchema,
            required: true
        },
        fareSnapshot: {
            type: fareSnapshotSchema,
            required: true
        },
        trustSignals: {
            type: trustSignalsSchema,
            required: true
        },
        paymentMethod: {
            type: String,
            default: 'personal_wallet',
            trim: true,
            maxlength: 60
        },
        riderNote: {
            type: String,
            trim: true,
            maxlength: 180
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true
        },
        confirmedAt: {
            type: Date
        },
        cancellation: {
            type: cancellationSchema,
            default: null
        },
        ops: {
            type: rideOpsSchema,
            default: {}
        }
    },
    {
        collection: 'public_ride_bookings',
        timestamps: true,
        versionKey: false
    }
);

rideBookingSchema.index({ authUserId: 1, role: 1, createdAt: -1 });
rideBookingSchema.index({ authUserId: 1, role: 1, status: 1, createdAt: -1 });
rideBookingSchema.index({ status: 1, createdAt: -1 });
rideBookingSchema.index({ vehicleType: 1, status: 1, createdAt: -1 });
rideBookingSchema.index({ 'selectedDriver.driverId': 1, status: 1, createdAt: -1 });
rideBookingSchema.index({ 'ops.priority': 1, 'ops.issueStatus': 1, updatedAt: -1 });

const RideBooking = mongoose.models.RideBooking || mongoose.model('RideBooking', rideBookingSchema);

export default RideBooking;
