export const toPublicRideBooking = (booking) => {
    const bookingObject = booking.toObject ? booking.toObject() : booking;

    return {
        id: bookingObject._id?.toString() || bookingObject.id,
        bookingCode: bookingObject.bookingCode,
        authUserId: bookingObject.authUserId?.toString() || bookingObject.authUserId,
        role: bookingObject.role,
        fareEstimateId: bookingObject.fareEstimateId?.toString() || bookingObject.fareEstimateId,
        status: bookingObject.status,
        pickup: toPublicLocation(bookingObject.pickup),
        dropoff: toPublicLocation(bookingObject.dropoff),
        vehicleType: bookingObject.vehicleType,
        selectedDriver: toPublicSelectedDriver(bookingObject.selectedDriver),
        fareSnapshot: toPublicFareSnapshot(bookingObject.fareSnapshot),
        trustSignals: toPublicTrustSignals(bookingObject.trustSignals),
        paymentMethod: bookingObject.paymentMethod || null,
        riderNote: bookingObject.riderNote || null,
        expiresAt: bookingObject.expiresAt,
        confirmedAt: bookingObject.confirmedAt || null,
        cancellation: bookingObject.cancellation || null,
        createdAt: bookingObject.createdAt,
        updatedAt: bookingObject.updatedAt
    };
};

export const toPublicDriverOption = (driver) => ({
    driverId: driver.id || driver.driverId,
    fullName: driver.fullName,
    rating: numberOrZero(driver.rating),
    vehicle: {
        type: driver.vehicleType,
        name: driver.vehicleName,
        number: driver.vehicleNumber,
        color: driver.vehicleColor
    },
    etaMinutes: numberOrZero(driver.etaMinutes),
    distanceKm: numberOrZero(driver.distanceKm),
    averageFarePerKm: numberOrZero(driver.averageFarePerKm),
    routeFairnessScore: numberOrZero(driver.routeFairnessScore),
    detourPercentage: numberOrZero(driver.detourPercentage),
    onTimeArrivalScore: numberOrZero(driver.onTimeArrivalScore),
    cancellationRatio: numberOrZero(driver.cancellationRatio),
    trustScore: numberOrZero(driver.trustScore),
    reliabilityScore: numberOrZero(driver.reliabilityScore),
    cancellationRiskScore: numberOrZero(driver.cancellationRiskScore),
    cancellationRiskLevel: driver.cancellationRiskLevel,
    completedRides: numberOrZero(driver.completedRides),
    matchRank: numberOrZero(driver.matchRank),
    matchScore: numberOrZero(driver.matchScore),
    matchReasons: driver.matchReasons || []
});

export const toPublicRideSearch = ({ fareEstimate, driverOptions, trustSummary }) => ({
    fareEstimate,
    driverOptions: driverOptions.map(toPublicDriverOption),
    trustSummary
});

const toPublicLocation = (location = {}) => ({
    address: location.address || null,
    latitude: numberOrZero(location.latitude),
    longitude: numberOrZero(location.longitude)
});

const toPublicSelectedDriver = (driver = {}) => ({
    driverId: driver.driverId || driver.id,
    fullName: driver.fullName,
    rating: numberOrZero(driver.rating),
    vehicleName: driver.vehicleName,
    vehicleNumber: driver.vehicleNumber,
    vehicleColor: driver.vehicleColor,
    etaMinutes: numberOrZero(driver.etaMinutes),
    distanceKm: numberOrZero(driver.distanceKm)
});

const toPublicFareSnapshot = (snapshot = {}) => ({
    currency: snapshot.currency || 'INR',
    totalFare: numberOrZero(snapshot.totalFare),
    distanceKm: numberOrZero(snapshot.distanceKm),
    durationMinutes: numberOrZero(snapshot.durationMinutes),
    surgeMultiplier: numberOrZero(snapshot.surgeMultiplier),
    confidenceScore: numberOrZero(snapshot.confidenceScore),
    validUntil: snapshot.validUntil || null,
    lockedUntil: snapshot.lockedUntil || null
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

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
