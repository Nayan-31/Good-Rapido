import mongoose from 'mongoose';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import {
    SUPPORT_ATTACHMENT_TYPES,
    SUPPORT_CATEGORIES,
    SUPPORT_CHANNELS,
    SUPPORT_CONTACT_METHODS,
    SUPPORT_ENTITY_TYPES,
    SUPPORT_MESSAGE_SENDERS,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} from './support.constants.js';

const relatedEntitySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(SUPPORT_ENTITY_TYPES)
        },
        id: {
            type: String,
            trim: true,
            maxlength: 120
        },
        code: {
            type: String,
            trim: true,
            maxlength: 80
        }
    },
    { _id: false }
);

const attachmentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(SUPPORT_ATTACHMENT_TYPES),
            required: true
        },
        label: {
            type: String,
            trim: true,
            maxlength: 80
        },
        url: {
            type: String,
            trim: true,
            maxlength: 500
        },
        note: {
            type: String,
            trim: true,
            maxlength: 240
        },
        submittedAt: {
            type: Date,
            required: true
        },
        capturedAt: {
            type: Date
        }
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: String,
            enum: Object.values(SUPPORT_MESSAGE_SENDERS),
            required: true
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 800
        },
        attachments: {
            type: [attachmentSchema],
            default: []
        },
        createdAt: {
            type: Date,
            required: true
        }
    },
    { _id: false }
);

const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            maxlength: 80
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 120
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 20
        },
        preferredContactMethod: {
            type: String,
            enum: Object.values(SUPPORT_CONTACT_METHODS)
        },
        preferredContactWindow: {
            type: String,
            trim: true,
            maxlength: 80
        }
    },
    { _id: false }
);

const timelineSchema = new mongoose.Schema(
    {
        openedAt: {
            type: Date,
            required: true
        },
        firstResponseDueAt: {
            type: Date
        },
        lastUserMessageAt: {
            type: Date
        },
        lastSupportMessageAt: {
            type: Date
        },
        resolvedAt: {
            type: Date
        },
        closedAt: {
            type: Date
        },
        cancelledAt: {
            type: Date
        }
    },
    { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
    {
        ticketCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },
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
        category: {
            type: String,
            enum: Object.values(SUPPORT_CATEGORIES),
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(SUPPORT_STATUSES),
            default: SUPPORT_STATUSES.OPEN,
            index: true
        },
        priority: {
            type: String,
            enum: Object.values(SUPPORT_PRIORITIES),
            default: SUPPORT_PRIORITIES.MEDIUM,
            index: true
        },
        channel: {
            type: String,
            enum: Object.values(SUPPORT_CHANNELS),
            default: SUPPORT_CHANNELS.IN_APP,
            index: true
        },
        contactMethod: {
            type: String,
            enum: Object.values(SUPPORT_CONTACT_METHODS),
            default: SUPPORT_CONTACT_METHODS.IN_APP
        },
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1200
        },
        relatedEntity: {
            type: relatedEntitySchema,
            default: null
        },
        contact: {
            type: contactSchema,
            default: null
        },
        attachments: {
            type: [attachmentSchema],
            default: []
        },
        messages: {
            type: [messageSchema],
            default: []
        },
        timeline: {
            type: timelineSchema,
            required: true
        },
        latestActivityAt: {
            type: Date,
            required: true,
            index: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        collection: 'public_support_tickets',
        timestamps: true,
        versionKey: false
    }
);

supportTicketSchema.index({ authUserId: 1, role: 1, latestActivityAt: -1 });
supportTicketSchema.index({ authUserId: 1, role: 1, status: 1, latestActivityAt: -1 });
supportTicketSchema.index({ authUserId: 1, role: 1, category: 1, latestActivityAt: -1 });

const SupportTicket = mongoose.models.SupportTicket
    || mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;
