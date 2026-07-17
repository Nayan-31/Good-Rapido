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
    DRIVER_CONTACT_CHANNELS,
    DRIVER_ONBOARDING_STATUSES,
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_KEYS,
    DRIVER_ONBOARDING_STEP_STATUSES,
    DRIVER_VEHICLE_TYPES
} from './driver.constants.js';
import { createDriverRouter } from './driver.route.js';

const BASE_PATH = '/api/v1/private/driver';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createDriverRouter(dependencies));
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
        displayName: 'Driver User',
        bio: 'Safe city rides',
        profilePhotoUrl: null,
        languages: ['English', 'Hindi']
    },
    service: {
        serviceZone: 'kolkata',
        vehicleTypes: [DRIVER_VEHICLE_TYPES.BIKE],
        experienceYears: 3,
        preferredRadiusKm: 8
    },
    onboarding: {
        status: DRIVER_ONBOARDING_STATUSES.IN_PROGRESS,
        steps: createOnboardingSteps(),
        submittedAt: null,
        reviewedAt: null,
        rejectionReason: null
    },
    approvalStatus: DRIVER_APPROVAL_STATUSES.PENDING,
    accountControls: {
        rideRequestsEnabled: false,
        marketingOptIn: true,
        safetyTrainingAccepted: false,
        preferredContactChannel: DRIVER_CONTACT_CHANNELS.IN_APP,
        deactivationRequestedAt: null,
        deactivationReason: null
    },
    latestActivityAt: FIXED_NOW,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createOnboardingSteps = (status = DRIVER_ONBOARDING_STEP_STATUSES.PENDING) => DRIVER_ONBOARDING_STEP_CATALOG.map((step) => ({
    ...step,
    status,
    note: null,
    completedAt: status === DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED ? FIXED_NOW : null,
    updatedAt: FIXED_NOW
}));

