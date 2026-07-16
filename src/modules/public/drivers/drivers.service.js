import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { buildDriverTrustInsights } from '../../core/trust-engine/trust-engine.engine.js';
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
        return buildDriverTrustInsights(driver);
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

const average = (values) => {
    if (!values.length) {
        return 0;
    }

    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};
