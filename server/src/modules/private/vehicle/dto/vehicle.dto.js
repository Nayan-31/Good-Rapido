import { DRIVER_VEHICLE_TYPES } from '../../driver/driver.constants.js';
import {
    VEHICLE_FUEL_TYPES,
    VEHICLE_OWNERSHIP_TYPES,
    VEHICLE_REVIEW_STATUSES,
    VEHICLE_STATUSES,
    VEHICLE_TYPE_CATALOG
} from '../vehicle.constants.js';

export const toVehicleOptions = () => ({
    vehicleTypes: Object.values(DRIVER_VEHICLE_TYPES),
    vehicleTypeCatalog: VEHICLE_TYPE_CATALOG,
    statuses: Object.values(VEHICLE_STATUSES),
    reviewStatuses: Object.values(VEHICLE_REVIEW_STATUSES),
    ownershipTypes: Object.values(VEHICLE_OWNERSHIP_TYPES),
    fuelTypes: Object.values(VEHICLE_FUEL_TYPES)
});

export const toDriverVehicles = (driverProfile = {}) => {
    const vehicles = normalizeVehicles(driverProfile.vehicles).map(toVehicleItem);
    const primaryVehicle = vehicles.find((vehicle) => vehicle.isPrimary) || null;

    return {
        vehicles,
        summary: {
            totalVehicles: vehicles.length,
            primaryVehicleId: primaryVehicle?.id || null,
            approvedVehicles: countByStatus(vehicles, VEHICLE_STATUSES.APPROVED),
            submittedVehicles: countByStatus(vehicles, VEHICLE_STATUSES.SUBMITTED),
            rejectedVehicles: countByStatus(vehicles, VEHICLE_STATUSES.REJECTED),
            suspendedVehicles: countByStatus(vehicles, VEHICLE_STATUSES.SUSPENDED)
        },
        guidance: {
            canAddVehicle: true,
            hasApprovedPrimaryVehicle: Boolean(primaryVehicle?.status === VEHICLE_STATUSES.APPROVED),
            nextAction: resolveDriverVehicleNextAction(vehicles, primaryVehicle)
        }
    };
};

export const toVehicleReviewQueue = (profiles = [], status = VEHICLE_STATUSES.SUBMITTED) => profiles.flatMap((profile) => {
    const submittedVehicles = normalizeVehicles(profile.vehicles)
        .filter((vehicle) => vehicle.status === status);

    return submittedVehicles.map((vehicle) => ({
        driver: {
            id: getId(profile),
            authUserId: getAuthUserId(profile),
            driverCode: profile.driverCode || null,
            displayName: profile.profile?.displayName || null,
            serviceZone: profile.service?.serviceZone || null
        },
        vehicle: toVehicleItem(vehicle)
    }));
});

const toVehicleItem = (vehicle = {}) => ({
    id: vehicle.vehicleId || null,
    type: vehicle.type || null,
    label: resolveVehicleTypeLabel(vehicle.type),
    make: vehicle.make || null,
    model: vehicle.model || null,
    variant: vehicle.variant || null,
    color: vehicle.color || null,
    registrationNumber: vehicle.registrationNumber || null,
    manufacturingYear: vehicle.manufacturingYear || null,
    ownershipType: vehicle.ownershipType || null,
    fuelType: vehicle.fuelType || null,
    insurance: toComplianceDocument(vehicle.insurance),
    permit: toComplianceDocument(vehicle.permit),
    fitness: toComplianceDocument(vehicle.fitness),
    status: vehicle.status || VEHICLE_STATUSES.DRAFT,
    isPrimary: vehicle.isPrimary === true,
    submittedAt: vehicle.submittedAt || null,
    reviewedAt: vehicle.reviewedAt || null,
    reviewedBy: vehicle.reviewedBy || null,
    rejectionReason: vehicle.rejectionReason || null,
    notes: vehicle.notes || null,
    createdAt: vehicle.createdAt || null,
    updatedAt: vehicle.updatedAt || null,
    guidance: {
        canEdit: [VEHICLE_STATUSES.DRAFT, VEHICLE_STATUSES.REJECTED].includes(vehicle.status),
        canSubmit: [VEHICLE_STATUSES.DRAFT, VEHICLE_STATUSES.REJECTED].includes(vehicle.status),
        canMakePrimary: vehicle.status === VEHICLE_STATUSES.APPROVED,
        requiresReview: vehicle.status === VEHICLE_STATUSES.SUBMITTED,
        needsRevision: vehicle.status === VEHICLE_STATUSES.REJECTED
    }
});

const toComplianceDocument = (document = {}) => ({
    number: document?.number || null,
    expiresAt: document?.expiresAt || null
});

const normalizeVehicles = (vehicles = []) => (Array.isArray(vehicles) ? vehicles : [])
    .map((vehicle) => ({
        ...vehicle,
        status: vehicle.status || VEHICLE_STATUSES.DRAFT
    }))
    .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
            return left.isPrimary ? -1 : 1;
        }

        return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
    });

const countByStatus = (vehicles = [], status) => vehicles
    .filter((vehicle) => vehicle.status === status)
    .length;

const resolveDriverVehicleNextAction = (vehicles = [], primaryVehicle) => {
    if (!vehicles.length) {
        return 'Add a vehicle';
    }

    if (primaryVehicle?.status === VEHICLE_STATUSES.APPROVED) {
        return 'Vehicle ready for rides';
    }

    if (vehicles.some((vehicle) => vehicle.status === VEHICLE_STATUSES.SUBMITTED)) {
        return 'Wait for vehicle review';
    }

    if (vehicles.some((vehicle) => vehicle.status === VEHICLE_STATUSES.REJECTED)) {
        return 'Revise rejected vehicle details';
    }

    return 'Submit a vehicle for review';
};

const resolveVehicleTypeLabel = (type) => VEHICLE_TYPE_CATALOG
    .find((item) => item.type === type)
    ?.label || null;

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const getAuthUserId = (document = {}) => document.authUserId?._id?.toString?.()
    || document.authUserId?.toString?.()
    || document.authUserId
    || null;
