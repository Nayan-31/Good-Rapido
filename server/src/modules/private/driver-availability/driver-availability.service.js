import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    DRIVER_APPROVAL_STATUSES,
    DRIVER_ONBOARDING_STATUSES
} from '../driver/driver.constants.js';
import {
    DRIVER_AVAILABILITY_STATUSES,
    DRIVER_LOCATION_SOURCES,
    DRIVER_LOCATION_STALE_AFTER_SECONDS
} from './driver-availability.constants.js';
import {
    toDriverAvailability,
    toDriverAvailabilityOptions
} from './dto/driver-availability.dto.js';

export default class DriverAvailabilityService {
    constructor({ availabilityDao, now = () => new Date() }) {
        this.availabilityDao = availabilityDao;
        this.now = now;
    }

    options(authContext) {
        this.assertDriverReadContext(authContext);

        return buildSuccessResponse({
            message: 'Driver availability options fetched successfully',
            data: {
                options: toDriverAvailabilityOptions()
            }
        });
    }

    async getStatus(authContext) {
        const { driverProfile } = await this.getDriverContext(authContext);
        const now = this.now();

        return buildSuccessResponse({
            message: 'Driver availability fetched successfully',
            data: {
                availability: toDriverAvailability(driverProfile, {
                    now,
                    blockers: resolveOnlineBlockers(driverProfile, now)
                })
            }
        });
    }

    async updateStatus(authContext, payload) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const now = this.now();
        const nextAvailability = buildAvailabilityForStatus(driverProfile, payload, now);

        if (nextAvailability.status === DRIVER_AVAILABILITY_STATUSES.ONLINE) {
            assertCanGoOnline({
                ...driverProfile,
                availability: nextAvailability
            }, now);
        }

        if (
            nextAvailability.status === DRIVER_AVAILABILITY_STATUSES.PAUSED
            && driverProfile.availability.status === DRIVER_AVAILABILITY_STATUSES.OFFLINE
        ) {
            throw AppError.badRequest('Driver must be online before pausing availability');
        }

        const updatedProfile = await this.updateAvailability(authContext.userId, nextAvailability);

        return buildSuccessResponse({
            message: 'Driver availability status updated successfully',
            data: {
                availability: toDriverAvailability(updatedProfile, {
                    now,
                    blockers: resolveOnlineBlockers(updatedProfile, now)
                })
            }
        });
    }

    async updateLocation(authContext, payload) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const now = this.now();
        const nextAvailability = {
            ...driverProfile.availability,
            currentLocation: normalizeLocation(payload.currentLocation, now),
            activeServiceZones: payload.activeServiceZones !== undefined
                ? normalizeServiceZones(payload.activeServiceZones)
                : driverProfile.availability.activeServiceZones,
            lastHeartbeatAt: now,
            updatedAt: now
        };

        if (nextAvailability.status === DRIVER_AVAILABILITY_STATUSES.ONLINE) {
            assertCanGoOnline({
                ...driverProfile,
                availability: nextAvailability
            }, now);
        }

        const updatedProfile = await this.updateAvailability(authContext.userId, nextAvailability);

        return buildSuccessResponse({
            message: 'Driver location updated successfully',
            data: {
                availability: toDriverAvailability(updatedProfile, {
                    now,
                    blockers: resolveOnlineBlockers(updatedProfile, now)
                })
            }
        });
    }

    async updateZones(authContext, payload) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const now = this.now();
        const nextAvailability = {
            ...driverProfile.availability,
            activeServiceZones: normalizeServiceZones(payload.activeServiceZones),
            updatedAt: now
        };

        if (nextAvailability.status === DRIVER_AVAILABILITY_STATUSES.ONLINE) {
            assertCanGoOnline({
                ...driverProfile,
                availability: nextAvailability
            }, now);
        }

        const updatedProfile = await this.updateAvailability(authContext.userId, nextAvailability);

        return buildSuccessResponse({
            message: 'Driver active service zones updated successfully',
            data: {
                availability: toDriverAvailability(updatedProfile, {
                    now,
                    blockers: resolveOnlineBlockers(updatedProfile, now)
                })
            }
        });
    }

    async getDriverContext(authContext) {
        this.assertDriverReadContext(authContext);
        const authUser = toPlainObject(await this.availabilityDao.findAuthUserById(authContext.userId));

        if (!authUser) {
            throw AppError.notFound('Driver account not found');
        }

        this.assertActiveDriver(authUser);

        const driverProfile = toPlainObject(await this.availabilityDao.findProfileByAuthUserId(authContext.userId));

        if (!driverProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return {
            authUser,
            driverProfile: normalizeDriverProfile(driverProfile)
        };
    }

    async updateAvailability(authUserId, availability) {
        const updatedProfile = toPlainObject(await this.availabilityDao.updateAvailability(authUserId, availability));

        if (!updatedProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return normalizeDriverProfile(updatedProfile);
    }

    assertDriverReadContext(authContext) {
        if (!authContext?.userId || authContext.role !== PRIVATE_AUTH_ROLES.DRIVER) {
            throw AppError.forbidden('Driver private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_READ)) {
            throw AppError.forbidden('Driver profile read permission is required');
        }

        return authContext;
    }

    assertDriverWriteContext(authContext) {
        this.assertDriverReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_AVAILABILITY_WRITE)) {
            throw AppError.forbidden('Driver availability write permission is required');
        }
    }

    assertActiveDriver(authUser) {
        if (authUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
            throw AppError.forbidden(`Driver account is ${authUser.accountStatus}`);
        }
    }
}

