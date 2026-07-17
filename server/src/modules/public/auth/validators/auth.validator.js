import z from 'zod';

const optionalEmail = z.preprocess(
    (value) => {
        if (typeof value === 'string' && value.trim() === '') {
            return undefined;
        }

        return value;
    },
    z.string().trim().toLowerCase().email().optional()
);

export const registerSchema = z.object({
    body: z.object({
        fullName: z.string().trim().min(2).max(80),
        email: optionalEmail,
        phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Phone number must be in E.164-like format'),
        password: z.string().min(8).max(128)
    })
});

export const loginSchema = z.object({
    body: z.object({
        identifier: z.string().trim().min(3).max(120),
        password: z.string().min(1).max(128)
    })
});

export const tokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().trim().min(1).optional()
    }).default({})
});
