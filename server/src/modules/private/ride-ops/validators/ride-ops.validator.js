import z from 'zod';
import { FARE_VEHICLE_TYPES } from '../../../public/fare/fare.constants.js';
import {
    RIDE_BOOKING_CANCELLATION_REASONS,
    RIDE_BOOKING_RISK_LEVELS,
    RIDE_BOOKING_STATUSES
} from '../../../public/ride-booking/ride-booking.constants.js';
import {
    RIDE_OPS_FILTERS,
    RIDE_OPS_ISSUE_STATUSES,
    RIDE_OPS_PRIORITY_LEVELS
} from '../ride-ops.constants.js';

const rideIdSchema = z.string().trim().min(1).max(80);
const optionalNoteSchema = z.string().trim().min(3).max(500).optional();

const driverSnapshotSchema = z.object({
    driverId: z.string().trim().min(2).max(80),
    fullName: z.string().trim().min(2).max(120),
    rating: z.coerce.number().min(0).max(5),
    vehicleName: z.string().trim().min(2).max(120),
    vehicleNumber: z.string().trim().min(4).max(40),
    vehicleColor: z.string().trim().min(2).max(40),
    etaMinutes: z.coerce.number().int().min(0).max(180),
    distanceKm: z.coerce.number().min(0).max(1000)
}).strict();

const trustSignalsSchema = z.object({
    driverTrustScore: z.coerce.number().min(0).max(100).optional(),
    driverReliabilityScore: z.coerce.number().min(0).max(100).optional(),
    routeFairnessScore: z.coerce.number().min(0).max(100).optional(),
    routeAccuracyScore: z.coerce.number().min(0).max(100).optional(),
    cancellationRiskScore: z.coerce.number().min(0).max(100).optional(),
    cancellationRiskLevel: z.enum(Object.values(RIDE_BOOKING_RISK_LEVELS)).optional(),
    cancellationRatio: z.coerce.number().min(0).optional(),
    detourPercentage: z.coerce.number().min(0).optional(),
    onTimeArrivalScore: z.coerce.number().min(0).max(100).optional(),
    fairPriceScore: z.coerce.number().min(0).max(100).optional()
}).strict();

export const rideOpsRideParamsSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    })
});

export const rideOpsQueueQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(RIDE_OPS_FILTERS)).optional(),
        bookingStatus: z.enum(Object.values(RIDE_BOOKING_STATUSES)).optional(),
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)).optional(),
        driverId: z.string().trim().min(1).max(80).optional(),
        priority: z.enum(Object.values(RIDE_OPS_PRIORITY_LEVELS)).optional(),
        issueStatus: z.enum(Object.values(RIDE_OPS_ISSUE_STATUSES)).optional(),
        q: z.string().trim().min(1).max(80).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    }).strict()
});

export const updateRideOpsStateSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    }),
    body: z.object({
        priority: z.enum(Object.values(RIDE_OPS_PRIORITY_LEVELS)).optional(),
        issueStatus: z.enum(Object.values(RIDE_OPS_ISSUE_STATUSES)).optional(),
        assignedOpsUserId: z.string().trim().min(1).max(80).nullable().optional(),
        note: optionalNoteSchema
    }).strict().refine(
        (body) => ['priority', 'issueStatus', 'assignedOpsUserId', 'note'].some((field) => body[field] !== undefined),
        { message: 'At least one ride ops field is required' }
    )
});

export const reassignRideDriverSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    }),
    body: z.object({
        driver: driverSnapshotSchema,
        trustSignals: trustSignalsSchema.optional(),
        note: optionalNoteSchema
    }).strict()
});

export const confirmRideSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    }),
    body: z.object({
        note: optionalNoteSchema
    }).default({})
});

export const cancelRideSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    }),
    body: z.object({
        reason: z.enum(Object.values(RIDE_BOOKING_CANCELLATION_REASONS)),
        note: z.string().trim().min(3).max(180).optional()
    }).strict()
});
