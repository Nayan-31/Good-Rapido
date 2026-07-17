import z from 'zod';
import { DRIVER_VEHICLE_TYPES } from '../../driver/driver.constants.js';
import {
    VEHICLE_FUEL_TYPES,
    VEHICLE_OWNERSHIP_TYPES,
    VEHICLE_REVIEW_STATUSES,
    VEHICLE_STATUSES
} from '../vehicle.constants.js';

const currentYear = new Date().getFullYear();
const registrationNumberSchema = z.string()
    .trim()
    .min(5)
    .max(24)
    .transform((value) => value.toUpperCase().replace(/\s+/g, ' '));

const vehicleIdSchema = z.string().trim().min(3).max(40);

const complianceDocumentSchema = z.object({
    number: z.string().trim().min(2).max(80).optional(),
    expiresAt: z.coerce.date().optional()
}).strict();

const baseVehicleSchema = {
    type: z.enum(Object.values(DRIVER_VEHICLE_TYPES)),
    make: z.string().trim().min(2).max(80),
    model: z.string().trim().min(1).max(80),
    variant: z.string().trim().min(1).max(80).optional(),
    color: z.string().trim().min(2).max(40),
    registrationNumber: registrationNumberSchema,
    manufacturingYear: z.coerce.number().int().min(1990).max(currentYear + 1).optional(),
    ownershipType: z.enum(Object.values(VEHICLE_OWNERSHIP_TYPES)).optional(),
    fuelType: z.enum(Object.values(VEHICLE_FUEL_TYPES)).optional(),
    insurance: complianceDocumentSchema.optional(),
    permit: complianceDocumentSchema.optional(),
    fitness: complianceDocumentSchema.optional(),
    notes: z.string().trim().max(240).optional()
};

export const vehicleIdParamSchema = z.object({
    params: z.object({
        vehicleId: vehicleIdSchema
    })
});

export const createVehicleSchema = z.object({
    body: z.object(baseVehicleSchema).strict()
});

export const updateVehicleSchema = z.object({
    params: z.object({
        vehicleId: vehicleIdSchema
    }),
    body: z.object({
        type: baseVehicleSchema.type.optional(),
        make: baseVehicleSchema.make.optional(),
        model: baseVehicleSchema.model.optional(),
        variant: baseVehicleSchema.variant,
        color: baseVehicleSchema.color.optional(),
        registrationNumber: baseVehicleSchema.registrationNumber.optional(),
        manufacturingYear: baseVehicleSchema.manufacturingYear,
        ownershipType: baseVehicleSchema.ownershipType,
        fuelType: baseVehicleSchema.fuelType,
        insurance: baseVehicleSchema.insurance,
        permit: baseVehicleSchema.permit,
        fitness: baseVehicleSchema.fitness,
        notes: baseVehicleSchema.notes
    }).strict().refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one vehicle field is required' }
    )
});

export const reviewVehicleSchema = z.object({
    params: z.object({
        driverId: z.string().trim().min(1).max(80),
        vehicleId: vehicleIdSchema
    }),
    body: z.object({
        status: z.enum(Object.values(VEHICLE_REVIEW_STATUSES)),
        rejectionReason: z.string().trim().min(5).max(500).optional()
    }).strict().refine(
        (body) => body.status !== VEHICLE_STATUSES.REJECTED || Boolean(body.rejectionReason),
        { message: 'Rejection reason is required when rejecting a vehicle', path: ['rejectionReason'] }
    ).refine(
        (body) => body.status !== VEHICLE_STATUSES.SUSPENDED || Boolean(body.rejectionReason),
        { message: 'Suspension reason is required when suspending a vehicle', path: ['rejectionReason'] }
    )
});

export const vehicleReviewQueueSchema = z.object({
    query: z.object({
        status: z.string().trim().optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    }).strict()
});
