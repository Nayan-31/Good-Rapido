import z from 'zod';
import { RIDE_BOOKING_CANCELLATION_REASONS } from '../../../public/ride-booking/ride-booking.constants.js';
import { RIDE_LIFECYCLE_EVENTS } from '../ride-lifecycle.constants.js';

const rideIdSchema = z.string().trim().min(1).max(80);

export const rideLifecycleParamsSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
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
