import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import PrivateTokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    DRIVER_APPROVAL_STATUSES,
    DRIVER_ONBOARDING_STATUSES,
    DRIVER_VEHICLE_TYPES
} from '../driver/driver.constants.js';
import {
    DRIVER_AVAILABILITY_STATUSES,
    DRIVER_LOCATION_SOURCES
} from './driver-availability.constants.js';
import { createDriverAvailabilityRouter } from './driver-availability.route.js';

const BASE_PATH = '/api/v1/private/driver-availability';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');
const TEST_LOCATION = {
    latitude: 22.5726,
    longitude: 88.3639,
    accuracyMeters: 12,
    headingDegrees: 90,
    speedKmph: 18,
    addressLabel: 'Esplanade',
    source: DRIVER_LOCATION_SOURCES.GPS,
    capturedAt: FIXED_NOW
};

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createDriverAvailabilityRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.DRIVER, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: '+919111111111',
    employeeCode: role === PRIVATE_AUTH_ROLES.DRIVER ? 'DRV-001' : `${role.toUpperCase()}-001`,
    department: role === PRIVATE_AUTH_ROLES.DRIVER ? 'driver_network' : 'operations',
    serviceZone: 'kolkata',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDriverProfile = (overrides = {}) => ({
    id: 'driver-profile-id',
    _id: 'driver-profile-id',
    authUserId: 'driver-id',
    driverCode: 'DRV-001',
    profile: {
        displayName: 'Driver User'
    },
    service: {
        serviceZone: 'kolkata',
        vehicleTypes: [DRIVER_VEHICLE_TYPES.BIKE],
        preferredRadiusKm: 8
    },
    onboarding: {
        status: DRIVER_ONBOARDING_STATUSES.APPROVED
    },
    approvalStatus: DRIVER_APPROVAL_STATUSES.APPROVED,
    accountControls: {
        rideRequestsEnabled: true,
        deactivationRequestedAt: null
    },
    availability: createAvailability(),
    latestActivityAt: FIXED_NOW,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createAvailability = (overrides = {}) => ({
    status: DRIVER_AVAILABILITY_STATUSES.OFFLINE,
    currentLocation: null,
    activeServiceZones: [],
    statusReason: null,
    lastOnlineAt: null,
    lastOfflineAt: null,
    lastHeartbeatAt: null,
    updatedAt: null,
    ...overrides
});

const createGeoLocation = (overrides = {}) => ({
    type: 'Point',
    coordinates: [88.3639, 22.5726],
    accuracyMeters: 12,
    headingDegrees: 90,
    speedKmph: 18,
    addressLabel: 'Esplanade',
    source: DRIVER_LOCATION_SOURCES.GPS,
    capturedAt: FIXED_NOW,
    ...overrides
});

const createDependencies = () => ({
    availabilityDao: {
        findAuthUserById: jest.fn(),
        findProfileByAuthUserId: jest.fn(),
        updateAvailability: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private driver availability routes', () => {
    let dependencies;
    let app;
    let driverUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        driverUser = createPrivateUser();
    });

    test('options returns availability metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.statuses).toContain(DRIVER_AVAILABILITY_STATUSES.ONLINE);
        expect(response.body.data.options.locationSources).toContain(DRIVER_LOCATION_SOURCES.GPS);
        expect(response.body.data.options.heartbeatTtlSeconds).toBe(90);
    });

    test('status returns offline availability with online blockers', async () => {
        dependencies.availabilityDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.availabilityDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile({
            approvalStatus: DRIVER_APPROVAL_STATUSES.PENDING,
            onboarding: {
                status: DRIVER_ONBOARDING_STATUSES.IN_PROGRESS
            },
            accountControls: {
                rideRequestsEnabled: false,
                deactivationRequestedAt: null
            }
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/status`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.availability.status).toBe(DRIVER_AVAILABILITY_STATUSES.OFFLINE);
        expect(response.body.data.availability.guidance.canGoOnline).toBe(false);
        expect(response.body.data.availability.guidance.blockers).toEqual(expect.arrayContaining([
            'Driver approval must be approved',
            'Driver onboarding must be approved',
            'Ride requests must be enabled from account controls'
        ]));
    });

    test('driver can go online with fresh location and active zones', async () => {
        const profile = createDriverProfile();

        dependencies.availabilityDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.availabilityDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.availabilityDao.updateAvailability.mockImplementation(async (_authUserId, availability) => ({
            ...profile,
            availability,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/status`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
                currentLocation: TEST_LOCATION,
                activeServiceZones: ['Kolkata', 'salt-lake']
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.availability.isOnline).toBe(true);
        expect(response.body.data.availability.activeServiceZones).toEqual(['kolkata', 'salt-lake']);
        expect(response.body.data.availability.currentLocation.latitude).toBe(22.5726);
        expect(dependencies.availabilityDao.updateAvailability).toHaveBeenCalledWith(driverUser.id, expect.objectContaining({
            status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
            lastOnlineAt: FIXED_NOW,
            lastHeartbeatAt: FIXED_NOW,
            currentLocation: expect.objectContaining({
                coordinates: [88.3639, 22.5726]
            })
        }));
    });

    test('online status defaults to driver service zone when no active zones are set', async () => {
        const profile = createDriverProfile();

        dependencies.availabilityDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.availabilityDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.availabilityDao.updateAvailability.mockImplementation(async (_authUserId, availability) => ({
            ...profile,
            availability
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/status`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
                currentLocation: TEST_LOCATION
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.availability.activeServiceZones).toEqual(['kolkata']);
    });

    test('driver cannot go online before approval and account readiness', async () => {
        dependencies.availabilityDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.availabilityDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile({
            approvalStatus: DRIVER_APPROVAL_STATUSES.PENDING,
            onboarding: {
                status: DRIVER_ONBOARDING_STATUSES.IN_PROGRESS
            },
            accountControls: {
                rideRequestsEnabled: false,
                deactivationRequestedAt: null
            }
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/status`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
                currentLocation: TEST_LOCATION,
                activeServiceZones: ['kolkata']
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('Driver cannot go online');
        expect(dependencies.availabilityDao.updateAvailability).not.toHaveBeenCalled();
    });

    test('driver can go offline even when not approved', async () => {
        const profile = createDriverProfile({
            approvalStatus: DRIVER_APPROVAL_STATUSES.PENDING,
            availability: createAvailability({
                status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
                currentLocation: createGeoLocation(),
                activeServiceZones: ['kolkata'],
                lastHeartbeatAt: FIXED_NOW
            })
        });

        dependencies.availabilityDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.availabilityDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.availabilityDao.updateAvailability.mockImplementation(async (_authUserId, availability) => ({
            ...profile,
            availability
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/status`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                status: DRIVER_AVAILABILITY_STATUSES.OFFLINE,
                statusReason: 'Taking a break'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.availability.status).toBe(DRIVER_AVAILABILITY_STATUSES.OFFLINE);
        expect(response.body.data.availability.lastOfflineAt).toBe(FIXED_NOW.toISOString());
    });

    test('location heartbeat updates the current location for an online driver', async () => {
        const profile = createDriverProfile({
            availability: createAvailability({
                status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
                currentLocation: createGeoLocation(),
                activeServiceZones: ['kolkata'],
                lastHeartbeatAt: FIXED_NOW
            })
        });

        dependencies.availabilityDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.availabilityDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.availabilityDao.updateAvailability.mockImplementation(async (_authUserId, availability) => ({
            ...profile,
            availability
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/location`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                currentLocation: {
                    ...TEST_LOCATION,
                    latitude: 22.5801,
                    longitude: 88.4201,
                    addressLabel: 'Salt Lake'
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.availability.currentLocation.latitude).toBe(22.5801);
        expect(dependencies.availabilityDao.updateAvailability).toHaveBeenCalledWith(driverUser.id, expect.objectContaining({
            lastHeartbeatAt: FIXED_NOW,
            currentLocation: expect.objectContaining({
                coordinates: [88.4201, 22.5801],
                addressLabel: 'Salt Lake'
            })
        }));
    });

    test('active service zones can be updated while online', async () => {
        const profile = createDriverProfile({
            availability: createAvailability({
                status: DRIVER_AVAILABILITY_STATUSES.ONLINE,
                currentLocation: createGeoLocation(),
                activeServiceZones: ['kolkata'],
                lastHeartbeatAt: FIXED_NOW
            })
        });

        dependencies.availabilityDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.availabilityDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.availabilityDao.updateAvailability.mockImplementation(async (_authUserId, availability) => ({
            ...profile,
            availability
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/zones`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                activeServiceZones: ['New Town', 'kolkata']
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.availability.activeServiceZones).toEqual(['new town', 'kolkata']);
    });

    test('availability write routes reject missing availability permission', async () => {
        const readOnlyDriver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER, {
            permissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_READ]
        });

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/status`,
            headers: authHeaderFor(dependencies, readOnlyDriver),
            body: {
                status: DRIVER_AVAILABILITY_STATUSES.OFFLINE
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('availability routes reject non-driver private users', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/status`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('You do not have access to this private route');
    });

    test('availability routes return validation errors for invalid locations', async () => {
        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/location`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                currentLocation: {
                    latitude: 120,
                    longitude: 88.3639
                }
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });
});
