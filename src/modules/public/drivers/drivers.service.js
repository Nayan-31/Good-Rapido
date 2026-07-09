import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { RIDE_BOOKING_RISK_LEVELS } from '../ride-booking/ride-booking.constants.js';
import {
    DRIVER_CANCELLATION_RISK_MESSAGES,
    DRIVER_ROUTE_FAIRNESS_LEVELS,
    DRIVER_TRUST_LEVELS
} from './drivers.constants.js';
import {
    toPublicDriverCancellationRisk,
    toPublicDriverProfile,
    toPublicDriverRouteFairness,
    toPublicDriverSummary,
    toPublicDriverTrustReport
} from './dto/drivers.dto.js';

export default class DriversService {
    constructor({ driversDao }) {
        this.driversDao = driversDao;
    }

    async list(authContext, query = {}) {
        this.assertAuthContext(authContext);
        const drivers = await this.driversDao.findAll(query);

        return buildSuccessResponse({
            message: 'Drivers fetched successfully',
            data: {
                drivers: drivers.map((driver) => toPublicDriverSummary(driver, this.buildDriverInsights(driver))),
                summary: this.buildListSummary(drivers, query)
            }
        });
    }

    async getProfile(authContext, driverId) {
        const driver = await this.findVisibleDriver(authContext, driverId);

        return buildSuccessResponse({
            message: 'Driver profile fetched successfully',
            data: {
                driver: toPublicDriverProfile(driver, this.buildDriverInsights(driver))
            }
        });
    }

    async getTrustReport(authContext, driverId) {
        const driver = await this.findVisibleDriver(authContext, driverId);

        return buildSuccessResponse({
            message: 'Driver trust report fetched successfully',
            data: {
                trust: toPublicDriverTrustReport(driver, this.buildDriverInsights(driver))
            }
        });
    }

    async getRouteFairness(authContext, driverId) {
        const driver = await this.findVisibleDriver(authContext, driverId);

        return buildSuccessResponse({
            message: 'Driver route fairness fetched successfully',
            data: {
                routeFairness: toPublicDriverRouteFairness(driver, this.buildDriverInsights(driver))
            }
        });
    }

    async getCancellationRisk(authContext, driverId) {
        const driver = await this.findVisibleDriver(authContext, driverId);

        return buildSuccessResponse({
            message: 'Driver cancellation risk fetched successfully',
            data: {
                cancellationRisk: toPublicDriverCancellationRisk(driver, this.buildDriverInsights(driver))
            }
        });
    }

    async findVisibleDriver(authContext, driverId) {
        this.assertAuthContext(authContext);
        const driver = await this.driversDao.findById(driverId);

        if (!driver) {
            throw AppError.notFound('Driver not found');
        }

        return driver;
    }

    buildDriverInsights(driver) {
        const trustLevel = resolveTrustLevel(driver.trustScore);
        const routeFairnessLevel = resolveRouteFairnessLevel(driver.routeFairnessScore);
        const routeAccuracyScore = calculateRouteAccuracyScore(driver);
        const cancellationRiskMessage = DRIVER_CANCELLATION_RISK_MESSAGES[driver.cancellationRiskLevel]
            || DRIVER_CANCELLATION_RISK_MESSAGES.high;

        return {
            trustLevel,
            routeFairnessLevel,
            routeAccuracyScore,
            trustMessage: resolveTrustMessage(trustLevel),
            routeFairnessMessage: resolveRouteFairnessMessage(routeFairnessLevel),
            cancellationRiskMessage,
            cancellationRiskGuidance: resolveCancellationRiskGuidance(driver.cancellationRiskLevel),
            transparencyBadges: buildTransparencyBadges(driver, {
                trustLevel,
                routeFairnessLevel
            })
        };
    }

