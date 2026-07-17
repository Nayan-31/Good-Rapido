export const ANALYTICS_PERIODS = Object.freeze({
    TODAY: 'today',
    THIS_WEEK: 'this_week',
    THIS_MONTH: 'this_month',
    CUSTOM: 'custom'
});

export const ANALYTICS_GROUP_BY = Object.freeze({
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month'
});

export const ANALYTICS_METRICS = Object.freeze({
    OVERVIEW: 'overview',
    RIDES: 'rides',
    REVENUE: 'revenue',
    DRIVERS: 'drivers',
    TRUST_SAFETY: 'trust_safety'
});

export const ANALYTICS_DEFAULT_LIMIT = 100;
export const ANALYTICS_MAX_LIMIT = 500;
export const ANALYTICS_DEFAULT_FORECAST_DAYS = 7;
export const ANALYTICS_MAX_FORECAST_DAYS = 90;
export const ANALYTICS_DEFAULT_PLATFORM_FEE_RATE = 0.2;
