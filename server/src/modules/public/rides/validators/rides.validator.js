import z from 'zod';
import { RIDE_HISTORY_FILTERS } from '../rides.constants.js';

const nonEmptyString = z.string().trim().min(1);

export const rideParamsSchema = z.object({
    params: z.object({
        rideId: nonEmptyString
    })
});

export const rideHistoryQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(RIDE_HISTORY_FILTERS)).default(RIDE_HISTORY_FILTERS.ALL),
        limit: z.coerce.number().int().min(1).max(30).default(10)
    })
});
