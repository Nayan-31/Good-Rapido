import {
    SUPPORT_ATTACHMENT_TYPES,
    SUPPORT_CATEGORIES,
    SUPPORT_CATEGORY_CATALOG,
    SUPPORT_CHANNELS,
    SUPPORT_CONTACT_METHODS,
    SUPPORT_ENTITY_TYPES,
    SUPPORT_FAQ_CATALOG,
    SUPPORT_OPEN_STATUSES,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} from '../support.constants.js';

export const toPublicSupportOptions = () => ({
    categories: SUPPORT_CATEGORY_CATALOG,
    statuses: Object.values(SUPPORT_STATUSES),
    priorities: Object.values(SUPPORT_PRIORITIES),
    channels: Object.values(SUPPORT_CHANNELS),
    contactMethods: Object.values(SUPPORT_CONTACT_METHODS),
    attachmentTypes: Object.values(SUPPORT_ATTACHMENT_TYPES),
    entityTypes: Object.values(SUPPORT_ENTITY_TYPES)
});

export const toPublicFaq = (faq = {}) => ({
    id: faq.id || null,
    category: faq.category || null,
    title: faq.title || null,
    answer: faq.answer || null,
    tags: Array.isArray(faq.tags) ? [...faq.tags] : [],
    relatedActions: Array.isArray(faq.relatedActions) ? [...faq.relatedActions] : []
});

export const toPublicFaqList = (faqs = SUPPORT_FAQ_CATALOG) => faqs.map(toPublicFaq);

export const toPublicSupportTicket = (ticket = {}) => ({
    id: getId(ticket),
    ticketCode: ticket.ticketCode,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    channel: ticket.channel,
    contactMethod: ticket.contactMethod,
    subject: ticket.subject || null,
    description: ticket.description || null,
    relatedEntity: toPublicRelatedEntity(ticket.relatedEntity),
    contact: toPublicContact(ticket.contact),
    attachments: toPublicAttachmentList(ticket.attachments),
    messages: toPublicMessages(ticket.messages),
    timeline: toPublicTimeline(ticket.timeline),
    latestActivityAt: ticket.latestActivityAt || null,
    metadata: ticket.metadata || {},
    createdAt: ticket.createdAt || null,
    updatedAt: ticket.updatedAt || null
});

export const toPublicSupportTicketHistoryItem = (ticket = {}) => ({
    id: getId(ticket),
    ticketCode: ticket.ticketCode,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    channel: ticket.channel,
    subject: ticket.subject || null,
    messageCount: Array.isArray(ticket.messages) ? ticket.messages.length : 0,
    attachmentCount: Array.isArray(ticket.attachments) ? ticket.attachments.length : 0,
    firstResponseDueAt: ticket.timeline?.firstResponseDueAt || null,
    latestActivityAt: ticket.latestActivityAt || ticket.updatedAt || null,
    createdAt: ticket.createdAt || null
});

export const toPublicSupportTicketSummary = (summary = {}) => ({
    totalTickets: numberOrZero(summary.totalTickets),
    openCount: numberOrZero(summary.openCount),
    resolvedCount: numberOrZero(summary.resolvedCount),
    closedCount: numberOrZero(summary.closedCount),
    urgentCount: numberOrZero(summary.urgentCount),
    byStatus: normalizeEnumCounts(summary.byStatus, Object.values(SUPPORT_STATUSES)),
    byCategory: normalizeEnumCounts(summary.byCategory, Object.values(SUPPORT_CATEGORIES)),
    latestActivityAt: summary.latestActivityAt || null
});

export const toPublicSupportGuidance = (ticket = {}) => ({
    isOpen: SUPPORT_OPEN_STATUSES.includes(ticket.status),
    canReply: SUPPORT_OPEN_STATUSES.includes(ticket.status),
    canClose: isClosableStatus(ticket.status),
    expectedFirstResponseBy: ticket.timeline?.firstResponseDueAt || null,
    nextAction: resolveNextAction(ticket)
});

const toPublicRelatedEntity = (entity = {}) => ({
    type: entity?.type || null,
    id: entity?.id || null,
    code: entity?.code || null
});

const toPublicContact = (contact = {}) => contact ? {
    name: contact.name || null,
    email: contact.email || null,
    phone: contact.phone || null,
    preferredContactMethod: contact.preferredContactMethod || null,
    preferredContactWindow: contact.preferredContactWindow || null
} : null;

const toPublicAttachmentList = (attachments = []) => Array.isArray(attachments)
    ? attachments.map((attachment) => ({
        type: attachment.type,
        label: attachment.label || null,
        url: attachment.url || null,
        note: attachment.note || null,
        submittedAt: attachment.submittedAt || null,
        capturedAt: attachment.capturedAt || null
    }))
    : [];

const toPublicMessages = (messages = []) => Array.isArray(messages)
    ? messages.map((message) => ({
        sender: message.sender,
        message: message.message || null,
        attachments: toPublicAttachmentList(message.attachments),
        createdAt: message.createdAt || null
    }))
    : [];

const toPublicTimeline = (timeline = {}) => ({
    openedAt: timeline?.openedAt || null,
    firstResponseDueAt: timeline?.firstResponseDueAt || null,
    lastUserMessageAt: timeline?.lastUserMessageAt || null,
    lastSupportMessageAt: timeline?.lastSupportMessageAt || null,
    resolvedAt: timeline?.resolvedAt || null,
    closedAt: timeline?.closedAt || null,
    cancelledAt: timeline?.cancelledAt || null
});

const resolveNextAction = (ticket = {}) => {
    if (ticket.status === SUPPORT_STATUSES.WAITING_FOR_USER) {
        return 'Reply with the requested details';
    }

    if (ticket.status === SUPPORT_STATUSES.WAITING_FOR_SUPPORT || ticket.status === SUPPORT_STATUSES.OPEN) {
        return 'Support will review the request and respond';
    }

    if (ticket.status === SUPPORT_STATUSES.RESOLVED) {
        return 'Close the ticket or create a new request if more help is needed';
    }

    if (ticket.status === SUPPORT_STATUSES.CLOSED) {
        return 'Ticket is closed';
    }

    if (ticket.status === SUPPORT_STATUSES.CANCELLED) {
        return 'Ticket was cancelled';
    }

    return 'No action required';
};

const normalizeEnumCounts = (counts = {}, keys = []) => keys.reduce((result, key) => ({
    ...result,
    [key]: numberOrZero(counts[key])
}), {});

const isClosableStatus = (status) => [
    ...SUPPORT_OPEN_STATUSES,
    SUPPORT_STATUSES.RESOLVED
].includes(status);

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const numberOrZero = (value) => Number.isFinite(value) ? value : 0;