    buildListSummary(drivers, query) {
        const bestDriver = drivers[0] || null;

        return {
            resultCount: drivers.length,
            filters: {
                vehicleType: query.vehicleType || null,
                riskLevel: query.riskLevel || null
            },
            sortBy: query.sortBy || null,
            bestDriverId: bestDriver?.id || null,
            averageTrustScore: average(drivers.map((driver) => driver.trustScore)),
            lowestCancellationRiskScore: drivers.length
                ? Math.min(...drivers.map((driver) => driver.cancellationRiskScore))
                : 0,
            message: drivers.length
                ? 'Drivers are ranked with trust, route fairness, arrival reliability, and cancellation behavior visible'
                : 'No drivers matched the selected transparency filters'
        };
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const resolveTrustLevel = (score) => {
    if (score >= 95) {
        return DRIVER_TRUST_LEVELS.EXCELLENT;
    }

    if (score >= 90) {
        return DRIVER_TRUST_LEVELS.HIGH;
    }

    if (score >= 80) {
        return DRIVER_TRUST_LEVELS.FAIR;
    }

    return DRIVER_TRUST_LEVELS.NEEDS_REVIEW;
};

const resolveRouteFairnessLevel = (score) => {
    if (score >= 95) {
        return DRIVER_ROUTE_FAIRNESS_LEVELS.EXCELLENT;
    }

    if (score >= 90) {
        return DRIVER_ROUTE_FAIRNESS_LEVELS.STABLE;
    }

    return DRIVER_ROUTE_FAIRNESS_LEVELS.WATCH;
};

const calculateRouteAccuracyScore = (driver) => Math.min(
    99,
    Math.round((driver.routeFairnessScore + driver.onTimeArrivalScore) / 2)
);

const resolveTrustMessage = (trustLevel) => {
    if (trustLevel === DRIVER_TRUST_LEVELS.EXCELLENT) {
        return 'Excellent trust profile across reliability, route fairness, and cancellation behavior';
    }

    if (trustLevel === DRIVER_TRUST_LEVELS.HIGH) {
        return 'Strong trust profile with consistently reliable ride behavior';
    }

    if (trustLevel === DRIVER_TRUST_LEVELS.FAIR) {
        return 'Fair trust profile with a few behavior signals worth reviewing';
    }

    return 'Trust profile needs review before selecting this driver';
};

const resolveRouteFairnessMessage = (routeFairnessLevel) => {
    if (routeFairnessLevel === DRIVER_ROUTE_FAIRNESS_LEVELS.EXCELLENT) {
        return 'Routes are usually close to the expected path with low detours';
    }

    if (routeFairnessLevel === DRIVER_ROUTE_FAIRNESS_LEVELS.STABLE) {
        return 'Routes are generally fair with minor detour variance';
    }

    return 'Review route and detour behavior before booking';
};

const resolveCancellationRiskGuidance = (riskLevel) => {
    if (riskLevel === RIDE_BOOKING_RISK_LEVELS.LOW) {
        return 'Good match when ride certainty matters';
    }

    if (riskLevel === RIDE_BOOKING_RISK_LEVELS.MEDIUM) {
        return 'Consider backup options if timing is critical';
    }

    return 'Use caution for time-sensitive rides';
};

const buildTransparencyBadges = (driver, insights) => {
    const badges = [];

    if (insights.trustLevel === DRIVER_TRUST_LEVELS.EXCELLENT) {
        badges.push('Excellent trust score');
    }

    if (insights.routeFairnessLevel === DRIVER_ROUTE_FAIRNESS_LEVELS.EXCELLENT) {
        badges.push('Low detour history');
    }

    if (driver.cancellationRiskLevel === RIDE_BOOKING_RISK_LEVELS.LOW) {
        badges.push('Low cancellation risk');
    }

    if (driver.onTimeArrivalScore >= 95) {
        badges.push('Strong arrival reliability');
    }

    return badges;
};

const average = (values) => {
    if (!values.length) {
        return 0;
    }

    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};
