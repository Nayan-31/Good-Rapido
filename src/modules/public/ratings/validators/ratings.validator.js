import z from 'zod';
import {
    RATING_DIMENSIONS,
    RATING_MAX_SCORE,
    RATING_MIN_SCORE,
    RATING_SENTIMENTS,
    RATING_TAGS
} from '../ratings.constants.js';

const nonEmptyString = z.string().trim().min(1);
const scoreSchema = z.coerce.number().int().min(RATING_MIN_SCORE).max(RATING_MAX_SCORE);
const tagsSchema = z.array(z.enum(Object.values(RATING_TAGS))).max(6);
const commentSchema = z.string().trim().max(400);
const dimensionsSchema = z.object(
    Object.values(RATING_DIMENSIONS).reduce((shape, key) => ({
        ...shape,
        [key]: scoreSchema.optional()
    }), {})
).strict();

export const ratingHistoryQuerySchema = z.object({
    query: z.object({
        score: scoreSchema.optional(),
        sentiment: z.enum(Object.values(RATING_SENTIMENTS)).optional(),
        limit: z.coerce.number().int().min(1).max(30).default(10)
    })
});

export const ratingParamsSchema = z.object({
    params: z.object({
        ratingId: nonEmptyString
    })
});

export const rideRatingParamsSchema = z.object({
    params: z.object({
        rideId: nonEmptyString
    })
});

export const submitRideRatingSchema = z.object({
    params: z.object({
        rideId: nonEmptyString
    }),
    body: z.object({
        score: scoreSchema,
        tags: tagsSchema.default([]),
        dimensions: dimensionsSchema.optional(),
        comment: commentSchema.optional(),
        isAnonymous: z.boolean().default(false)
    })
});

export const updateRatingSchema = z.object({
    params: z.object({
        ratingId: nonEmptyString
    }),
    body: z.object({
        score: scoreSchema.optional(),
        tags: tagsSchema.optional(),
        dimensions: dimensionsSchema.optional(),
        comment: commentSchema.optional(),
        isAnonymous: z.boolean().optional()
    }).refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one rating field is required' }
    )
});
