import z from 'zod';
import {
    DRIVER_AVAILABILITY_STATUSES,
    DRIVER_LOCATION_SOURCES,
    DRIVER_MAX_ACTIVE_SERVICE_ZONES
} from '../driver-availability.constants.js';

const activeServiceZonesSchema = z.array(
    z.string().trim().min(1).max(80)
).min(1).max(DRIVER_MAX_ACTIVE_SERVICE_ZONES);

const locationSchema = z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    accuracyMeters: z.coerce.number().min(0).max(5000).optional(),
    headingDegrees: z.coerce.number().min(0).max(359).optional(),
    speedKmph: z.coerce.number().min(0).max(200).optional(),
    addressLabel: z.string().trim().max(160).optional(),
    source: z.enum(Object.values(DRIVER_LOCATION_SOURCES)).optional(),
    capturedAt: z.coerce.date().optional()
}).strict();

export const updateDriverAvailabilityStatusSchema = z.object({
    body: z.object({
        status: z.enum(Object.values(DRIVER_AVAILABILITY_STATUSES)),
        currentLocation: locationSchema.optional(),
        activeServiceZones: activeServiceZonesSchema.optional(),
        statusReason: z.string().trim().max(240).optional()
    }).strict()
});

export const updateDriverAvailabilityLocationSchema = z.object({
    body: z.object({
        currentLocation: locationSchema,
        activeServiceZones: activeServiceZonesSchema.optional()
    }).strict()
});

export const updateDriverAvailabilityZonesSchema = z.object({
    body: z.object({
        activeServiceZones: activeServiceZonesSchema
    }).strict()
});
