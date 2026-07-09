import z from 'zod';
import {
    SUPPORT_ATTACHMENT_TYPES,
    SUPPORT_CATEGORIES,
    SUPPORT_CHANNELS,
    SUPPORT_CONTACT_METHODS,
    SUPPORT_ENTITY_TYPES,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} from '../support.constants.js';

const nonEmptyString = z.string().trim().min(1);
const noteSchema = z.string().trim().max(240);

const attachmentSchema = z.object({
    type: z.enum(Object.values(SUPPORT_ATTACHMENT_TYPES)),
    label: z.string().trim().max(80).optional(),
    url: z.string().trim().url().max(500).optional(),
    note: noteSchema.optional(),
    capturedAt: z.coerce.date().optional()
}).refine(
    (item) => Boolean(item.url || item.note),
    { message: 'Attachment requires either url or note' }
);

const relatedEntitySchema = z.object({
    type: z.enum(Object.values(SUPPORT_ENTITY_TYPES)),
    id: z.string().trim().max(120).optional(),
    code: z.string().trim().max(80).optional()
}).strict().refine(
    (entity) => Boolean(entity.id || entity.code),
    { message: 'Related entity requires either id or code' }
);

const contactSchema = z.object({
    name: z.string().trim().max(80).optional(),
    email: z.string().trim().email().max(120).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    preferredContactMethod: z.enum(Object.values(SUPPORT_CONTACT_METHODS)).optional(),
    preferredContactWindow: z.string().trim().max(80).optional()
}).strict().refine(
    (contact) => Boolean(contact.email || contact.phone),
    { message: 'Contact requires either email or phone' }
);

export const supportFaqQuerySchema = z.object({
    query: z.object({
        category: z.enum(Object.values(SUPPORT_CATEGORIES)).optional(),
        q: z.string().trim().min(1).max(80).optional(),
        limit: z.coerce.number().int().min(1).max(30).default(20)
    })
});

export const supportFaqParamsSchema = z.object({
    params: z.object({
        faqId: nonEmptyString
    })
});

export const supportTicketQuerySchema = z.object({
    query: z.object({
        status: z.enum(Object.values(SUPPORT_STATUSES)).optional(),
        category: z.enum(Object.values(SUPPORT_CATEGORIES)).optional(),
        priority: z.enum(Object.values(SUPPORT_PRIORITIES)).optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20)
    })
});

export const supportTicketParamsSchema = z.object({
    params: z.object({
        ticketId: nonEmptyString
    })
});

export const createSupportTicketSchema = z.object({
    body: z.object({
        category: z.enum(Object.values(SUPPORT_CATEGORIES)),
        subject: z.string().trim().min(4).max(120),
        description: z.string().trim().min(10).max(1200),
        priority: z.enum(Object.values(SUPPORT_PRIORITIES)).optional(),
        channel: z.enum(Object.values(SUPPORT_CHANNELS)).optional(),
        contactMethod: z.enum(Object.values(SUPPORT_CONTACT_METHODS)).optional(),
        relatedEntity: relatedEntitySchema.optional(),
        contact: contactSchema.optional(),
        attachments: z.array(attachmentSchema).max(5).default([])
    }).refine(
        (body) => body.contactMethod !== SUPPORT_CONTACT_METHODS.CALLBACK || Boolean(body.contact?.phone),
        {
            path: ['contact', 'phone'],
            message: 'Callback support requests require a phone number'
        }
    ).refine(
        (body) => body.contactMethod !== SUPPORT_CONTACT_METHODS.EMAIL || Boolean(body.contact?.email),
        {
            path: ['contact', 'email'],
            message: 'Email support requests require an email address'
        }
    )
});

export const addSupportMessageSchema = z.object({
    params: z.object({
        ticketId: nonEmptyString
    }),
    body: z.object({
        message: z.string().trim().min(2).max(800),
        attachments: z.array(attachmentSchema).max(5).default([])
    })
});

export const closeSupportTicketSchema = z.object({
    params: z.object({
        ticketId: nonEmptyString
    }),
    body: z.object({
        note: noteSchema.optional()
    }).default({})
});

export const contactSupportSchema = z.object({
    body: z.object({
        category: z.enum(Object.values(SUPPORT_CATEGORIES)).default(SUPPORT_CATEGORIES.OTHER),
        subject: z.string().trim().min(4).max(120).optional(),
        message: z.string().trim().min(10).max(1200),
        contactMethod: z.enum(Object.values(SUPPORT_CONTACT_METHODS)).default(SUPPORT_CONTACT_METHODS.IN_APP),
        contact: contactSchema.optional(),
        relatedEntity: relatedEntitySchema.optional(),
        attachments: z.array(attachmentSchema).max(5).default([])
    }).refine(
        (body) => body.contactMethod !== SUPPORT_CONTACT_METHODS.CALLBACK || Boolean(body.contact?.phone),
        {
            path: ['contact', 'phone'],
            message: 'Callback contact requests require a phone number'
        }
    ).refine(
        (body) => body.contactMethod !== SUPPORT_CONTACT_METHODS.EMAIL || Boolean(body.contact?.email),
        {
            path: ['contact', 'email'],
            message: 'Email contact requests require an email address'
        }
    )
});
