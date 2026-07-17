import z from 'zod';
import { RIDE_BOOKING_CANCELLATION_REASONS } from '../ride-booking.constants.js';

const nonEmptyString = z.string().trim().min(1);

export const searchRideSchema = z.object({
    body: z.object({
        fareEstimateId: nonEmptyString,
        limit: z.number().int().min(1).max(5).default(3)
    })
});

export const createRideBookingSchema = z.object({
    body: z.object({
        fareEstimateId: nonEmptyString,
        selectedDriverId: z.string().trim().min(1).optional(),
        paymentMethod: z.string().trim().min(2).max(60).optional(),
        riderNote: z.string().trim().max(180).optional()
    })
});

export const rideBookingParamsSchema = z.object({
    params: z.object({
        bookingId: nonEmptyString
    })
});

export const selectRideBookingDriverSchema = z.object({
    params: z.object({
        bookingId: nonEmptyString
    }),
    body: z.object({
        driverId: nonEmptyString
    })
});

export const cancelRideBookingSchema = z.object({
    params: z.object({
        bookingId: nonEmptyString
    }),
    body: z.object({
        reason: z.enum(Object.values(RIDE_BOOKING_CANCELLATION_REASONS)),
        note: z.string().trim().max(180).optional()
    })
});
