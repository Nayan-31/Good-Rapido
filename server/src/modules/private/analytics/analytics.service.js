import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    ANALYTICS_DEFAULT_LIMIT,
    ANALYTICS_DEFAULT_PLATFORM_FEE_RATE,
    ANALYTICS_PERIODS
} from './analytics.constants.js';
import {
    toAnalyticsForecast,
    toAnalyticsOptions,
    toAnalyticsOverview,
    toDriverAnalytics,
    toRevenueAnalytics,
    toRideAnalytics,
    toTrustSafetyAnalytics
} from './dto/analytics.dto.js';

export default class AnalyticsService {
    constructor({ analyticsDao, now = () => new Date() }) {
        this.analyticsDao = analyticsDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAnalyticsReadContext(authContext);

        return buildSuccessResponse({
            message: 'Analytics options fetched successfully',
            data: {
                options: toAnalyticsOptions()
            }
        });
    }

    async overview(authContext, query = {}) {
        await this.getAnalyticsUserContext(authContext);
        const window = resolvePeriodWindow(query, this.now());
        const datasets = await this.loadDatasets(window, query.limit || ANALYTICS_DEFAULT_LIMIT);

        return buildSuccessResponse({
            message: 'Analytics overview fetched successfully',
            data: {
                analytics: toAnalyticsOverview({
                    window,
                    ...datasets
                })
            }
        });
    }

    async rides(authContext, query = {}) {
        await this.getAnalyticsUserContext(authContext);
        const window = resolvePeriodWindow(query, this.now());
        const rides = toPlainArray(await this.analyticsDao.findRideBookings({
            ...window,
            limit: query.limit || ANALYTICS_DEFAULT_LIMIT
        }));

        return buildSuccessResponse({
            message: 'Ride analytics fetched successfully',
            data: {
                analytics: toRideAnalytics({
                    window,
                    groupBy: query.groupBy,
                    rides
                })
            }
        });
    }

    async revenue(authContext, query = {}) {
        await this.getAnalyticsUserContext(authContext);
        const window = resolvePeriodWindow(query, this.now());
        const payments = toPlainArray(await this.analyticsDao.findPayments({
            ...window,
            limit: query.limit || ANALYTICS_DEFAULT_LIMIT
        }));

        return buildSuccessResponse({
            message: 'Revenue analytics fetched successfully',
            data: {
                analytics: toRevenueAnalytics({
                    window,
                    groupBy: query.groupBy,
                    payments
                })
            }
        });
    }

    async drivers(authContext, query = {}) {
        await this.getAnalyticsUserContext(authContext);
        const window = resolvePeriodWindow(query, this.now());
        const [drivers, rides] = await Promise.all([
            this.analyticsDao.findDriverProfiles({ limit: query.limit || ANALYTICS_DEFAULT_LIMIT }),
            this.analyticsDao.findRideBookings({
                ...window,
                limit: query.limit || ANALYTICS_DEFAULT_LIMIT
            })
        ]);

        return buildSuccessResponse({
            message: 'Driver analytics fetched successfully',
            data: {
                analytics: toDriverAnalytics({
                    window,
                    drivers: toPlainArray(drivers),
                    rides: toPlainArray(rides)
                })
            }
        });
    }

    async trustSafety(authContext, query = {}) {
        await this.getAnalyticsUserContext(authContext);
        const window = resolvePeriodWindow(query, this.now());
        const [disputes, ratings, trustProfiles, fraudCases] = await Promise.all([
            this.analyticsDao.findDisputes({
                ...window,
                limit: query.limit || ANALYTICS_DEFAULT_LIMIT
            }),
            this.analyticsDao.findRatings({
                ...window,
                limit: query.limit || ANALYTICS_DEFAULT_LIMIT
            }),
            this.analyticsDao.findTrustProfiles({
                ...window,
                limit: query.limit || ANALYTICS_DEFAULT_LIMIT
            }),
            this.analyticsDao.findFraudCases({
                ...window,
                limit: query.limit || ANALYTICS_DEFAULT_LIMIT
            })
        ]);

        return buildSuccessResponse({
            message: 'Trust and safety analytics fetched successfully',
            data: {
                analytics: toTrustSafetyAnalytics({
                    window,
                    disputes: toPlainArray(disputes),
                    ratings: toPlainArray(ratings),
                    trustProfiles: toPlainArray(trustProfiles),
                    fraudCases: toPlainArray(fraudCases)
                })
            }
        });
    }

