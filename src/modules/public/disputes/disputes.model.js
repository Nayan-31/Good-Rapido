import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import {
    DISPUTE_CURRENCY,
    DISPUTE_EVIDENCE_TYPES,
    DISPUTE_OPEN_STATUSES,
    DISPUTE_PRIORITIES,
    DISPUTE_REASONS,
    DISPUTE_REQUESTED_RESOLUTIONS,
    DISPUTE_RESOLUTION_TYPES,
    DISPUTE_STATUSES,
    DISPUTE_TYPES
} from './disputes.constants.js';

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

const evidenceSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(DISPUTE_EVIDENCE_TYPES),
            required: true
        },
        label: {
            type: String,
            trim: true,
            maxlength: 80
        },
        url: {
            type: String,
            trim: true,
            maxlength: 500
        },
        note: {
            type: String,
            trim: true,
            maxlength: 240
        },
        submittedAt: {
            type: Date,
            required: true
        },
        capturedAt: {
            type: Date
        }
    },
    { _id: false }
);

const timelineSchema = new mongoose.Schema(
    {
        submittedAt: {
            type: Date,
            required: true
        },
        acknowledgedAt: {
            type: Date
        },
        evidenceRequestedAt: {
            type: Date
        },
        resolvedAt: {
            type: Date
        },
        cancelledAt: {
            type: Date
        }
    },
    { _id: false }
);

const resolutionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(DISPUTE_RESOLUTION_TYPES)
        },
        note: {
            type: String,
            trim: true,
            maxlength: 500
        },
        refundAmount: {
            type: Number,
            min: 0
        },
        resolvedAt: {
            type: Date
        }
    },
    { _id: false }
);

const trustSignalsSchema = new mongoose.Schema(
    {
        driverTrustScore: {
            type: Number,
            min: 0,
            max: 100
        },
        routeAccuracyScore: {
            type: Number,
            min: 0,
            max: 100
        },
        fairPriceScore: {
            type: Number,
            min: 0,
            max: 100
        },
        cancellationRiskLevel: {
            type: String,
            trim: true
        }
    },
    { _id: false }
);

const disputeSchema = new mongoose.Schema(
    {
        disputeCode: {
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
        type: {
            type: String,
            enum: Object.values(DISPUTE_TYPES),
            required: true,
            index: true
        },
        reason: {
            type: String,
            enum: Object.values(DISPUTE_REASONS),
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(DISPUTE_STATUSES),
            default: DISPUTE_STATUSES.SUBMITTED,
            index: true
        },
        priority: {
            type: String,
            enum: Object.values(DISPUTE_PRIORITIES),
            required: true,
            index: true
        },
        title: {
            type: String,
            trim: true,
            maxlength: 120
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 800
        },
        requestedResolution: {
            type: String,
            enum: Object.values(DISPUTE_REQUESTED_RESOLUTIONS),
            required: true
        },
        requestedRefundAmount: {
            type: Number,
            min: 0
        },
        currency: {
            type: String,
            default: DISPUTE_CURRENCY
        },
        evidence: {
            type: [evidenceSchema],
            default: []
        },
        timeline: {
            type: timelineSchema,
            required: true
        },
        resolution: {
            type: resolutionSchema,
            default: null
        },
        trustSignals: {
            type: trustSignalsSchema,
            default: null
        },
        latestActivityAt: {
            type: Date,
            required: true,
            index: true
        }
    },
    {
        collection: 'public_disputes',
        timestamps: true,
        versionKey: false
    }
);

disputeSchema.index({ authUserId: 1, role: 1, createdAt: -1 });
disputeSchema.index({ authUserId: 1, role: 1, status: 1, createdAt: -1 });
disputeSchema.index(
    { authUserId: 1, role: 1, rideId: 1, type: 1 },
    {
        unique: true,
        partialFilterExpression: { status: { $in: DISPUTE_OPEN_STATUSES } }
    }
);

const Dispute = mongoose.models.Dispute || mongoose.model('Dispute', disputeSchema);

export default Dispute;
