import z from 'zod';
import { FARE_VEHICLE_TYPES } from '../../../public/fare/fare.constants.js';
import {
    ROUTE_ENGINE_DEFAULT_SERVICE_ZONE,
    ROUTE_ENGINE_MAX_WAYPOINTS,
    ROUTE_ENGINE_ROUTE_PREFERENCES
} from '../route-engine.constants.js';

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
    .default(ROUTE_ENGINE_DEFAULT_SERVICE_ZONE);

const dateTimeSchema = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'requestedAt must be a valid date-time'
});

export const planRouteSchema = z.object({
    body: z.object({
        pickup: locationSchema,
        dropoff: locationSchema,
        waypoints: z.array(locationSchema).max(ROUTE_ENGINE_MAX_WAYPOINTS).optional(),
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)),
        routePreference: z.enum(Object.values(ROUTE_ENGINE_ROUTE_PREFERENCES)).default(ROUTE_ENGINE_ROUTE_PREFERENCES.BALANCED),
        serviceZone: serviceZoneSchema,
        requestedAt: dateTimeSchema.optional()
    }).strict().refine(
        (body) => hasDifferentConsecutiveLocations([
            body.pickup,
            ...(body.waypoints || []),
            body.dropoff
        ]),
        { message: 'Pickup, waypoints, and dropoff must not repeat consecutive locations', path: ['dropoff'] }
    )
});

const hasDifferentConsecutiveLocations = (locations) => locations.slice(1).every((location, index) => (
    location.latitude !== locations[index].latitude
    || location.longitude !== locations[index].longitude
));
