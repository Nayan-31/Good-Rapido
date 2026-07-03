export const toPublicDriverSummary = (driver, insights = {}) => ({
    driverId: driver.id || driver.driverId,
    fullName: driver.fullName,
    rating: numberOrZero(driver.rating),
    vehicle: toPublicVehicle(driver),
    availability: {
        etaMinutes: numberOrZero(driver.etaMinutes),
        distanceKm: numberOrZero(driver.distanceKm)
    },
    fareTransparency: {
        averageFarePerKm: numberOrZero(driver.averageFarePerKm),
        completedRides: numberOrZero(driver.completedRides)
    },
    trustScore: numberOrZero(driver.trustScore),
    trustLevel: insights.trustLevel || null,
    routeFairnessScore: numberOrZero(driver.routeFairnessScore),
    cancellationRiskScore: numberOrZero(driver.cancellationRiskScore),
    cancellationRiskLevel: driver.cancellationRiskLevel || null
});

export const toPublicDriverProfile = (driver, insights = {}) => ({
    ...toPublicDriverSummary(driver, insights),
    trust: toPublicTrust(driver, insights),
    routeFairness: toPublicRouteFairness(driver, insights),
    cancellationRisk: toPublicCancellationRisk(driver, insights),
    transparencyBadges: insights.transparencyBadges || []
});

export const toPublicDriverTrustReport = (driver, insights = {}) => ({
    driver: toPublicDriverIdentity(driver),
    trustScore: numberOrZero(driver.trustScore),
    trustLevel: insights.trustLevel || null,
    message: insights.trustMessage || null,
    metrics: [
        {
            code: 'reliability',
            label: 'Driver reliability',
            score: numberOrZero(driver.reliabilityScore)
        },
        {
            code: 'route_fairness',
            label: 'Route fairness',
            score: numberOrZero(driver.routeFairnessScore)
        },
        {
            code: 'on_time_arrival',
            label: 'On-time arrival',
            score: numberOrZero(driver.onTimeArrivalScore)
        },
        {
            code: 'cancellation_behavior',
            label: 'Cancellation behavior',
            score: Math.max(0, 100 - numberOrZero(driver.cancellationRiskScore))
        }
    ],
    completedRides: numberOrZero(driver.completedRides)
});

export const toPublicDriverRouteFairness = (driver, insights = {}) => ({
    driver: toPublicDriverIdentity(driver),
    score: numberOrZero(driver.routeFairnessScore),
    level: insights.routeFairnessLevel || null,
    routeAccuracyScore: numberOrZero(insights.routeAccuracyScore),
    detourPercentage: numberOrZero(driver.detourPercentage),
    onTimeArrivalScore: numberOrZero(driver.onTimeArrivalScore),
    message: insights.routeFairnessMessage || null
});

export const toPublicDriverCancellationRisk = (driver, insights = {}) => ({
    driver: toPublicDriverIdentity(driver),
    score: numberOrZero(driver.cancellationRiskScore),
    level: driver.cancellationRiskLevel || null,
    cancellationRatio: numberOrZero(driver.cancellationRatio),
    message: insights.cancellationRiskMessage || null,
    riderGuidance: insights.cancellationRiskGuidance || null
});

const toPublicTrust = (driver, insights = {}) => ({
    score: numberOrZero(driver.trustScore),
    level: insights.trustLevel || null,
    reliabilityScore: numberOrZero(driver.reliabilityScore),
    completedRides: numberOrZero(driver.completedRides),
    message: insights.trustMessage || null
});

const toPublicRouteFairness = (driver, insights = {}) => ({
    score: numberOrZero(driver.routeFairnessScore),
    level: insights.routeFairnessLevel || null,
    routeAccuracyScore: numberOrZero(insights.routeAccuracyScore),
    detourPercentage: numberOrZero(driver.detourPercentage),
    onTimeArrivalScore: numberOrZero(driver.onTimeArrivalScore),
    message: insights.routeFairnessMessage || null
});

const toPublicCancellationRisk = (driver, insights = {}) => ({
    score: numberOrZero(driver.cancellationRiskScore),
    level: driver.cancellationRiskLevel || null,
    cancellationRatio: numberOrZero(driver.cancellationRatio),
    message: insights.cancellationRiskMessage || null
});

const toPublicDriverIdentity = (driver) => ({
    driverId: driver.id || driver.driverId,
    fullName: driver.fullName,
    rating: numberOrZero(driver.rating),
    vehicle: toPublicVehicle(driver)
});

const toPublicVehicle = (driver) => ({
    type: driver.vehicleType || null,
    name: driver.vehicleName || null,
    number: driver.vehicleNumber || null,
    color: driver.vehicleColor || null
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
