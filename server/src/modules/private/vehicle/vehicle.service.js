import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_KEYS,
    DRIVER_ONBOARDING_STEP_STATUSES
} from '../driver/driver.constants.js';
import {
    VEHICLE_FUEL_TYPES,
    VEHICLE_OWNERSHIP_TYPES,
    VEHICLE_REVIEW_STATUSES,
    VEHICLE_STATUSES
} from './vehicle.constants.js';
import {
    toDriverVehicles,
    toVehicleOptions,
    toVehicleReviewQueue
} from './dto/vehicle.dto.js';

export default class VehicleService {
    constructor({ vehicleDao, now = () => new Date() }) {
        this.vehicleDao = vehicleDao;
        this.now = now;
    }

    options(authContext) {
        this.assertPrivateContext(authContext);

        return buildSuccessResponse({
            message: 'Vehicle options fetched successfully',
            data: {
                options: toVehicleOptions()
            }
        });
    }

    async getVehicles(authContext) {
        const { driverProfile } = await this.getDriverContext(authContext);

        return buildSuccessResponse({
            message: 'Driver vehicles fetched successfully',
            data: {
                vehicles: toDriverVehicles(driverProfile)
            }
        });
    }

    async createVehicle(authContext, payload) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const vehicles = normalizeVehicles(driverProfile.vehicles);

        assertUniqueRegistrationNumber(vehicles, payload.registrationNumber);

