import PublicDriverCatalog from './drivers.model.js';
import { DRIVER_SORT_OPTIONS } from './drivers.constants.js';

export default class DriversDao {
    constructor(driverCatalog = PublicDriverCatalog) {
        this.driverCatalog = driverCatalog;
    }

    findAll({ vehicleType, riskLevel, sortBy = DRIVER_SORT_OPTIONS.TRUST_SCORE, limit = 10 } = {}) {
        return this.driverCatalog
            .filter((driver) => matchesVehicleType(driver, vehicleType))
            .filter((driver) => matchesRiskLevel(driver, riskLevel))
            .sort(resolveDriverSorter(sortBy))
            .slice(0, limit);
    }

    findById(driverId) {
        return this.driverCatalog.find((driver) => driver.id === driverId) || null;
    }
}

const matchesVehicleType = (driver, vehicleType) => !vehicleType || driver.vehicleType === vehicleType;

const matchesRiskLevel = (driver, riskLevel) => !riskLevel || driver.cancellationRiskLevel === riskLevel;

const resolveDriverSorter = (sortBy) => {
    if (sortBy === DRIVER_SORT_OPTIONS.ETA) {
        return (first, second) => first.etaMinutes - second.etaMinutes;
    }

    if (sortBy === DRIVER_SORT_OPTIONS.RATING) {
        return (first, second) => second.rating - first.rating || second.trustScore - first.trustScore;
    }

    if (sortBy === DRIVER_SORT_OPTIONS.ROUTE_FAIRNESS) {
        return (first, second) => second.routeFairnessScore - first.routeFairnessScore || second.trustScore - first.trustScore;
    }

    if (sortBy === DRIVER_SORT_OPTIONS.CANCELLATION_RISK) {
        return (first, second) => first.cancellationRiskScore - second.cancellationRiskScore || second.trustScore - first.trustScore;
    }

    return (first, second) => second.trustScore - first.trustScore || first.etaMinutes - second.etaMinutes;
};
