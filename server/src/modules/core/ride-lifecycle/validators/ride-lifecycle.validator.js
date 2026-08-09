import z from 'zod';
import { RIDE_BOOKING_CANCELLATION_REASONS } from '../../../public/ride-booking/ride-booking.constants.js';
import { RIDE_LIFECYCLE_EVENTS } from '../ride-lifecycle.constants.js';

const rideIdSchema = z.string().trim().min(1).max(80);
const booleanQuerySchema = z.preprocess((value) => {
    if (value === undefined) {
        return false;
    }

    if (value === true || value === 'true' || value === '1') {
        return true;
    }

    if (value === false || value === 'false' || value === '0') {
        return false;
    }

    return value;
}, z.boolean()).default(false);

export const rideLifecycleParamsSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    })
});

export const rideLifecycleStreamSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    }),
    query: z.object({
        once: booleanQuerySchema,
        intervalMs: z.coerce.number().int().min(1000).max(10000).default(2500)
    })
});

export const transitionRideLifecycleSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    }),
    body: z.object({
        event: z.enum(Object.values(RIDE_LIFECYCLE_EVENTS)),
        occurredAt: z.coerce.date().optional(),
        reason: z.enum(Object.values(RIDE_BOOKING_CANCELLATION_REASONS)).optional(),
        note: z.string().trim().min(3).max(500).optional()
    }).strict().refine(
        (body) => body.event !== RIDE_LIFECYCLE_EVENTS.RIDE_CANCELLED || Boolean(body.reason),
        { message: 'Cancellation reason is required when cancelling ride lifecycle', path: ['reason'] }
    )
});

export const updateDriverLocationSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    }),
    body: z.object({
        location: z.object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            accuracyMeters: z.number().min(0).max(10000).nullable().optional(),
            headingDegrees: z.number().min(0).max(360).nullable().optional(),
            speedKmph: z.number().min(0).max(240).nullable().optional(),
            capturedAt: z.coerce.date().optional(),
            source: z.enum(['gps', 'network', 'manual']).default('gps')
        }).strict()
    }).strict()
});