const buildAvailabilityForStatus = (driverProfile = {}, payload = {}, now) => {
    const existingAvailability = driverProfile.availability;
    const status = payload.status;
    const nextAvailability = {
        ...existingAvailability,
        status,
        ...(payload.currentLocation ? { currentLocation: normalizeLocation(payload.currentLocation, now) } : {}),
        ...(payload.activeServiceZones !== undefined ? { activeServiceZones: normalizeServiceZones(payload.activeServiceZones) } : {}),
        statusReason: payload.statusReason?.trim() || null,
        updatedAt: now
    };

    if (
        status === DRIVER_AVAILABILITY_STATUSES.ONLINE
        && payload.activeServiceZones === undefined
        && !existingAvailability.activeServiceZones.length
    ) {
        nextAvailability.activeServiceZones = fallbackServiceZones(driverProfile);
    }

    if (status === DRIVER_AVAILABILITY_STATUSES.ONLINE) {
        nextAvailability.lastOnlineAt = now;

        if (payload.currentLocation) {
            nextAvailability.lastHeartbeatAt = now;
        }
    }

    if (status === DRIVER_AVAILABILITY_STATUSES.OFFLINE) {
        nextAvailability.lastOfflineAt = now;
    }

    return normalizeAvailability(nextAvailability);
};

const assertCanGoOnline = (driverProfile, now) => {
    const blockers = resolveOnlineBlockers(driverProfile, now);

    if (blockers.length) {
        throw AppError.badRequest(`Driver cannot go online: ${blockers.join('; ')}`);
    }
};

const resolveOnlineBlockers = (driverProfile = {}, now = new Date()) => {
    const blockers = [];

    if (driverProfile.approvalStatus !== DRIVER_APPROVAL_STATUSES.APPROVED) {
        blockers.push('Driver approval must be approved');
    }

    if (driverProfile.onboarding?.status !== DRIVER_ONBOARDING_STATUSES.APPROVED) {
        blockers.push('Driver onboarding must be approved');
    }

    if (driverProfile.accountControls?.rideRequestsEnabled !== true) {
        blockers.push('Ride requests must be enabled from account controls');
    }

    if (driverProfile.accountControls?.deactivationRequestedAt) {
        blockers.push('Driver deactivation request is pending');
    }

    if (!hasFreshLocation(driverProfile.availability, now)) {
        blockers.push('Current location is required before going online');
    }

    if (!driverProfile.availability?.activeServiceZones?.length) {
        blockers.push('At least one active service zone is required');
    }

    return blockers;
};

