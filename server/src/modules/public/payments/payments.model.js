import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import {
    PAYMENT_CURRENCY,
    PAYMENT_GATEWAY_PROVIDERS,
    PAYMENT_GATEWAY_STATUSES,
    PAYMENT_METHODS,
    PAYMENT_REFUND_REASONS,
    PAYMENT_STATUSES
} from './payments.constants.js';

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
            trim: true
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

const refundSchema = new mongoose.Schema(
    {
        reason: {
            type: String,
            enum: Object.values(PAYMENT_REFUND_REASONS),
            required: true
        },
        note: {
            type: String,
            trim: true,
            maxlength: 180
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        requestedAt: {
            type: Date,
            required: true
        },
        resolvedAt: {
            type: Date
        },
        gatewayProvider: {
            type: String,
            enum: Object.values(PAYMENT_GATEWAY_PROVIDERS)
        },
        gatewayRefundId: {
            type: String,
            trim: true,
            maxlength: 120
        },
        gatewayStatus: {
            type: String,
            enum: Object.values(PAYMENT_GATEWAY_STATUSES)
        },
        gatewayFailureReason: {
            type: String,
            trim: true,
            maxlength: 180
        }
    },
    { _id: false }
);

const gatewaySchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            enum: Object.values(PAYMENT_GATEWAY_PROVIDERS),
            default: PAYMENT_GATEWAY_PROVIDERS.MOCK
        },
        status: {
            type: String,
            enum: Object.values(PAYMENT_GATEWAY_STATUSES),
            default: PAYMENT_GATEWAY_STATUSES.NOT_REQUIRED
        },
        orderId: {
            type: String,
            trim: true,
            maxlength: 120
        },
        paymentIntentId: {
            type: String,
            trim: true,
            maxlength: 120
        },
        paymentId: {
            type: String,
            trim: true,
            maxlength: 120
        },
        checkoutId: {
            type: String,
            trim: true,
            maxlength: 120
        },
        clientSecret: {
            type: String,
            trim: true,
            maxlength: 260
        },
        publicKey: {
            type: String,
            trim: true,
            maxlength: 180
        },
        paymentUrl: {
            type: String,
            trim: true,
            maxlength: 500
        },
        failureReason: {
            type: String,
            trim: true,
            maxlength: 180
        },
        rawStatus: {
            type: String,
            trim: true,
            maxlength: 80
        },
        lastEventAt: {
            type: Date
        }
    },
    { _id: false }
);

const paymentSchema = new mongoose.Schema(
    {
        paymentCode: {
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
        method: {
            type: String,
            enum: Object.values(PAYMENT_METHODS),
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(PAYMENT_STATUSES),
            default: PAYMENT_STATUSES.PENDING,
            index: true
        },
        currency: {
            type: String,
            default: PAYMENT_CURRENCY
        },
        fareAmount: {
            type: Number,
            required: true,
            min: 0
        },
        tipAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        discountAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        walletBalanceBefore: {
            type: Number,
            min: 0
        },
        walletBalanceAfter: {
            type: Number,
            min: 0
        },
        gatewayReference: {
            type: String,
            trim: true,
            index: true
        },
        gateway: {
            type: gatewaySchema,
            default: {}
        },
        idempotencyKey: {
            type: String,
            trim: true,
            maxlength: 80
        },
        capturedAt: {
            type: Date
        },
        refundableUntil: {
            type: Date
        },
        refund: {
            type: refundSchema,
            default: null
        },
        failureReason: {
            type: String,
            trim: true,
            maxlength: 180
        }
    },
    {
        collection: 'public_payments',
        timestamps: true,
        versionKey: false
    }
);

paymentSchema.index({ authUserId: 1, role: 1, createdAt: -1 });
paymentSchema.index({ authUserId: 1, role: 1, rideId: 1, status: 1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default Payment;
