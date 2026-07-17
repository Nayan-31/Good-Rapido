import {
    DRIVER_AVAILABILITY_STATUSES,
    DRIVER_LOCATION_SOURCES,
    DRIVER_LOCATION_STALE_AFTER_SECONDS,
    DRIVER_MAX_ACTIVE_SERVICE_ZONES
} from '../driver-availability.constants.js';
import {
    DRIVER_APPROVAL_STATUSES,
    DRIVER_ONBOARDING_STATUSES
} from '../../driver/driver.constants.js';

export const toDriverAvailabilityOptions = () => ({
    statuses: Object.values(DRIVER_AVAILABILITY_STATUSES),
    locationSources: Object.values(DRIVER_LOCATION_SOURCES),
    heartbeatTtlSeconds: DRIVER_LOCATION_STALE_AFTER_SECONDS,
    maxActiveServiceZones: DRIVER_MAX_ACTIVE_SERVICE_ZONES
});

export const toDriverAvailability = (driverProfile = {}, { now = new Date(), blockers = [] } = {}) => {
    const availability = driverProfile.availability || {};
    const status = availability.status || DRIVER_AVAILABILITY_STATUSES.OFFLINE;

    return {
        status,
        isOnline: status === DRIVER_AVAILABILITY_STATUSES.ONLINE,
        isPaused: status === DRIVER_AVAILABILITY_STATUSES.PAUSED,
        activeServiceZones: Array.isArray(availability.activeServiceZones)
            ? availability.activeServiceZones
            : [],
        currentLocation: toLocationDto(availability.currentLocation),
        statusReason: availability.statusReason || null,
        lastOnlineAt: availability.lastOnlineAt || null,
        lastOfflineAt: availability.lastOfflineAt || null,
        lastHeartbeatAt: availability.lastHeartbeatAt || null,
        heartbeatAgeSeconds: toHeartbeatAgeSeconds(availability.lastHeartbeatAt, now),
        updatedAt: availability.updatedAt || null,
        guidance: toAvailabilityGuidance(driverProfile, {
            now,
            blockers
        })
    };
};

const toAvailabilityGuidance = (driverProfile = {}, { now = new Date(), blockers = [] } = {}) => ({
    canGoOnline: blockers.length === 0,
    blockers,
    locationFresh: isLocationFresh(driverProfile.availability, now),
    rideRequestsEnabled: driverProfile.accountControls?.rideRequestsEnabled === true,
    approvalStatus: driverProfile.approvalStatus || DRIVER_APPROVAL_STATUSES.PENDING,
    onboardingStatus: driverProfile.onboarding?.status || DRIVER_ONBOARDING_STATUSES.NOT_STARTED,
    primaryServiceZone: driverProfile.service?.serviceZone || null,
    heartbeatTtlSeconds: DRIVER_LOCATION_STALE_AFTER_SECONDS
});

const toLocationDto = (location = {}) => {
    const coordinates = Array.isArray(location?.coordinates) ? location.coordinates : [];

    if (coordinates.length !== 2) {
        return null;
    }

    return {
        longitude: coordinates[0],
        latitude: coordinates[1],
        accuracyMeters: nullableNumber(location.accuracyMeters),
        headingDegrees: nullableNumber(location.headingDegrees),
        speedKmph: nullableNumber(location.speedKmph),
        addressLabel: location.addressLabel || null,
        source: location.source || DRIVER_LOCATION_SOURCES.GPS,
        capturedAt: location.capturedAt || null
    };
};

const toHeartbeatAgeSeconds = (lastHeartbeatAt, now) => {
    const heartbeatAt = toDate(lastHeartbeatAt);

    if (!heartbeatAt) {
        return null;
    }

    return Math.max(0, Math.floor((toDate(now).getTime() - heartbeatAt.getTime()) / 1000));
};

const isLocationFresh = (availability = {}, now = new Date()) => {
    if (!toLocationDto(availability?.currentLocation)) {
        return false;
    }

    const heartbeatAt = toDate(availability.lastHeartbeatAt || availability.currentLocation?.capturedAt);

    if (!heartbeatAt) {
        return false;
    }

    return toHeartbeatAgeSeconds(heartbeatAt, now) <= DRIVER_LOCATION_STALE_AFTER_SECONDS;
};

const nullableNumber = (value) => Number.isFinite(value) ? value : null;

const toDate = (value) => {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
};
