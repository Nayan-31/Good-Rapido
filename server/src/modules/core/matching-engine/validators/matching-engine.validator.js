import z from 'zod';
import { FARE_VEHICLE_TYPES } from '../../../public/fare/fare.constants.js';
import {
    MATCHING_ENGINE_DEFAULT_SERVICE_ZONE,
    MATCHING_ENGINE_MAX_LIMIT
} from '../matching-engine.constants.js';

const locationSchema = z.object({
    address: z.string().trim().max(180).optional(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180)
});

const serviceZoneSchema = z.string()
    .trim()
    .min(1)
    .max(80)
    .transform((value) => value.toLowerCase())
    .default(MATCHING_ENGINE_DEFAULT_SERVICE_ZONE);

export const matchDriversSchema = z.object({
    body: z.object({
        pickup: locationSchema,
        dropoff: locationSchema.optional(),
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)),
        serviceZone: serviceZoneSchema,
        limit: z.coerce.number().int().min(1).max(MATCHING_ENGINE_MAX_LIMIT).optional()
    }).strict().refine(
        (body) => !body.dropoff
            || body.pickup.latitude !== body.dropoff.latitude
            || body.pickup.longitude !== body.dropoff.longitude,
        { message: 'Pickup and dropoff must be different locations', path: ['dropoff'] }
    )
});
