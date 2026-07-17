import z from 'zod';
import {
    ANALYTICS_DEFAULT_FORECAST_DAYS,
    ANALYTICS_DEFAULT_LIMIT,
    ANALYTICS_GROUP_BY,
    ANALYTICS_MAX_FORECAST_DAYS,
    ANALYTICS_MAX_LIMIT,
    ANALYTICS_PERIODS
} from '../analytics.constants.js';

const dateRangeRefinement = (query) => !query.from || !query.to || query.to >= query.from;
const customRangeRefinement = (query) => query.period !== ANALYTICS_PERIODS.CUSTOM || Boolean(query.from && query.to);

const analyticsWindowQuery = {
    period: z.enum(Object.values(ANALYTICS_PERIODS)).default(ANALYTICS_PERIODS.THIS_WEEK),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(ANALYTICS_MAX_LIMIT).default(ANALYTICS_DEFAULT_LIMIT)
};

const withWindowValidation = (schema) => schema.strict().refine(
    dateRangeRefinement,
    { message: 'to must be after from', path: ['to'] }
).refine(
    customRangeRefinement,
    { message: 'from and to are required for custom analytics period', path: ['from'] }
);

export const analyticsOverviewQuerySchema = z.object({
    query: withWindowValidation(z.object({
        ...analyticsWindowQuery
    }))
});

export const analyticsBreakdownQuerySchema = z.object({
    query: withWindowValidation(z.object({
        ...analyticsWindowQuery,
        groupBy: z.enum(Object.values(ANALYTICS_GROUP_BY)).default(ANALYTICS_GROUP_BY.DAY)
    }))
});

export const analyticsDriverQuerySchema = z.object({
    query: withWindowValidation(z.object({
        ...analyticsWindowQuery
    }))
});

export const analyticsForecastSchema = z.object({
    body: z.object({
        baselineRides: z.coerce.number().int().min(0).max(100000),
        averageFare: z.coerce.number().min(0).max(100000),
        growthRate: z.coerce.number().min(-0.9).max(5).default(0),
        platformFeeRate: z.coerce.number().min(0).max(0.9).default(0.2),
        forecastDays: z.coerce.number().int().min(1).max(ANALYTICS_MAX_FORECAST_DAYS).default(ANALYTICS_DEFAULT_FORECAST_DAYS)
    }).strict()
});
