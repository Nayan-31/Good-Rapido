export const toPublicRide = (ride) => ({
    id: ride.id,
    bookingCode: ride.bookingCode,
    authUserId: ride.authUserId,
    role: ride.role,
    bookingStatus: ride.bookingStatus,
    lifecycleStatus: ride.lifecycleStatus,
    pickup: toPublicLocation(ride.pickup),
    dropoff: toPublicLocation(ride.dropoff),
    vehicleType: ride.vehicleType,
    driver: toPublicDriver(ride.driver),
    fare: toPublicFare(ride.fare),
    trustSignals: toPublicTrustSignals(ride.trustSignals),
    paymentMethod: ride.paymentMethod || null,
    riderNote: ride.riderNote || null,
    timeline: toPublicTimeline(ride.timeline),
    progress: toPublicProgress(ride.progress),
    cancellation: ride.cancellation || null,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt
});

export const toPublicRideHistoryItem = (ride) => ({
    id: ride.id,
    bookingCode: ride.bookingCode,
    lifecycleStatus: ride.lifecycleStatus,
    pickup: toPublicLocation(ride.pickup),
    dropoff: toPublicLocation(ride.dropoff),
    vehicleType: ride.vehicleType,
    driverName: ride.driver?.fullName || null,
    totalFare: numberOrZero(ride.fare?.totalFare),
    currency: ride.fare?.currency || 'INR',
    routeAccuracyScore: numberOrZero(ride.trustSignals?.routeAccuracyScore),
    fairPriceScore: numberOrZero(ride.trustSignals?.fairPriceScore),
    completedAt: ride.timeline?.completedAt || null,
    cancelledAt: ride.timeline?.cancelledAt || null,
    createdAt: ride.createdAt
});

export const toPublicRideReceipt = (ride, receipt) => ({
    ride: {
        id: ride.id,
        bookingCode: ride.bookingCode,
        lifecycleStatus: ride.lifecycleStatus,
        pickup: toPublicLocation(ride.pickup),
        dropoff: toPublicLocation(ride.dropoff),
        vehicleType: ride.vehicleType,
        driver: toPublicDriver(ride.driver)
    },
    receipt
});

const toPublicLocation = (location = {}) => ({
    address: location.address || null,
    latitude: numberOrZero(location.latitude),
    longitude: numberOrZero(location.longitude)
});

const toPublicDriver = (driver = {}) => ({
    driverId: driver.driverId || driver.id || null,
    fullName: driver.fullName || null,
    rating: numberOrZero(driver.rating),
    vehicleName: driver.vehicleName || null,
    vehicleNumber: driver.vehicleNumber || null,
    vehicleColor: driver.vehicleColor || null,
    etaMinutes: numberOrZero(driver.etaMinutes),
    distanceKm: numberOrZero(driver.distanceKm)
});

const toPublicFare = (fare = {}) => ({
    currency: fare.currency || 'INR',
    totalFare: numberOrZero(fare.totalFare),
    distanceKm: numberOrZero(fare.distanceKm),
    durationMinutes: numberOrZero(fare.durationMinutes),
    surgeMultiplier: numberOrZero(fare.surgeMultiplier),
    confidenceScore: numberOrZero(fare.confidenceScore),
    validUntil: fare.validUntil || null,
    lockedUntil: fare.lockedUntil || null
});

const toPublicTrustSignals = (signals = {}) => ({
    driverTrustScore: numberOrZero(signals.driverTrustScore),
    driverReliabilityScore: numberOrZero(signals.driverReliabilityScore),
    routeFairnessScore: numberOrZero(signals.routeFairnessScore),
    routeAccuracyScore: numberOrZero(signals.routeAccuracyScore),
    cancellationRiskScore: numberOrZero(signals.cancellationRiskScore),
    cancellationRiskLevel: signals.cancellationRiskLevel || null,
    cancellationRatio: numberOrZero(signals.cancellationRatio),
    detourPercentage: numberOrZero(signals.detourPercentage),
    onTimeArrivalScore: numberOrZero(signals.onTimeArrivalScore),
    fairPriceScore: numberOrZero(signals.fairPriceScore)
});

const toPublicTimeline = (timeline = {}) => ({
    bookedAt: timeline.bookedAt || null,
    confirmedAt: timeline.confirmedAt || null,
    driverArrivalEtaAt: timeline.driverArrivalEtaAt || null,
    estimatedDropoffAt: timeline.estimatedDropoffAt || null,
    completedAt: timeline.completedAt || null,
    cancelledAt: timeline.cancelledAt || null
});

const toPublicProgress = (progress = {}) => ({
    percentage: numberOrZero(progress.percentage),
    currentStep: progress.currentStep || null,
    nextAction: progress.nextAction || null
});

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