        const now = this.now();
        const vehicle = buildVehicleItem(payload, {
            now,
            isPrimary: vehicles.length === 0
        });
        const nextVehicles = ensureSinglePrimary([...vehicles, vehicle]);
        const updatedProfile = await this.updateDriverVehiclesByAuthUserId(authContext.userId, {
            vehicles: nextVehicles,
            onboarding: syncOnboardingVehicleStep(driverProfile.onboarding, nextVehicles, now),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Vehicle created successfully',
            data: {
                vehicles: toDriverVehicles(updatedProfile)
            }
        });
    }

    async updateVehicle(authContext, vehicleId, payload) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const vehicles = normalizeVehicles(driverProfile.vehicles);
        const vehicle = findVehicleById(vehicles, vehicleId);

        if (!vehicle) {
            throw AppError.notFound('Vehicle not found');
        }

        assertVehicleEditable(vehicle);

        if (payload.registrationNumber !== undefined) {
            assertUniqueRegistrationNumber(vehicles, payload.registrationNumber, vehicle.vehicleId);
        }

        const now = this.now();
        const updatedVehicle = {
            ...vehicle,
            ...normalizeVehiclePayload(payload),
            status: VEHICLE_STATUSES.DRAFT,
            submittedAt: null,
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: null,
            updatedAt: now
        };
        const nextVehicles = ensureSinglePrimary(replaceVehicle(vehicles, updatedVehicle));
        const updatedProfile = await this.updateDriverVehiclesByAuthUserId(authContext.userId, {
            vehicles: nextVehicles,
            onboarding: syncOnboardingVehicleStep(driverProfile.onboarding, nextVehicles, now),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Vehicle updated successfully',
            data: {
                vehicles: toDriverVehicles(updatedProfile)
            }
        });
    }

    async deleteVehicle(authContext, vehicleId) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const vehicles = normalizeVehicles(driverProfile.vehicles);
        const vehicle = findVehicleById(vehicles, vehicleId);

        if (!vehicle) {
            throw AppError.notFound('Vehicle not found');
        }

        assertVehicleEditable(vehicle);

        const now = this.now();
        const nextVehicles = ensureSinglePrimary(vehicles.filter((item) => item.vehicleId !== vehicle.vehicleId));
        const updatedProfile = await this.updateDriverVehiclesByAuthUserId(authContext.userId, {
            vehicles: nextVehicles,
            onboarding: syncOnboardingVehicleStep(driverProfile.onboarding, nextVehicles, now),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Vehicle removed successfully',
            data: {
                vehicles: toDriverVehicles(updatedProfile)
            }
        });
    }

    async setPrimaryVehicle(authContext, vehicleId) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const vehicles = normalizeVehicles(driverProfile.vehicles);
        const vehicle = findVehicleById(vehicles, vehicleId);

        if (!vehicle) {
            throw AppError.notFound('Vehicle not found');
        }

        if (vehicle.status !== VEHICLE_STATUSES.APPROVED) {
            throw AppError.badRequest('Only approved vehicles can be set as primary');
        }

        const now = this.now();
        const nextVehicles = vehicles.map((item) => ({
            ...item,
            isPrimary: item.vehicleId === vehicle.vehicleId,
            updatedAt: item.vehicleId === vehicle.vehicleId ? now : item.updatedAt
        }));
        const updatedProfile = await this.updateDriverVehiclesByAuthUserId(authContext.userId, {
            vehicles: nextVehicles,
            service: syncServiceVehicleTypes(driverProfile.service, nextVehicles),
            onboarding: syncOnboardingVehicleStep(driverProfile.onboarding, nextVehicles, now),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Primary vehicle updated successfully',
            data: {
                vehicles: toDriverVehicles(updatedProfile)
            }
        });
    }

    async submitVehicle(authContext, vehicleId) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const vehicles = normalizeVehicles(driverProfile.vehicles);
        const vehicle = findVehicleById(vehicles, vehicleId);

        if (!vehicle) {
            throw AppError.notFound('Vehicle not found');
        }

        assertVehicleEditable(vehicle);
        assertVehicleReadyForSubmission(vehicle);

        const now = this.now();
        const submittedVehicle = {
            ...vehicle,
            status: VEHICLE_STATUSES.SUBMITTED,
            submittedAt: now,
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: null,
            updatedAt: now
        };
        const nextVehicles = ensureSinglePrimary(replaceVehicle(vehicles, submittedVehicle));
        const updatedProfile = await this.updateDriverVehiclesByAuthUserId(authContext.userId, {
            vehicles: nextVehicles,
            onboarding: syncOnboardingVehicleStep(driverProfile.onboarding, nextVehicles, now),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Vehicle submitted for review successfully',
            data: {
                vehicles: toDriverVehicles(updatedProfile)
            }
        });
    }

    async getReviewQueue(authContext, query = {}) {
        await this.getReviewerContext(authContext);

        const status = Object.values(VEHICLE_STATUSES).includes(query.status)
            ? query.status
            : VEHICLE_STATUSES.SUBMITTED;
        const profiles = await this.vehicleDao.findReviewQueue({
            status,
            limit: query.limit || 25
        });

        return buildSuccessResponse({
            message: 'Vehicle review queue fetched successfully',
            data: {
                reviewQueue: toVehicleReviewQueue(toPlainArray(profiles), status)
            }
        });
    }

    async reviewVehicle(authContext, driverId, vehicleId, payload) {
        const reviewer = await this.getReviewerContext(authContext);
        const driverProfile = normalizeDriverProfile(toPlainObject(await this.vehicleDao.findProfileById(driverId)));

        if (!driverProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        const vehicles = normalizeVehicles(driverProfile.vehicles);
        const vehicle = findVehicleById(vehicles, vehicleId);

        if (!vehicle) {
            throw AppError.badRequest('Vehicle has not been added by this driver');
        }

        assertReviewTransitionAllowed(vehicle, payload.status);

        const now = this.now();
        const reviewedVehicle = buildReviewedVehicle(vehicle, payload, {
            reviewerId: getId(reviewer),
            now,
            vehicles
        });
        const nextVehicles = ensureApprovedPrimary(replaceVehicle(vehicles, reviewedVehicle));
        const updatedProfile = await this.updateDriverVehiclesByProfileId(driverId, {
            vehicles: nextVehicles,
            service: syncServiceVehicleTypes(driverProfile.service, nextVehicles),
            onboarding: syncOnboardingVehicleStep(driverProfile.onboarding, nextVehicles, now),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Vehicle reviewed successfully',
            data: {
                vehicles: toDriverVehicles(updatedProfile)
            }
        });
    }

    async getDriverContext(authContext) {
        this.assertDriverReadContext(authContext);
        const authUser = toPlainObject(await this.vehicleDao.findDriverAuthUserById(authContext.userId));

        if (!authUser) {
            throw AppError.notFound('Driver account not found');
        }

        assertActivePrivateUser(authUser, 'Driver');

        const driverProfile = normalizeDriverProfile(toPlainObject(
            await this.vehicleDao.findProfileByAuthUserId(authContext.userId)
        ));

        if (!driverProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return {
            authUser,
            driverProfile
        };
    }

    async getReviewerContext(authContext) {
        this.assertReviewerContext(authContext);

        const privateUser = toPlainObject(await this.vehicleDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private reviewer account not found');
        }

        assertActivePrivateUser(privateUser, 'Private reviewer');

        return privateUser;
    }

    async updateDriverVehiclesByAuthUserId(authUserId, payload) {
        const updatedProfile = normalizeDriverProfile(toPlainObject(
            await this.vehicleDao.updateVehiclesByAuthUserId(authUserId, payload)
        ));

        if (!updatedProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return updatedProfile;
    }

    async updateDriverVehiclesByProfileId(profileId, payload) {
        const updatedProfile = normalizeDriverProfile(toPlainObject(
            await this.vehicleDao.updateVehiclesByProfileId(profileId, payload)
        ));

        if (!updatedProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return updatedProfile;
    }

    assertPrivateContext(authContext) {
        if (!authContext?.userId || !Object.values(PRIVATE_AUTH_ROLES).includes(authContext.role)) {
            throw AppError.forbidden('Private access is required');
        }

        return authContext;
    }

    assertDriverReadContext(authContext) {
        if (!authContext?.userId || authContext.role !== PRIVATE_AUTH_ROLES.DRIVER) {
            throw AppError.forbidden('Driver private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_READ)) {
            throw AppError.forbidden('Driver vehicles read permission is required');
        }

        return authContext;
    }

    assertDriverWriteContext(authContext) {
        this.assertDriverReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_WRITE)) {
            throw AppError.forbidden('Driver vehicles write permission is required');
        }
    }

    assertReviewerContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Vehicle review access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_VEHICLES_REVIEW)) {
            throw AppError.forbidden('Vehicle review permission is required');
        }
    }
}

