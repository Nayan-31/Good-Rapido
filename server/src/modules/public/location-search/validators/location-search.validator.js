import z from 'zod';

const optionalCoordinate = (min, max) => z.preprocess(
    (value) => {
        if (value === '' || value === null || value === undefined) {
            return undefined;
        }

        return value;
    },
    z.coerce.number().min(min).max(max).optional()
);

export const locationSearchQuerySchema = z.object({
    query: z.object({
        query: z.string().trim().min(2).max(120),
        limit: z.coerce.number().int().min(1).max(8).default(5),
        sessionToken: z.string().trim().min(8).max(120).optional(),
        latitude: optionalCoordinate(-90, 90),
        longitude: optionalCoordinate(-180, 180)
    }).refine((payload) => (
        (payload.latitude === undefined && payload.longitude === undefined)
        || (payload.latitude !== undefined && payload.longitude !== undefined)
    ), {
        message: 'latitude and longitude must be provided together'
    })
});

export const locationResolveParamsSchema = z.object({
    params: z.object({
        placeId: z.string().trim().min(2).max(240)
    }),
    query: z.object({
        sessionToken: z.string().trim().min(8).max(120).optional()
    })
});
