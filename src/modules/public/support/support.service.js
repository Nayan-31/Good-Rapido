import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    SUPPORT_CATEGORY_CATALOG,
    SUPPORT_CHANNELS,
    SUPPORT_CONTACT_METHODS,
    SUPPORT_FAQ_CATALOG,
    SUPPORT_MESSAGE_SENDERS,
    SUPPORT_OPEN_STATUSES,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} from './support.constants.js';
import {
    toPublicFaq,
    toPublicFaqList,
    toPublicSupportGuidance,
    toPublicSupportOptions,
    toPublicSupportTicket,
    toPublicSupportTicketHistoryItem,
    toPublicSupportTicketSummary
} from './dto/support.dto.js';

export default class SupportService {
    constructor({ supportDao, now = () => new Date() }) {
        this.supportDao = supportDao;
        this.now = now;
    }

    options(authContext) {
        this.assertAuthContext(authContext);

        return buildSuccessResponse({
            message: 'Support options fetched successfully',
            data: {
                options: toPublicSupportOptions()
            }
        });
    }

    faqs(authContext, query = {}) {
        this.assertAuthContext(authContext);
        const faqs = filterFaqs(query);

        return buildSuccessResponse({
            message: 'Support FAQs fetched successfully',
            data: {
                faqs: toPublicFaqList(faqs),
                total: faqs.length
            }
        });
    }

    getFaq(authContext, faqId) {
        this.assertAuthContext(authContext);
        const faq = SUPPORT_FAQ_CATALOG.find((item) => item.id === faqId);

        if (!faq) {
            throw AppError.notFound('Support FAQ not found');
        }

        return buildSuccessResponse({
            message: 'Support FAQ fetched successfully',
            data: {
                faq: toPublicFaq(faq)
            }
        });
    }

    async summary(authContext) {
        const { userId, role } = this.assertAuthContext(authContext);
        const summary = await this.supportDao.findSummaryForUser(userId, role);

        return buildSuccessResponse({
            message: 'Support summary fetched successfully',
            data: {
                summary: toPublicSupportTicketSummary(normalizeSummary(summary))
            }
        });
    }

    async listTickets(authContext, query = {}) {
        const { userId, role } = this.assertAuthContext(authContext);
        const tickets = await this.supportDao.findForUser(userId, role, query);
        const plainTickets = tickets.map(toPlainObject);

        return buildSuccessResponse({
            message: 'Support tickets fetched successfully',
            data: {
                tickets: plainTickets.map(toPublicSupportTicketHistoryItem),
                summary: toPublicSupportTicketSummary(buildSummaryFromTickets(plainTickets))
            }
        });
    }

    async getTicket(authContext, ticketId) {
        const ticket = await this.findTicket(authContext, ticketId);

        return buildSuccessResponse({
            message: 'Support ticket fetched successfully',
            data: {
                ticket: toPublicSupportTicket(ticket),
                guidance: toPublicSupportGuidance(ticket)
            }
        });
    }

