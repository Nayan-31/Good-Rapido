import mongoose from 'mongoose';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from './auth.constants.js';

const authUserSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: Object.values(AUTH_ROLES),
            required: true,
            index: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true,
            select: false
        },
        accountStatus: {
            type: String,
            enum: Object.values(AUTH_ACCOUNT_STATUSES),
            default: AUTH_ACCOUNT_STATUSES.ACTIVE,
            index: true
        },
        refreshTokenHash: {
            type: String,
            select: false
        },
        lastLoginAt: {
            type: Date
        }
    },
    {
        collection: 'auth_users',
        timestamps: true,
        versionKey: false
    }
);

authUserSchema.index({ role: 1, phone: 1 }, { unique: true });
authUserSchema.index(
    { role: 1, email: 1 },
    {
        unique: true,
        partialFilterExpression: {
            email: { $exists: true, $type: 'string' }
        }
    }
);

const AuthUser = mongoose.models.AuthUser || mongoose.model('AuthUser', authUserSchema);

export default AuthUser;

/**
 * auth.model.js = database shape
 */