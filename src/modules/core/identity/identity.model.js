import mongoose from 'mongoose';
import {
    IDENTITY_DOCUMENT_STATUSES,
    IDENTITY_DOCUMENT_TYPES,
    IDENTITY_SCOPES,
    IDENTITY_STATUSES,
    IDENTITY_SUBJECT_ROLES
} from './identity.constants.js';

const identityDocumentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(IDENTITY_DOCUMENT_TYPES),
            required: true
        },
        status: {
            type: String,
            enum: Object.values(IDENTITY_DOCUMENT_STATUSES),
            default: IDENTITY_DOCUMENT_STATUSES.UPLOADED,
            index: true
        },
        documentNumber: {
            type: String,
            trim: true,
            maxlength: 80
        },
        holderName: {
            type: String,
            trim: true,
            maxlength: 120
        },
        fileUrl: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        backFileUrl: {
            type: String,
            trim: true,
            maxlength: 500
        },
        issuedAt: {
            type: Date
        },
        expiresAt: {
            type: Date
        },
        uploadedAt: {
            type: Date,
            required: true
        },
        reviewedAt: {
            type: Date
        },
        reviewedBy: {
            type: String,
            trim: true,
            maxlength: 80
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 500
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 240
        }
    },
    { _id: false }
);

const identityVerificationSchema = new mongoose.Schema(
    {
        subjectScope: {
            type: String,
            enum: Object.values(IDENTITY_SCOPES),
            required: true,
            index: true
        },
        subjectRole: {
            type: String,
            enum: Object.values(IDENTITY_SUBJECT_ROLES),
            required: true,
            index: true
        },
        subjectId: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
            index: true
        },
        fullName: {
            type: String,
            trim: true,
            maxlength: 120
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: Object.values(IDENTITY_STATUSES),
            default: IDENTITY_STATUSES.DRAFT,
            index: true
        },
        documents: {
            type: [identityDocumentSchema],
            default: []
        },
        submittedAt: {
            type: Date
        },
        reviewedAt: {
            type: Date
        },
        reviewedBy: {
            type: String,
            trim: true,
            maxlength: 80
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    {
        collection: 'core_identity_verifications',
        timestamps: true,
        versionKey: false
    }
);

identityVerificationSchema.index(
    { subjectScope: 1, subjectRole: 1, subjectId: 1 },
    { unique: true }
);
identityVerificationSchema.index({ status: 1, submittedAt: 1, updatedAt: -1 });

const IdentityVerification = mongoose.models.IdentityVerification
    || mongoose.model('IdentityVerification', identityVerificationSchema);

export default IdentityVerification;