    async createTicket(authContext, payload) {
        const ticket = await this.createTicketRecord(authContext, payload);

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Support ticket created successfully',
            data: {
                ticket: toPublicSupportTicket(ticket),
                guidance: toPublicSupportGuidance(ticket)
            }
        });
    }

    async contact(authContext, payload) {
        const categoryProfile = resolveCategoryProfile(payload.category);
        const ticket = await this.createTicketRecord(authContext, {
            category: payload.category,
            subject: payload.subject || `Contact support: ${categoryProfile.label}`,
            description: payload.message,
            priority: categoryProfile.defaultPriority,
            channel: SUPPORT_CHANNELS.IN_APP,
            contactMethod: payload.contactMethod,
            contact: payload.contact,
            relatedEntity: payload.relatedEntity,
            attachments: payload.attachments,
            metadata: {
                source: 'contact_support'
            }
        });

        return buildSuccessResponse({
            statusCode: 201,
            message: 'Support contact request submitted successfully',
            data: {
                ticket: toPublicSupportTicket(ticket),
                guidance: toPublicSupportGuidance(ticket)
            }
        });
    }

    async addMessage(authContext, ticketId, payload) {
        const ticket = await this.findTicket(authContext, ticketId);

        if (!SUPPORT_OPEN_STATUSES.includes(ticket.status)) {
            throw AppError.badRequest('Only open support tickets can accept replies');
        }

        const messageAt = this.now();
        const { userId, role } = this.assertAuthContext(authContext);
        const message = {
            sender: SUPPORT_MESSAGE_SENDERS.USER,
            message: payload.message.trim(),
            attachments: normalizeAttachments(payload.attachments, messageAt),
            createdAt: messageAt
        };
        const updatedTicket = await this.supportDao.addMessage(ticketId, userId, role, {
            message,
            status: SUPPORT_STATUSES.WAITING_FOR_SUPPORT,
            latestActivityAt: messageAt
        });

        if (!updatedTicket) {
            throw AppError.notFound('Support ticket not found');
        }

        const ticketObject = toPlainObject(updatedTicket);

        return buildSuccessResponse({
            message: 'Support ticket reply added successfully',
            data: {
                ticket: toPublicSupportTicket(ticketObject),
                guidance: toPublicSupportGuidance(ticketObject)
            }
        });
    }

    async closeTicket(authContext, ticketId, payload = {}) {
        const ticket = await this.findTicket(authContext, ticketId);

        if (ticket.status === SUPPORT_STATUSES.CLOSED) {
            throw AppError.badRequest('Support ticket is already closed');
        }

        if (ticket.status === SUPPORT_STATUSES.CANCELLED) {
            throw AppError.badRequest('Cancelled support tickets cannot be closed');
        }

        const closedAt = this.now();
        const { userId, role } = this.assertAuthContext(authContext);
        const updatePayload = {
            status: SUPPORT_STATUSES.CLOSED,
            timeline: {
                ...ticket.timeline,
                closedAt
            },
            latestActivityAt: closedAt,
            ...(payload.note ? {
                messages: [
                    ...(ticket.messages || []),
                    {
                        sender: SUPPORT_MESSAGE_SENDERS.USER,
                        message: payload.note.trim(),
                        attachments: [],
                        createdAt: closedAt
                    }
                ]
            } : {})
        };
        const updatedTicket = await this.supportDao.updateByIdForUser(ticketId, userId, role, updatePayload);

        if (!updatedTicket) {
            throw AppError.notFound('Support ticket not found');
        }

        const ticketObject = toPlainObject(updatedTicket);

        return buildSuccessResponse({
            message: 'Support ticket closed successfully',
            data: {
                ticket: toPublicSupportTicket(ticketObject),
                guidance: toPublicSupportGuidance(ticketObject)
            }
        });
    }

    async createTicketRecord(authContext, payload) {
        const { userId, role } = this.assertAuthContext(authContext);
        const openedAt = this.now();
        const categoryProfile = resolveCategoryProfile(payload.category);
        const priority = payload.priority || categoryProfile.defaultPriority || SUPPORT_PRIORITIES.LOW;
        const ticketPayload = {
            ticketCode: createTicketCode(openedAt),
            authUserId: userId,
            role,
            category: payload.category,
            status: SUPPORT_STATUSES.OPEN,
            priority,
            channel: payload.channel || categoryProfile.suggestedChannel || SUPPORT_CHANNELS.IN_APP,
            contactMethod: payload.contactMethod || SUPPORT_CONTACT_METHODS.IN_APP,
            subject: payload.subject.trim(),
            description: payload.description.trim(),
            relatedEntity: normalizeRelatedEntity(payload.relatedEntity),
            contact: normalizeContact(payload.contact, payload.contactMethod),
            attachments: normalizeAttachments(payload.attachments, openedAt),
            messages: [{
                sender: SUPPORT_MESSAGE_SENDERS.USER,
                message: payload.description.trim(),
                attachments: [],
                createdAt: openedAt
            }],
            timeline: {
                openedAt,
                firstResponseDueAt: addHours(openedAt, categoryProfile.responseHours || 48),
                lastUserMessageAt: openedAt
            },
            latestActivityAt: openedAt,
            metadata: payload.metadata || {}
        };

        let ticket;

        try {
            ticket = await this.supportDao.create(ticketPayload);
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('Support ticket already exists');
            }

            throw err;
        }

        return toPlainObject(ticket);
    }

    async findTicket(authContext, ticketId) {
        const { userId, role } = this.assertAuthContext(authContext);
        const ticket = await this.supportDao.findByIdForUser(ticketId, userId, role);

        if (!ticket) {
            throw AppError.notFound('Support ticket not found');
        }

        return toPlainObject(ticket);
    }

    assertAuthContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        return authContext;
    }
}

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const resolveCategoryProfile = (category) => SUPPORT_CATEGORY_CATALOG.find((item) => item.category === category)
    || SUPPORT_CATEGORY_CATALOG.find((item) => item.category === 'other');