const assertActivePrivateUser = (privateUser = {}, label) => {
    if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
        throw AppError.forbidden(`${label} account is ${privateUser.accountStatus}`);
    }
};

const assertVehicleEditable = (vehicle = {}) => {
    if (![VEHICLE_STATUSES.DRAFT, VEHICLE_STATUSES.REJECTED].includes(vehicle.status)) {
        throw AppError.badRequest('Only draft or rejected vehicles can be edited');
    }
};

const assertVehicleReadyForSubmission = (vehicle = {}) => {
    const missingFields = [
        ['type', vehicle.type],
        ['make', vehicle.make],
        ['model', vehicle.model],
        ['color', vehicle.color],
        ['registrationNumber', vehicle.registrationNumber]
    ]
        .filter(([, value]) => !value)
        .map(([field]) => field);

    if (missingFields.length) {
        throw AppError.badRequest(`Vehicle is missing required fields: ${missingFields.join(', ')}`);
    }
};

const assertReviewTransitionAllowed = (vehicle = {}, status) => {
    if (status === VEHICLE_REVIEW_STATUSES.SUSPENDED) {
        if (vehicle.status !== VEHICLE_STATUSES.APPROVED) {
            throw AppError.badRequest('Only approved vehicles can be suspended');
        }

        return;
    }

    if (vehicle.status !== VEHICLE_STATUSES.SUBMITTED) {
        throw AppError.badRequest('Vehicle is not submitted for review');
    }
};

const assertUniqueRegistrationNumber = (vehicles = [], registrationNumber, excludedVehicleId = null) => {
    const normalizedRegistrationNumber = normalizeRegistrationNumber(registrationNumber);
    const duplicateVehicle = vehicles.find((vehicle) => (
        vehicle.vehicleId !== excludedVehicleId
        && normalizeRegistrationNumber(vehicle.registrationNumber) === normalizedRegistrationNumber
    ));

    if (duplicateVehicle) {
        throw AppError.conflict('Vehicle registration number already exists for this driver');
    }
};

const normalizeDriverProfile = (driverProfile) => {
    if (!driverProfile) {
        return null;
    }

    return {
        ...driverProfile,
        service: normalizeService(driverProfile.service),
        onboarding: normalizeOnboarding(driverProfile.onboarding),
        vehicles: normalizeVehicles(driverProfile.vehicles)
    };
};

const normalizeService = (service = {}) => ({
    ...service,
    vehicleTypes: Array.isArray(service.vehicleTypes) ? service.vehicleTypes : []
});

