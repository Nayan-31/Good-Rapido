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
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_KEYS,
    DRIVER_ONBOARDING_STEP_STATUSES,
    DRIVER_VEHICLE_TYPES
} from '../driver/driver.constants.js';
import {
    VEHICLE_FUEL_TYPES,
    VEHICLE_OWNERSHIP_TYPES,
    VEHICLE_REVIEW_STATUSES,
    VEHICLE_STATUSES
} from './vehicle.constants.js';
import { createVehicleRouter } from './vehicle.route.js';

const BASE_PATH = '/api/v1/private/vehicle';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createVehicleRouter(dependencies));
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
    phone: role === PRIVATE_AUTH_ROLES.DRIVER ? '+919111111111' : '+919222222222',
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
        vehicleTypes: []
    },
    onboarding: {
        status: 'in_progress',
        steps: createOnboardingSteps()
    },
    vehicles: [],
    latestActivityAt: FIXED_NOW,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createOnboardingSteps = (status = DRIVER_ONBOARDING_STEP_STATUSES.PENDING) => DRIVER_ONBOARDING_STEP_CATALOG.map((step) => ({
    ...step,
    status,
    note: null,
    completedAt: null,
    updatedAt: FIXED_NOW
}));

const createVehicle = (overrides = {}) => ({
    vehicleId: 'VEH-001',
    type: DRIVER_VEHICLE_TYPES.CAB_ECONOMY,
    make: 'Suzuki',
    model: 'Dzire',
    variant: 'VXI',
    color: 'White',
    registrationNumber: 'WB 01 AC 4522',
    manufacturingYear: 2024,
    ownershipType: VEHICLE_OWNERSHIP_TYPES.OWNED,
    fuelType: VEHICLE_FUEL_TYPES.PETROL,
    insurance: {
        number: 'INS-4522',
        expiresAt: new Date('2027-01-01T00:00:00.000Z')
    },
    permit: {
        number: 'PERMIT-4522',
        expiresAt: new Date('2027-01-01T00:00:00.000Z')
    },
    fitness: {
        number: 'FIT-4522',
        expiresAt: new Date('2027-01-01T00:00:00.000Z')
    },
    status: VEHICLE_STATUSES.DRAFT,
    isPrimary: true,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    notes: 'Clean vehicle',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createVehiclePayload = (overrides = {}) => ({
    type: DRIVER_VEHICLE_TYPES.CAB_ECONOMY,
    make: 'Suzuki',
    model: 'Dzire',
    variant: 'VXI',
    color: 'White',
    registrationNumber: 'wb 01 ac 4522',
    manufacturingYear: 2024,
    ownershipType: VEHICLE_OWNERSHIP_TYPES.OWNED,
    fuelType: VEHICLE_FUEL_TYPES.PETROL,
    insurance: {
        number: 'INS-4522',
        expiresAt: '2027-01-01T00:00:00.000Z'
    },
    permit: {
        number: 'PERMIT-4522',
        expiresAt: '2027-01-01T00:00:00.000Z'
    },
    fitness: {
        number: 'FIT-4522',
        expiresAt: '2027-01-01T00:00:00.000Z'
    },
    notes: 'Clean vehicle',
    ...overrides
});

const createDependencies = () => ({
    vehicleDao: {
        findPrivateUserById: jest.fn(),
        findDriverAuthUserById: jest.fn(),
        findProfileByAuthUserId: jest.fn(),
        findProfileById: jest.fn(),
        findReviewQueue: jest.fn(),
        updateVehiclesByAuthUserId: jest.fn(),
        updateVehiclesByProfileId: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private vehicle routes', () => {
    let dependencies;
    let app;
    let driverUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        driverUser = createPrivateUser();
    });

    test('options returns vehicle metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.vehicleTypes).toContain(DRIVER_VEHICLE_TYPES.CAB_ECONOMY);
        expect(response.body.data.options.statuses).toContain(VEHICLE_STATUSES.SUBMITTED);
        expect(response.body.data.options.ownershipTypes).toContain(VEHICLE_OWNERSHIP_TYPES.RENTED);
        expect(response.body.data.options.fuelTypes).toContain(VEHICLE_FUEL_TYPES.ELECTRIC);
    });

    test('driver can list vehicles with summary and guidance', async () => {
        dependencies.vehicleDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.vehicleDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile({
            service: {
                serviceZone: 'kolkata',
                vehicleTypes: [DRIVER_VEHICLE_TYPES.CAB_ECONOMY]
            },
            vehicles: [createVehicle({
                status: VEHICLE_STATUSES.APPROVED,
                isPrimary: true
            })]
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/vehicles`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.vehicles.vehicles[0].id).toBe('VEH-001');
        expect(response.body.data.vehicles.summary.approvedVehicles).toBe(1);
        expect(response.body.data.vehicles.guidance.nextAction).toBe('Vehicle ready for rides');
    });

    test('driver can create a vehicle as draft and primary when it is the first vehicle', async () => {
        const profile = createDriverProfile();

        dependencies.vehicleDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.vehicleDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.vehicleDao.updateVehiclesByAuthUserId.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/vehicles`,
            headers: authHeaderFor(dependencies, driverUser),
            body: createVehiclePayload()
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.vehicles.vehicles[0].status).toBe(VEHICLE_STATUSES.DRAFT);
        expect(response.body.data.vehicles.vehicles[0].isPrimary).toBe(true);
        expect(response.body.data.vehicles.vehicles[0].registrationNumber).toBe('WB 01 AC 4522');
        expect(dependencies.vehicleDao.updateVehiclesByAuthUserId).toHaveBeenCalledWith(driverUser.id, expect.objectContaining({
            vehicles: [expect.objectContaining({
                vehicleId: expect.stringMatching(/^VEH-/),
                registrationNumber: 'WB 01 AC 4522',
                isPrimary: true
            })],
            latestActivityAt: FIXED_NOW
        }));
    });

    test('driver cannot create a duplicate registration number for the same profile', async () => {
        dependencies.vehicleDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.vehicleDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile({
            vehicles: [createVehicle()]
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/vehicles`,
            headers: authHeaderFor(dependencies, driverUser),
            body: createVehiclePayload()
        });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('Vehicle registration number already exists for this driver');
        expect(dependencies.vehicleDao.updateVehiclesByAuthUserId).not.toHaveBeenCalled();
    });

    test('driver can update a rejected vehicle back to draft', async () => {
        const vehicle = createVehicle({
            status: VEHICLE_STATUSES.REJECTED,
            rejectionReason: 'Registration photo is unclear'
        });
        const profile = createDriverProfile({
            vehicles: [vehicle]
        });

        dependencies.vehicleDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.vehicleDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.vehicleDao.updateVehiclesByAuthUserId.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/vehicles/VEH-001`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                color: 'Pearl White',
                notes: 'Updated photo uploaded'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.vehicles.vehicles[0].status).toBe(VEHICLE_STATUSES.DRAFT);
        expect(response.body.data.vehicles.vehicles[0].color).toBe('Pearl White');
        expect(response.body.data.vehicles.vehicles[0].rejectionReason).toBeNull();
    });

    test('driver can submit a draft vehicle for review', async () => {
        const profile = createDriverProfile({
            vehicles: [createVehicle()]
        });

        dependencies.vehicleDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.vehicleDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.vehicleDao.updateVehiclesByAuthUserId.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/vehicles/VEH-001/submit`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.vehicles.vehicles[0].status).toBe(VEHICLE_STATUSES.SUBMITTED);
        expect(response.body.data.vehicles.vehicles[0].submittedAt).toBe(FIXED_NOW.toISOString());
        expect(dependencies.vehicleDao.updateVehiclesByAuthUserId).toHaveBeenCalledWith(driverUser.id, expect.objectContaining({
            onboarding: expect.objectContaining({
                steps: expect.arrayContaining([
                    expect.objectContaining({
                        key: DRIVER_ONBOARDING_STEP_KEYS.VEHICLE_PREFERENCE,
                        note: 'Vehicle is under review'
                    })
                ])
            })
        }));
    });

    test('approved vehicles cannot be edited by the driver', async () => {
        dependencies.vehicleDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.vehicleDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile({
            vehicles: [createVehicle({
                status: VEHICLE_STATUSES.APPROVED
            })]
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/vehicles/VEH-001`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                color: 'Silver'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only draft or rejected vehicles can be edited');
        expect(dependencies.vehicleDao.updateVehiclesByAuthUserId).not.toHaveBeenCalled();
    });

    test('ops can fetch the submitted vehicle review queue', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);

        dependencies.vehicleDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.vehicleDao.findReviewQueue.mockResolvedValue([
            createDriverProfile({
                vehicles: [createVehicle({
                    status: VEHICLE_STATUSES.SUBMITTED,
                    submittedAt: FIXED_NOW
                })]
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/review-queue?limit=5`,
            headers: authHeaderFor(dependencies, opsUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.reviewQueue).toHaveLength(1);
        expect(response.body.data.reviewQueue[0].vehicle.status).toBe(VEHICLE_STATUSES.SUBMITTED);
        expect(dependencies.vehicleDao.findReviewQueue).toHaveBeenCalledWith({
            status: VEHICLE_STATUSES.SUBMITTED,
            limit: 5
        });
    });

    test('review queue respects the requested vehicle status filter', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        dependencies.vehicleDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.vehicleDao.findReviewQueue.mockResolvedValue([
            createDriverProfile({
                vehicles: [createVehicle({
                    status: VEHICLE_STATUSES.APPROVED,
                    reviewedAt: FIXED_NOW
                })]
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/review-queue?status=${VEHICLE_STATUSES.APPROVED}`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.reviewQueue[0].vehicle.status).toBe(VEHICLE_STATUSES.APPROVED);
        expect(dependencies.vehicleDao.findReviewQueue).toHaveBeenCalledWith({
            status: VEHICLE_STATUSES.APPROVED,
            limit: 25
        });
    });

    test('admin can approve a submitted vehicle and sync onboarding vehicle step', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);
        const profile = createDriverProfile({
            vehicles: [createVehicle({
                status: VEHICLE_STATUSES.SUBMITTED,
                submittedAt: FIXED_NOW,
                isPrimary: true
            })]
        });

        dependencies.vehicleDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.vehicleDao.findProfileById.mockResolvedValue(profile);
        dependencies.vehicleDao.updateVehiclesByProfileId.mockImplementation(async (_profileId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/drivers/driver-profile-id/vehicles/VEH-001/review`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                status: VEHICLE_REVIEW_STATUSES.APPROVED
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.vehicles.vehicles[0].status).toBe(VEHICLE_STATUSES.APPROVED);
        expect(response.body.data.vehicles.guidance.hasApprovedPrimaryVehicle).toBe(true);
        expect(dependencies.vehicleDao.updateVehiclesByProfileId).toHaveBeenCalledWith('driver-profile-id', expect.objectContaining({
            service: expect.objectContaining({
                vehicleTypes: [DRIVER_VEHICLE_TYPES.CAB_ECONOMY]
            }),
            onboarding: expect.objectContaining({
                steps: expect.arrayContaining([
                    expect.objectContaining({
                        key: DRIVER_ONBOARDING_STEP_KEYS.VEHICLE_PREFERENCE,
                        status: DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED,
                        note: 'Primary vehicle approved'
                    })
                ])
            })
        }));
    });

    test('vehicle rejection requires a rejection reason', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/drivers/driver-profile-id/vehicles/VEH-001/review`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                status: VEHICLE_REVIEW_STATUSES.REJECTED
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(dependencies.vehicleDao.findProfileById).not.toHaveBeenCalled();
    });

    test('only approved vehicles can be set as primary', async () => {
        dependencies.vehicleDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.vehicleDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile({
            vehicles: [createVehicle()]
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/vehicles/VEH-001/primary`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only approved vehicles can be set as primary');
    });

    test('vehicle routes reject non-driver users on driver endpoints', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/vehicles`,
            headers: authHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('You do not have access to this private route');
    });

    test('vehicle write routes reject missing write permission', async () => {
        const readOnlyDriver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER, {
            permissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_READ]
        });

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/vehicles`,
            headers: authHeaderFor(dependencies, readOnlyDriver),
            body: createVehiclePayload()
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });
});
