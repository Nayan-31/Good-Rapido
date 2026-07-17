import z from 'zod';
import {
    DRIVER_CONTACT_CHANNELS,
    DRIVER_ONBOARDING_STEP_KEYS,
    DRIVER_ONBOARDING_STEP_STATUSES,
    DRIVER_VEHICLE_TYPES
} from '../driver.constants.js';

const languageSchema = z.string().trim().min(2).max(40);

const publicProfileSchema = z.object({
    displayName: z.string().trim().min(2).max(80).optional(),
    bio: z.string().trim().max(300).optional(),
    profilePhotoUrl: z.string().trim().url().max(500).optional(),
    languages: z.array(languageSchema).max(8).optional()
}).strict();

const serviceProfileSchema = z.object({
    serviceZone: z.string().trim().min(1).max(80).optional(),
    vehicleTypes: z.array(z.enum(Object.values(DRIVER_VEHICLE_TYPES))).max(4).optional(),
    experienceYears: z.coerce.number().int().min(0).max(60).optional(),
    preferredRadiusKm: z.coerce.number().min(1).max(100).optional()
}).strict();

const onboardingStepSchema = z.object({
    key: z.enum(Object.values(DRIVER_ONBOARDING_STEP_KEYS)),
    status: z.enum(Object.values(DRIVER_ONBOARDING_STEP_STATUSES)),
    note: z.string().trim().max(240).optional(),
    completedAt: z.coerce.date().optional()
}).strict();

export const updateDriverProfileSchema = z.object({
    body: z.object({
        profile: publicProfileSchema.optional(),
        service: serviceProfileSchema.optional()
    }).refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one driver profile field is required' }
    )
});

export const updateDriverOnboardingSchema = z.object({
    body: z.object({
        steps: z.array(onboardingStepSchema).min(1).max(6)
    })
});

export const updateDriverAccountControlsSchema = z.object({
    body: z.object({
        rideRequestsEnabled: z.boolean().optional(),
        marketingOptIn: z.boolean().optional(),
        safetyTrainingAccepted: z.boolean().optional(),
        preferredContactChannel: z.enum(Object.values(DRIVER_CONTACT_CHANNELS)).optional()
    }).refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one account control field is required' }
    )
});

export const requestDriverDeactivationSchema = z.object({
    body: z.object({
        reason: z.string().trim().min(10).max(500).optional()
    }).default({})
});