const normalizeOnboarding = (onboarding = {}) => ({
    ...onboarding,
    steps: Array.isArray(onboarding.steps) ? onboarding.steps : []
});

const normalizeVehicles = (vehicles = []) => (Array.isArray(vehicles) ? vehicles : [])
    .filter((vehicle) => vehicle.vehicleId)
    .map((vehicle) => ({
        vehicleId: vehicle.vehicleId,
        type: vehicle.type || null,
        make: vehicle.make || null,
        model: vehicle.model || null,
        variant: vehicle.variant || null,
        color: vehicle.color || null,
        registrationNumber: normalizeRegistrationNumber(vehicle.registrationNumber),
        manufacturingYear: vehicle.manufacturingYear || null,
        ownershipType: vehicle.ownershipType || VEHICLE_OWNERSHIP_TYPES.OWNED,
        fuelType: vehicle.fuelType || VEHICLE_FUEL_TYPES.PETROL,
        insurance: normalizeComplianceDocument(vehicle.insurance),
        permit: normalizeComplianceDocument(vehicle.permit),
        fitness: normalizeComplianceDocument(vehicle.fitness),
        status: vehicle.status || VEHICLE_STATUSES.DRAFT,
        isPrimary: vehicle.isPrimary === true,
        submittedAt: vehicle.submittedAt || null,
        reviewedAt: vehicle.reviewedAt || null,
        reviewedBy: vehicle.reviewedBy || null,
        rejectionReason: vehicle.rejectionReason || null,
        notes: vehicle.notes || null,
        createdAt: vehicle.createdAt || null,
        updatedAt: vehicle.updatedAt || null
    }));

const normalizeComplianceDocument = (document = {}) => ({
    number: document?.number?.trim?.() || null,
    expiresAt: document?.expiresAt || null
});

const normalizeVehiclePayload = (payload = {}) => ({
    ...(payload.type !== undefined ? { type: payload.type } : {}),
    ...(payload.make !== undefined ? { make: payload.make.trim() } : {}),
    ...(payload.model !== undefined ? { model: payload.model.trim() } : {}),
    ...(payload.variant !== undefined ? { variant: payload.variant?.trim() || null } : {}),
    ...(payload.color !== undefined ? { color: payload.color.trim() } : {}),
    ...(payload.registrationNumber !== undefined ? { registrationNumber: normalizeRegistrationNumber(payload.registrationNumber) } : {}),
    ...(payload.manufacturingYear !== undefined ? { manufacturingYear: payload.manufacturingYear } : {}),
    ...(payload.ownershipType !== undefined ? { ownershipType: payload.ownershipType } : {}),
    ...(payload.fuelType !== undefined ? { fuelType: payload.fuelType } : {}),
    ...(payload.insurance !== undefined ? { insurance: normalizeComplianceDocument(payload.insurance) } : {}),
    ...(payload.permit !== undefined ? { permit: normalizeComplianceDocument(payload.permit) } : {}),
    ...(payload.fitness !== undefined ? { fitness: normalizeComplianceDocument(payload.fitness) } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes?.trim() || null } : {})
});

const buildVehicleItem = (payload, { now, isPrimary = false }) => ({
    vehicleId: createVehicleId(now),
    ...normalizeVehiclePayload(payload),
    status: VEHICLE_STATUSES.DRAFT,
    isPrimary,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now
});

const buildReviewedVehicle = (vehicle, payload, { reviewerId, now, vehicles }) => {
    const isApproved = payload.status === VEHICLE_REVIEW_STATUSES.APPROVED;
    const hasApprovedPrimaryVehicle = vehicles.some((item) => (
        item.vehicleId !== vehicle.vehicleId
        && item.status === VEHICLE_STATUSES.APPROVED
        && item.isPrimary
    ));

    return {
        ...vehicle,
        status: payload.status,
        isPrimary: isApproved ? vehicle.isPrimary || !hasApprovedPrimaryVehicle : false,
        reviewedAt: now,
        reviewedBy: reviewerId,
        rejectionReason: isApproved ? null : payload.rejectionReason.trim(),
        updatedAt: now
    };
};

const replaceVehicle = (vehicles = [], vehicle) => vehicles.map((item) => (
    item.vehicleId === vehicle.vehicleId ? vehicle : item
));