    async forecast(authContext, payload = {}) {
        await this.getAnalyticsUserContext(authContext);
        const forecast = buildForecast(payload);

        return buildSuccessResponse({
            message: 'Analytics forecast completed successfully',
            data: {
                analytics: toAnalyticsForecast({
                    input: {
                        baselineRides: payload.baselineRides,
                        averageFare: payload.averageFare,
                        growthRate: payload.growthRate || 0,
                        platformFeeRate: payload.platformFeeRate ?? ANALYTICS_DEFAULT_PLATFORM_FEE_RATE,
                        forecastDays: payload.forecastDays
                    },
                    forecast
                })
            }
        });
    }

    async loadDatasets(window, limit) {
        const [
            rides,
            payments,
            disputes,
            ratings,
            drivers,
            trustProfiles,
            fraudCases
        ] = await Promise.all([
            this.analyticsDao.findRideBookings({ ...window, limit }),
            this.analyticsDao.findPayments({ ...window, limit }),
            this.analyticsDao.findDisputes({ ...window, limit }),
            this.analyticsDao.findRatings({ ...window, limit }),
            this.analyticsDao.findDriverProfiles({ limit }),
            this.analyticsDao.findTrustProfiles({ ...window, limit }),
            this.analyticsDao.findFraudCases({ ...window, limit })
        ]);

        return {
            rides: toPlainArray(rides),
            payments: toPlainArray(payments),
            disputes: toPlainArray(disputes),
            ratings: toPlainArray(ratings),
            drivers: toPlainArray(drivers),
            trustProfiles: toPlainArray(trustProfiles),
            fraudCases: toPlainArray(fraudCases)
        };
    }

    async getAnalyticsUserContext(authContext) {
        this.assertAnalyticsReadContext(authContext);
        const privateUser = toPlainObject(await this.analyticsDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private user account not found');
        }

        if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Private user account is ${privateUser.accountStatus}`);
        }

        return privateUser;
    }

    assertAnalyticsReadContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Analytics private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.ANALYTICS_READ)) {
            throw AppError.forbidden('Analytics read permission is required');
        }

        return authContext;
    }
}

const resolvePeriodWindow = (query = {}, now = new Date()) => {
    const period = query.period || ANALYTICS_PERIODS.THIS_WEEK;
    const to = query.to || now;
    let from;

    if (period === ANALYTICS_PERIODS.CUSTOM) {
        from = query.from;
    } else if (period === ANALYTICS_PERIODS.TODAY) {
        from = startOfDay(now);
    } else if (period === ANALYTICS_PERIODS.THIS_MONTH) {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        from = startOfWeek(now);
    }

    return {
        period,
        from,
        to
    };
};

const buildForecast = ({
    baselineRides,
    averageFare,
    growthRate = 0,
    platformFeeRate = ANALYTICS_DEFAULT_PLATFORM_FEE_RATE,
    forecastDays = 7
} = {}) => Array.from({ length: forecastDays }, (_item, index) => {
    const dayNumber = index + 1;
    const rides = Math.max(0, Math.round(baselineRides * ((1 + growthRate) ** index)));
    const grossRevenue = roundMoney(rides * averageFare);
    const platformRevenue = roundMoney(grossRevenue * platformFeeRate);

    return {
        day: dayNumber,
        rides,
        grossRevenue,
        platformRevenue,
        driverPayout: roundMoney(grossRevenue - platformRevenue)
    };
});

const startOfDay = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    return start;
};

const startOfWeek = (date) => {
    const start = startOfDay(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    start.setDate(start.getDate() + diff);

    return start;
};

const roundMoney = (value) => Number(value.toFixed(2));

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));
