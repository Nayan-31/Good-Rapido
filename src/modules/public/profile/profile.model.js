import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import { PROFILE_DEFAULT_PREFERENCES, PROFILE_GENDERS } from './profile.constants.js';

const savedAddressSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40
        },
        addressLine: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180
        },
        city: {
            type: String,
            trim: true,
            maxlength: 80
        },
        state: {
            type: String,
            trim: true,
            maxlength: 80
        },
        country: {
            type: String,
            trim: true,
            maxlength: 80
        },
        pincode: {
            type: String,
            trim: true,
            maxlength: 20
        },
        location: {
            latitude: {
                type: Number,
                min: -90,
                max: 90
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180
            }
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: true,
        timestamps: true
    }
);

const emergencyContactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        relationship: {
            type: String,
            trim: true,
            maxlength: 50
        }
    },
    {
        _id: true,
        timestamps: true
    }
);

const profileSchema = new mongoose.Schema(
    {
        authUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AuthUser',
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: Object.values(AUTH_ROLES),
            required: true,
            index: true
        },
        displayName: {
            type: String,
            trim: true,
            minlength: 2,
            maxlength: 80
        },
        avatarUrl: {
            type: String,
            trim: true
        },
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: Object.values(PROFILE_GENDERS)
        },
        savedAddresses: {
            type: [savedAddressSchema],
            default: []
        },
        emergencyContacts: {
            type: [emergencyContactSchema],
            default: []
        },
        preferences: {
            language: {
                type: String,
                default: PROFILE_DEFAULT_PREFERENCES.language,
                trim: true
            },
            notifications: {
                sms: {
                    type: Boolean,
                    default: PROFILE_DEFAULT_PREFERENCES.notifications.sms
                },
                email: {
                    type: Boolean,
                    default: PROFILE_DEFAULT_PREFERENCES.notifications.email
                },
                push: {
                    type: Boolean,
                    default: PROFILE_DEFAULT_PREFERENCES.notifications.push
                }
            }
        }
    },
    {
        collection: 'public_profiles',
        timestamps: true,
        versionKey: false
    }
);

profileSchema.index({ authUserId: 1, role: 1 }, { unique: true });

const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema);

export default Profile;
