import z from 'zod';
import { FARE_VEHICLE_TYPES } from '../../../public/fare/fare.constants.js';
import { PRICING_ENGINE_DEFAULT_SERVICE_ZONE } from '../pricing-engine.constants.js';

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
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180)
});

const requestedAtSchema = z.coerce.date().optional();

const serviceZoneSchema = z.string()
    .trim()
    .min(1)
    .max(80)
    .transform((value) => value.toLowerCase())
    .default(PRICING_ENGINE_DEFAULT_SERVICE_ZONE);

const differentLocationsRefinement = (payload) => (
    payload.pickup.latitude !== payload.dropoff.latitude
    || payload.pickup.longitude !== payload.dropoff.longitude
);

export const quotePricingEngineSchema = z.object({
    body: z.object({
        pickup: locationSchema,
        dropoff: locationSchema,
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)),
        serviceZone: serviceZoneSchema,
        requestedAt: requestedAtSchema
    }).strict().refine(
        differentLocationsRefinement,
        { message: 'Pickup and dropoff must be different locations' }
    )
});

export const comparePricingEngineSchema = z.object({
    body: z.object({
        pickup: locationSchema,
        dropoff: locationSchema,
        vehicleTypes: z.array(z.enum(Object.values(FARE_VEHICLE_TYPES))).min(1).max(4).optional(),
        serviceZone: serviceZoneSchema,
        requestedAt: requestedAtSchema
    }).strict().refine(
        differentLocationsRefinement,
        { message: 'Pickup and dropoff must be different locations' }
    ).refine(
        (body) => !body.vehicleTypes || new Set(body.vehicleTypes).size === body.vehicleTypes.length,
        { message: 'Vehicle types must be unique', path: ['vehicleTypes'] }
    )
});