const normalizeAttachments = (attachments = [], submittedAt) => attachments.map((item) => ({
    type: item.type,
    label: item.label?.trim() || null,
    url: item.url?.trim() || null,
    note: item.note?.trim() || null,
    capturedAt: item.capturedAt || null,
    submittedAt
}));

const normalizeRelatedEntity = (entity = null) => entity ? {
    type: entity.type,
    id: entity.id?.trim() || null,
    code: entity.code?.trim() || null
} : null;

const normalizeContact = (contact = null, contactMethod = SUPPORT_CONTACT_METHODS.IN_APP) => contact ? {
    name: contact.name?.trim() || null,
    email: contact.email?.trim() || null,
    phone: contact.phone?.trim() || null,
    preferredContactMethod: contact.preferredContactMethod || contactMethod,
    preferredContactWindow: contact.preferredContactWindow?.trim() || null
} : null;

const createTicketCode = (date) => {
    const compactTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `SUP-${compactTimestamp}-${randomSuffix}`;
};

const filterFaqs = ({ category, q, limit = 20 } = {}) => {
    const normalizedQuery = q?.trim().toLowerCase();

    return SUPPORT_FAQ_CATALOG
        .filter((faq) => !category || faq.category === category)
        .filter((faq) => {
            if (!normalizedQuery) {
                return true;
            }

            const searchableText = [
                faq.title,
                faq.answer,
                ...(faq.tags || [])
            ].join(' ').toLowerCase();

            return searchableText.includes(normalizedQuery);
        })
        .slice(0, limit);
};

const normalizeSummary = (summary = {}) => {
    const totals = summary.totals?.[0] || summary;

    return {
        totalTickets: totals.totalTickets || 0,
        openCount: totals.openCount || 0,
        resolvedCount: totals.resolvedCount || 0,
        closedCount: totals.closedCount || 0,
        urgentCount: totals.urgentCount || 0,
        byStatus: rowsToCounts(summary.statuses),
        byCategory: rowsToCounts(summary.categories),
        latestActivityAt: totals.latestActivityAt || null
    };
};

const buildSummaryFromTickets = (tickets = []) => tickets.reduce((summary, ticket) => {
    summary.totalTickets += 1;
    summary.byStatus[ticket.status] = (summary.byStatus[ticket.status] || 0) + 1;
    summary.byCategory[ticket.category] = (summary.byCategory[ticket.category] || 0) + 1;
    summary.latestActivityAt = maxDate(summary.latestActivityAt, ticket.latestActivityAt);

    if (SUPPORT_OPEN_STATUSES.includes(ticket.status)) {
        summary.openCount += 1;
    }

    if (ticket.status === SUPPORT_STATUSES.RESOLVED) {
        summary.resolvedCount += 1;
    }

    if (ticket.status === SUPPORT_STATUSES.CLOSED) {
        summary.closedCount += 1;
    }

    if (ticket.priority === SUPPORT_PRIORITIES.URGENT) {
        summary.urgentCount += 1;
    }

    return summary;
}, {
    totalTickets: 0,
    openCount: 0,
    resolvedCount: 0,
    closedCount: 0,
    urgentCount: 0,
    byStatus: {},
    byCategory: {},
    latestActivityAt: null
});

const rowsToCounts = (rows = []) => rows.reduce((result, row) => ({
    ...result,
    [row._id]: row.count
}), {});

const maxDate = (left, right) => {
    if (!left) {
        return right || null;
    }

    if (!right) {
        return left;
    }

    return new Date(left) > new Date(right) ? left : right;
};

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);