const hasFreshLocation = (availability = {}, now = new Date()) => {
    if (!availability.currentLocation?.coordinates?.length) {
        return false;
    }

    const lastHeartbeatAt = toDate(availability.lastHeartbeatAt || availability.currentLocation?.capturedAt);

    if (!lastHeartbeatAt) {
        return false;
    }

    const ageSeconds = Math.max(0, Math.floor((toDate(now).getTime() - lastHeartbeatAt.getTime()) / 1000));

    return ageSeconds <= DRIVER_LOCATION_STALE_AFTER_SECONDS;
};

const normalizeDriverProfile = (driverProfile = {}) => ({
    ...driverProfile,
    service: {
        serviceZone: driverProfile.service?.serviceZone || null,
        vehicleTypes: Array.isArray(driverProfile.service?.vehicleTypes) ? driverProfile.service.vehicleTypes : [],
        experienceYears: driverProfile.service?.experienceYears,
        preferredRadiusKm: driverProfile.service?.preferredRadiusKm
    },
    onboarding: {
        status: driverProfile.onboarding?.status || DRIVER_ONBOARDING_STATUSES.NOT_STARTED
    },
    approvalStatus: driverProfile.approvalStatus || DRIVER_APPROVAL_STATUSES.PENDING,
    accountControls: {
        rideRequestsEnabled: driverProfile.accountControls?.rideRequestsEnabled === true,
        deactivationRequestedAt: driverProfile.accountControls?.deactivationRequestedAt || null
    },
    availability: normalizeAvailability(driverProfile.availability)
});

const normalizeAvailability = (availability = {}) => ({
    status: availability.status || DRIVER_AVAILABILITY_STATUSES.OFFLINE,
    currentLocation: normalizeExistingLocation(availability.currentLocation),
    activeServiceZones: normalizeServiceZones(availability.activeServiceZones || []),
    statusReason: availability.statusReason || null,
    lastOnlineAt: availability.lastOnlineAt || null,
    lastOfflineAt: availability.lastOfflineAt || null,
    lastHeartbeatAt: availability.lastHeartbeatAt || null,
    updatedAt: availability.updatedAt || null
});

const normalizeLocation = (location = {}, now) => ({
    type: 'Point',
    coordinates: [location.longitude, location.latitude],
    accuracyMeters: nullableNumber(location.accuracyMeters),
    headingDegrees: nullableNumber(location.headingDegrees),
    speedKmph: nullableNumber(location.speedKmph),
    addressLabel: location.addressLabel?.trim() || null,
    source: location.source || DRIVER_LOCATION_SOURCES.GPS,
    capturedAt: location.capturedAt || now
});

const normalizeExistingLocation = (location = null) => {
    if (!location?.coordinates?.length) {
        return null;
    }

    return {
        type: location.type || 'Point',
        coordinates: location.coordinates,
        accuracyMeters: nullableNumber(location.accuracyMeters),
        headingDegrees: nullableNumber(location.headingDegrees),
        speedKmph: nullableNumber(location.speedKmph),
        addressLabel: location.addressLabel || null,
        source: location.source || DRIVER_LOCATION_SOURCES.GPS,
        capturedAt: location.capturedAt || null
    };
};

const normalizeServiceZones = (zones = []) => [...new Set(
    (Array.isArray(zones) ? zones : [])
        .map((zone) => zone.trim().toLowerCase())
        .filter(Boolean)
)];

const fallbackServiceZones = (driverProfile = {}) => normalizeServiceZones([
    driverProfile.service?.serviceZone
].filter(Boolean));

const nullableNumber = (value) => Number.isFinite(value) ? value : null;

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toDate = (value) => {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
};
