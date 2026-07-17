import { DRIVER_VEHICLE_TYPES } from '../driver/driver.constants.js';

export const VEHICLE_STATUSES = Object.freeze({
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended'
});

export const VEHICLE_REVIEW_STATUSES = Object.freeze({
    APPROVED: VEHICLE_STATUSES.APPROVED,
    REJECTED: VEHICLE_STATUSES.REJECTED,
    SUSPENDED: VEHICLE_STATUSES.SUSPENDED
});

export const VEHICLE_OWNERSHIP_TYPES = Object.freeze({
    OWNED: 'owned',
    RENTED: 'rented',
    LEASED: 'leased',
    COMPANY: 'company'
});

export const VEHICLE_FUEL_TYPES = Object.freeze({
    PETROL: 'petrol',
    DIESEL: 'diesel',
    CNG: 'cng',
    ELECTRIC: 'electric',
    HYBRID: 'hybrid',
    NOT_APPLICABLE: 'not_applicable'
});

export const VEHICLE_TYPE_CATALOG = Object.freeze([
    Object.freeze({
        type: DRIVER_VEHICLE_TYPES.BIKE,
        label: 'Bike',
        seats: 1,
        requiresPermit: false
    }),
    Object.freeze({
        type: DRIVER_VEHICLE_TYPES.AUTO,
        label: 'Auto',
        seats: 3,
        requiresPermit: true
    }),
    Object.freeze({
        type: DRIVER_VEHICLE_TYPES.CAB_ECONOMY,
        label: 'Economy cab',
        seats: 4,
        requiresPermit: true
    }),
    Object.freeze({
        type: DRIVER_VEHICLE_TYPES.CAB_PREMIUM,
        label: 'Premium cab',
        seats: 6,
        requiresPermit: true
    })
]);
