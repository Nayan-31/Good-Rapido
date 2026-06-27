import z from 'zod';
import { FARE_VEHICLE_TYPES } from '../fare.constants.js';

const optionalString = (max) => z.preprocess(
    (value) => {
        if (typeof value === 'string' && value.trim() === '') {
            return undefined;
        }

        return value;
    },
    z.string().trim().max(max).optional()
);

const locationSchema = z.object({
    address: optionalString(180),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
});

const dateTimeSchema = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'requestedAt must be a valid date-time'
});

export const createFareEstimateSchema = z.object({
    body: z.object({
        pickup: locationSchema,
        dropoff: locationSchema,
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)),
        passengers: z.number().int().min(1).max(6).optional(),
        requestedAt: dateTimeSchema.optional()
    }).refine((payload) => (
        payload.pickup.latitude !== payload.dropoff.latitude
        || payload.pickup.longitude !== payload.dropoff.longitude
    ), {
        message: 'Pickup and dropoff must be different locations'
    })
});

export const fareEstimateParamsSchema = z.object({
    params: z.object({
        estimateId: z.string().trim().min(1)
    })
});

export const fareHistoryQuerySchema = z.object({
    query: z.object({
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)).optional(),
        limit: z.coerce.number().int().min(1).max(20).default(10)
    })
});
