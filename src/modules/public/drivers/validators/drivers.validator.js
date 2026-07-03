import z from 'zod';
import { FARE_VEHICLE_TYPES } from '../../fare/fare.constants.js';
import { RIDE_BOOKING_RISK_LEVELS } from '../../ride-booking/ride-booking.constants.js';
import { DRIVER_SORT_OPTIONS } from '../drivers.constants.js';

const nonEmptyString = z.string().trim().min(1);

export const driversListQuerySchema = z.object({
    query: z.object({
        vehicleType: z.enum(Object.values(FARE_VEHICLE_TYPES)).optional(),
        riskLevel: z.enum(Object.values(RIDE_BOOKING_RISK_LEVELS)).optional(),
        sortBy: z.enum(Object.values(DRIVER_SORT_OPTIONS)).default(DRIVER_SORT_OPTIONS.TRUST_SCORE),
        limit: z.coerce.number().int().min(1).max(30).default(10)
    })
});

export const driverParamsSchema = z.object({
    params: z.object({
        driverId: nonEmptyString
    })
});
