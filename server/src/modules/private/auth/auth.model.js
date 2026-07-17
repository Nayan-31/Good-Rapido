import mongoose from 'mongoose';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from './auth.constants.js';

const privateAuthUserSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: Object.values(PRIVATE_AUTH_ROLES),
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
        employeeCode: {
            type: String,
            trim: true,
            uppercase: true
        },
        department: {
            type: String,
            trim: true,
            maxlength: 80
        },
        serviceZone: {
            type: String,
            trim: true,
            maxlength: 80
        },
        permissions: [{
            type: String,
            enum: Object.values(PRIVATE_AUTH_PERMISSIONS)
        }],
        accountStatus: {
            type: String,
            enum: Object.values(PRIVATE_AUTH_ACCOUNT_STATUSES),
            default: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
            index: true
        },
        passwordHash: {
            type: String,
            required: true,
            select: false
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
        collection: 'private_auth_users',
        timestamps: true,
        versionKey: false
    }
);

privateAuthUserSchema.pre('validate', function applyDefaultPermissions(next) {
    if (!Array.isArray(this.permissions) || this.permissions.length === 0) {
        this.permissions = [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[this.role] || [])];
    }

    next();
});

privateAuthUserSchema.index({ role: 1, phone: 1 }, { unique: true });
privateAuthUserSchema.index(
    { role: 1, email: 1 },
    {
        unique: true,
        partialFilterExpression: {
            email: { $exists: true, $type: 'string' }
        }
    }
);
privateAuthUserSchema.index(
    { role: 1, employeeCode: 1 },
    {
        unique: true,
        partialFilterExpression: {
            employeeCode: { $exists: true, $type: 'string' }
        }
    }
);

const PrivateAuthUser = mongoose.models.PrivateAuthUser
    || mongoose.model('PrivateAuthUser', privateAuthUserSchema);

export default PrivateAuthUser;
