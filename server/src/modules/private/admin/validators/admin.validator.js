import z from 'zod';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../../auth/auth.constants.js';
import {
    ADMIN_USER_LIST_DEFAULT_LIMIT,
    ADMIN_USER_LIST_MAX_LIMIT
} from '../admin.constants.js';

const nonEmptyString = z.string().trim().min(1);

const optionalEmail = z.preprocess(
    (value) => {
        if (typeof value === 'string' && value.trim() === '') {
            return undefined;
        }

        return value;
    },
    z.string().trim().toLowerCase().email().optional()
);

const optionalCode = z.preprocess(
    (value) => {
        if (typeof value === 'string' && value.trim() === '') {
            return undefined;
        }

        return value;
    },
    z.string().trim().min(2).max(40).optional()
);

const permissionsSchema = z.array(z.enum(Object.values(PRIVATE_AUTH_PERMISSIONS))).min(1);

export const adminUserQuerySchema = z.object({
    query: z.object({
        role: z.enum(Object.values(PRIVATE_AUTH_ROLES)).optional(),
        accountStatus: z.enum(Object.values(PRIVATE_AUTH_ACCOUNT_STATUSES)).optional(),
        department: z.string().trim().min(1).max(80).optional(),
        serviceZone: z.string().trim().min(1).max(80).optional(),
        q: z.string().trim().min(1).max(120).optional(),
        limit: z.coerce.number().int().min(1).max(ADMIN_USER_LIST_MAX_LIMIT).default(ADMIN_USER_LIST_DEFAULT_LIMIT)
    })
});

export const adminUserParamsSchema = z.object({
    params: z.object({
        userId: nonEmptyString
    })
});

export const createAdminUserSchema = z.object({
    body: z.object({
        role: z.enum(Object.values(PRIVATE_AUTH_ROLES)),
        fullName: z.string().trim().min(2).max(80),
        email: optionalEmail,
        phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Phone number must be in E.164-like format'),
        employeeCode: optionalCode,
        department: z.string().trim().max(80).optional(),
        serviceZone: z.string().trim().max(80).optional(),
        permissions: permissionsSchema.optional(),
        accountStatus: z.enum(Object.values(PRIVATE_AUTH_ACCOUNT_STATUSES)).optional(),
        password: z.string().min(8).max(128)
    })
});

export const updateAdminUserSchema = z.object({
    params: z.object({
        userId: nonEmptyString
    }),
    body: z.object({
        fullName: z.string().trim().min(2).max(80).optional(),
        email: optionalEmail,
        phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Phone number must be in E.164-like format').optional(),
        employeeCode: optionalCode,
        department: z.string().trim().max(80).optional(),
        serviceZone: z.string().trim().max(80).optional(),
        permissions: permissionsSchema.optional(),
        accountStatus: z.enum(Object.values(PRIVATE_AUTH_ACCOUNT_STATUSES)).optional()
    }).refine(
        (body) => Object.values(body).some((value) => value !== undefined),
        { message: 'At least one user field is required' }
    )
});

export const updateAdminUserStatusSchema = z.object({
    params: z.object({
        userId: nonEmptyString
    }),
    body: z.object({
        accountStatus: z.enum(Object.values(PRIVATE_AUTH_ACCOUNT_STATUSES))
    })
});

export const updateAdminUserPermissionsSchema = z.object({
    params: z.object({
        userId: nonEmptyString
    }),
    body: z.object({
        permissions: permissionsSchema
    })
});