const ensureSinglePrimary = (vehicles = []) => {
    if (!vehicles.length) {
        return [];
    }

    const primaryVehicle = vehicles.find((vehicle) => vehicle.isPrimary) || vehicles[0];

    return vehicles.map((vehicle) => ({
        ...vehicle,
        isPrimary: vehicle.vehicleId === primaryVehicle.vehicleId
    }));
};

const ensureApprovedPrimary = (vehicles = []) => {
    const approvedVehicles = vehicles.filter((vehicle) => vehicle.status === VEHICLE_STATUSES.APPROVED);

    if (!approvedVehicles.length) {
        return vehicles.map((vehicle) => ({
            ...vehicle,
            isPrimary: false
        }));
    }

    const primaryVehicle = approvedVehicles.find((vehicle) => vehicle.isPrimary) || approvedVehicles[0];

    return vehicles.map((vehicle) => ({
        ...vehicle,
        isPrimary: vehicle.vehicleId === primaryVehicle.vehicleId
    }));
};

const syncServiceVehicleTypes = (service = {}, vehicles = []) => {
    const approvedVehicleTypes = uniqueStrings(
        vehicles
            .filter((vehicle) => vehicle.status === VEHICLE_STATUSES.APPROVED)
            .map((vehicle) => vehicle.type)
    );

    return {
        ...normalizeService(service),
        vehicleTypes: approvedVehicleTypes.length
            ? uniqueStrings([...normalizeService(service).vehicleTypes, ...approvedVehicleTypes])
            : normalizeService(service).vehicleTypes
    };
};

const syncOnboardingVehicleStep = (onboarding = {}, vehicles = [], now) => {
    const existingSteps = Array.isArray(onboarding.steps) ? onboarding.steps : [];
    const existingByKey = new Map(existingSteps.map((step) => [step.key, step]));
    const vehicleStepState = resolveVehicleOnboardingState(vehicles);

    return {
        ...onboarding,
        steps: DRIVER_ONBOARDING_STEP_CATALOG.map((catalogStep) => {
            const existingStep = existingByKey.get(catalogStep.key) || {};

            if (catalogStep.key !== DRIVER_ONBOARDING_STEP_KEYS.VEHICLE_PREFERENCE) {
                return {
                    ...catalogStep,
                    ...existingStep
                };
            }

            return {
                ...catalogStep,
                ...existingStep,
                status: vehicleStepState.status,
                note: vehicleStepState.note,
                completedAt: vehicleStepState.status === DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED
                    ? existingStep.completedAt || now
                    : null,
                updatedAt: now
            };
        })
    };
};

const resolveVehicleOnboardingState = (vehicles = []) => {
    if (vehicles.some((vehicle) => (
        vehicle.status === VEHICLE_STATUSES.APPROVED
        && vehicle.isPrimary
    ))) {
        return {
            status: DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED,
            note: 'Primary vehicle approved'
        };
    }

    if (vehicles.some((vehicle) => vehicle.status === VEHICLE_STATUSES.SUBMITTED)) {
        return {
            status: DRIVER_ONBOARDING_STEP_STATUSES.PENDING,
            note: 'Vehicle is under review'
        };
    }

    if (vehicles.some((vehicle) => vehicle.status === VEHICLE_STATUSES.REJECTED)) {
        return {
            status: DRIVER_ONBOARDING_STEP_STATUSES.REJECTED,
            note: 'Vehicle details need revision'
        };
    }

    if (vehicles.length) {
        return {
            status: DRIVER_ONBOARDING_STEP_STATUSES.PENDING,
            note: 'Submit vehicle for review'
        };
    }

    return {
        status: DRIVER_ONBOARDING_STEP_STATUSES.PENDING,
        note: null
    };
};

const findVehicleById = (vehicles = [], vehicleId) => vehicles.find((vehicle) => (
    vehicle.vehicleId === normalizeVehicleId(vehicleId)
));

const normalizeVehicleId = (vehicleId) => vehicleId?.toString?.().trim().toUpperCase();

const normalizeRegistrationNumber = (registrationNumber) => registrationNumber
    ?.toString?.()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ') || null;

const createVehicleId = (date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `VEH-${compactTimestamp}-${randomSuffix}`;
};

const uniqueStrings = (items = []) => [...new Set(items.filter(Boolean))];

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
