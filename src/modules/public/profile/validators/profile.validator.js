import z from 'zod';
import { PROFILE_GENDERS } from '../profile.constants.js';

const phoneSchema = z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Phone number must be in E.164-like format');
const nonEmptyPatch = (payload) => Object.keys(payload).length > 0;

const optionalString = (max) => z.preprocess(
    (value) => {
        if (typeof value === 'string' && value.trim() === '') {
            return undefined;
        }

        return value;
    },
    z.string().trim().max(max).optional()
);

const locationSchema = z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: 'Location must include latitude or longitude'
});

const savedAddressBody = {
    label: z.string().trim().min(2).max(40),
    addressLine: z.string().trim().min(3).max(180),
    city: optionalString(80),
    state: optionalString(80),
    country: optionalString(80),
    pincode: optionalString(20),
    location: locationSchema.optional(),
    isDefault: z.boolean().optional()
};

const emergencyContactBody = {
    name: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    relationship: optionalString(50)
};

export const updateProfileSchema = z.object({
    body: z.object({
        displayName: z.string().trim().min(2).max(80).optional(),
        avatarUrl: z.string().trim().url().optional(),
        dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must use YYYY-MM-DD format').optional(),
        gender: z.enum(Object.values(PROFILE_GENDERS)).optional()
    }).refine(nonEmptyPatch, {
        message: 'At least one profile field is required'
    })
});

export const updatePreferencesSchema = z.object({
    body: z.object({
        language: z.string().trim().min(2).max(10).optional(),
        notifications: z.object({
            sms: z.boolean().optional(),
            email: z.boolean().optional(),
            push: z.boolean().optional()
        }).refine(nonEmptyPatch, {
            message: 'At least one notification preference is required'
        }).optional()
    }).refine(nonEmptyPatch, {
        message: 'At least one preference field is required'
    })
});

export const addSavedAddressSchema = z.object({
    body: z.object(savedAddressBody)
});

export const updateSavedAddressSchema = z.object({
    params: z.object({
        addressId: z.string().trim().min(1)
    }),
    body: z.object({
        ...savedAddressBody,
        label: savedAddressBody.label.optional(),
        addressLine: savedAddressBody.addressLine.optional()
    }).refine(nonEmptyPatch, {
        message: 'At least one saved address field is required'
    })
});

export const savedAddressParamsSchema = z.object({
    params: z.object({
        addressId: z.string().trim().min(1)
    })
});

export const addEmergencyContactSchema = z.object({
    body: z.object(emergencyContactBody)
});

export const updateEmergencyContactSchema = z.object({
    params: z.object({
        contactId: z.string().trim().min(1)
    }),
    body: z.object({
        ...emergencyContactBody,
        name: emergencyContactBody.name.optional(),
        phone: emergencyContactBody.phone.optional()
    }).refine(nonEmptyPatch, {
        message: 'At least one emergency contact field is required'
    })
});

export const emergencyContactParamsSchema = z.object({
    params: z.object({
        contactId: z.string().trim().min(1)
    })
});
