import z from 'zod';
import {
    EARNINGS_DEFAULT_LIST_LIMIT,
    EARNINGS_MAX_LIST_LIMIT,
    EARNINGS_PERIODS,
    EARNINGS_STATEMENT_PERIODS,
    EARNINGS_STATUSES
} from '../earnings.constants.js';

const rideIdSchema = z.string().trim().min(1).max(80);
const dateRangeRefinement = (query) => !query.from || !query.to || query.to >= query.from;
const customRangeRefinement = (query) => query.period !== EARNINGS_PERIODS.CUSTOM || Boolean(query.from && query.to);

const earningsWindowQuery = {
    period: z.enum(Object.values(EARNINGS_PERIODS)).default(EARNINGS_PERIODS.THIS_WEEK),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional()
};

export const earningsSummaryQuerySchema = z.object({
    query: z.object({
        ...earningsWindowQuery
    }).strict().refine(
        dateRangeRefinement,
        { message: 'to must be after from', path: ['to'] }
    ).refine(
        customRangeRefinement,
        { message: 'from and to are required for custom earnings period', path: ['from'] }
    )
});

export const earningsRideQuerySchema = z.object({
    query: z.object({
        ...earningsWindowQuery,
        status: z.enum(Object.values(EARNINGS_STATUSES)).optional(),
        limit: z.coerce.number().int().min(1).max(EARNINGS_MAX_LIST_LIMIT).default(EARNINGS_DEFAULT_LIST_LIMIT)
    }).strict().refine(
        dateRangeRefinement,
        { message: 'to must be after from', path: ['to'] }
    ).refine(
        customRangeRefinement,
        { message: 'from and to are required for custom earnings period', path: ['from'] }
    )
});

export const earningsRideParamsSchema = z.object({
    params: z.object({
        rideId: rideIdSchema
    })
});

export const earningsStatementQuerySchema = z.object({
    query: z.object({
        ...earningsWindowQuery,
        groupBy: z.enum(Object.values(EARNINGS_STATEMENT_PERIODS)).default(EARNINGS_STATEMENT_PERIODS.WEEKLY),
        limit: z.coerce.number().int().min(1).max(EARNINGS_MAX_LIST_LIMIT).default(EARNINGS_DEFAULT_LIST_LIMIT)
    }).strict().refine(
        dateRangeRefinement,
        { message: 'to must be after from', path: ['to'] }
    ).refine(
        customRangeRefinement,
        { message: 'from and to are required for custom earnings period', path: ['from'] }
    )
});

export const earningsSimulationSchema = z.object({
    body: z.object({
        fareAmount: z.coerce.number().min(0).max(100000),
        tipAmount: z.coerce.number().min(0).max(100000).default(0),
        surgeMultiplier: z.coerce.number().min(1).max(5).default(1),
        platformFeeRate: z.coerce.number().min(0).max(0.9).optional(),
        incentiveAmount: z.coerce.number().min(0).max(100000).optional(),
        deductionAmount: z.coerce.number().min(0).max(100000).default(0),
        status: z.enum(Object.values(EARNINGS_STATUSES)).optional()
    }).strict()
});