const createDependencies = () => ({
    driverDao: {
        findAuthUserById: jest.fn(),
        findProfileByAuthUserId: jest.fn(),
        createProfile: jest.fn(),
        updateProfile: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private driver routes', () => {
    let dependencies;
    let app;
    let driverUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        driverUser = createPrivateUser();
    });

    test('options returns driver metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.onboardingStatuses).toContain(DRIVER_ONBOARDING_STATUSES.SUBMITTED);
        expect(response.body.data.options.approvalStatuses).toContain(DRIVER_APPROVAL_STATUSES.APPROVED);
        expect(response.body.data.options.vehicleTypes).toContain(DRIVER_VEHICLE_TYPES.BIKE);
        expect(response.body.data.options.onboardingSteps).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: DRIVER_ONBOARDING_STEP_KEYS.DOCUMENTS
            })
        ]));
    });

    test('profile creates a default driver profile when missing', async () => {
        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(null);
        dependencies.driverDao.createProfile.mockImplementation(async (payload) => createDriverProfile({
            ...payload,
            id: 'driver-profile-id',
            _id: 'driver-profile-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/profile`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.profile.auth.role).toBe(PRIVATE_AUTH_ROLES.DRIVER);
        expect(response.body.data.profile.driver.driverCode).toBe('DRV-001');
        expect(response.body.data.profile.driver.onboarding.status).toBe(DRIVER_ONBOARDING_STATUSES.NOT_STARTED);
        expect(dependencies.driverDao.createProfile).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: driverUser.id,
            driverCode: driverUser.employeeCode,
            approvalStatus: DRIVER_APPROVAL_STATUSES.PENDING
        }));
    });

    test('profile can be updated by the driver', async () => {
        const profile = createDriverProfile({
            onboarding: {
                status: DRIVER_ONBOARDING_STATUSES.NOT_STARTED,
                steps: createOnboardingSteps()
            }
        });

        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.driverDao.updateProfile.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/profile`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                profile: {
                    displayName: 'Raj Driver',
                    bio: 'Reliable bike rides',
                    languages: ['English', 'Bengali']
                },
                service: {
                    serviceZone: 'kolkata-north',
                    vehicleTypes: [DRIVER_VEHICLE_TYPES.BIKE],
                    experienceYears: 4,
                    preferredRadiusKm: 12
                }
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.profile.driver.profile.displayName).toBe('Raj Driver');
        expect(response.body.data.profile.driver.service.serviceZone).toBe('kolkata-north');
        expect(response.body.data.profile.driver.onboarding.status).toBe(DRIVER_ONBOARDING_STATUSES.IN_PROGRESS);
        expect(dependencies.driverDao.updateProfile).toHaveBeenCalledWith(driverUser.id, expect.objectContaining({
            latestActivityAt: FIXED_NOW
        }));
    });

    test('onboarding can be fetched with completion guidance', async () => {
        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile());

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/onboarding`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.onboarding.steps).toHaveLength(DRIVER_ONBOARDING_STEP_CATALOG.length);
        expect(response.body.data.onboarding.completion.percent).toBe(0);
        expect(response.body.data.guidance.nextAction).toBe('Complete required onboarding steps');
    });

    test('onboarding steps can be updated', async () => {
        const profile = createDriverProfile();

        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.driverDao.updateProfile.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/onboarding`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                steps: [{
                    key: DRIVER_ONBOARDING_STEP_KEYS.PROFILE,
                    status: DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED,
                    note: 'Profile details completed'
                }]
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.onboarding.status).toBe(DRIVER_ONBOARDING_STATUSES.IN_PROGRESS);
        expect(response.body.data.onboarding.steps[0].status).toBe(DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED);
        expect(dependencies.driverDao.updateProfile).toHaveBeenCalledWith(driverUser.id, expect.objectContaining({
            onboarding: expect.objectContaining({
                status: DRIVER_ONBOARDING_STATUSES.IN_PROGRESS
            })
        }));
    });

    test('submit onboarding rejects incomplete required steps', async () => {
        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile());

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/onboarding/submit`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Complete all required onboarding steps before submitting');
        expect(dependencies.driverDao.updateProfile).not.toHaveBeenCalled();
    });

    test('submit onboarding sends completed onboarding for review', async () => {
        const profile = createDriverProfile({
            onboarding: {
                status: DRIVER_ONBOARDING_STATUSES.IN_PROGRESS,
                steps: createOnboardingSteps(DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED)
            }
        });

        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.driverDao.updateProfile.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/onboarding/submit`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.onboarding.status).toBe(DRIVER_ONBOARDING_STATUSES.SUBMITTED);
        expect(response.body.data.approvalStatus).toBe(DRIVER_APPROVAL_STATUSES.UNDER_REVIEW);
        expect(dependencies.driverDao.updateProfile).toHaveBeenCalledWith(driverUser.id, expect.objectContaining({
            approvalStatus: DRIVER_APPROVAL_STATUSES.UNDER_REVIEW,
            latestActivityAt: FIXED_NOW
        }));
    });

    test('account returns controls and approval state', async () => {
        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile());

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/account`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.account.approvalStatus).toBe(DRIVER_APPROVAL_STATUSES.PENDING);
        expect(response.body.data.account.accountControls.rideRequestsEnabled).toBe(false);
    });

    test('account controls reject ride requests before approval', async () => {
        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile());

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/account/controls`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                rideRequestsEnabled: true
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Driver must be approved before enabling ride requests');
        expect(dependencies.driverDao.updateProfile).not.toHaveBeenCalled();
    });

    test('account controls can be updated after approval', async () => {
        const profile = createDriverProfile({
            onboarding: {
                status: DRIVER_ONBOARDING_STATUSES.APPROVED,
                steps: createOnboardingSteps(DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED)
            },
            approvalStatus: DRIVER_APPROVAL_STATUSES.APPROVED
        });

        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.driverDao.updateProfile.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/account/controls`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                rideRequestsEnabled: true,
                safetyTrainingAccepted: true,
                preferredContactChannel: DRIVER_CONTACT_CHANNELS.PHONE
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.account.accountControls.rideRequestsEnabled).toBe(true);
        expect(response.body.data.account.accountControls.preferredContactChannel).toBe(DRIVER_CONTACT_CHANNELS.PHONE);
    });

    test('driver can request account deactivation', async () => {
        const profile = createDriverProfile();

        dependencies.driverDao.findAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.driverDao.updateProfile.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/account/deactivation-request`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                reason: 'I want to pause driving for a while'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.account.accountControls.rideRequestsEnabled).toBe(false);
        expect(response.body.data.account.accountControls.deactivationRequestedAt).toBe(FIXED_NOW.toISOString());
        expect(response.body.data.account.accountControls.deactivationReason).toBe('I want to pause driving for a while');
    });

    test('driver routes reject non-driver private users', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/profile`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('You do not have access to this private route');
    });

    test('driver routes reject inactive driver accounts', async () => {
        const suspendedDriver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER, {
            accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.SUSPENDED
        });

        dependencies.driverDao.findAuthUserById.mockResolvedValue(suspendedDriver);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/profile`,
            headers: authHeaderFor(dependencies, suspendedDriver)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Driver account is suspended');
    });

    test('driver write routes reject missing write permission', async () => {
        const readOnlyDriver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER, {
            permissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_PROFILE_READ]
        });

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/profile`,
            headers: authHeaderFor(dependencies, readOnlyDriver),
            body: {
                profile: {
                    displayName: 'Readonly Driver'
                }
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('driver routes reject requests without private access tokens', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/profile`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Private access token is required');
    });

    test('driver routes return validation errors for invalid payloads', async () => {
        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/profile`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                profile: {
                    displayName: 'D',
                    profilePhotoUrl: 'not-a-url'
                }
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });
});
