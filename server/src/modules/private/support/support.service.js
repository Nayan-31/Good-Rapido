import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import { SUPPORT_OPEN_STATUSES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from '../../public/support/support.constants.js';
import {
    toPublicSupportGuidance,
    toPublicSupportOptions,
    toPublicSupportTicket,
    toPublicSupportTicketHistoryItem,
    toPublicSupportTicketSummary
} from '../../public/support/dto/support.dto.js';
import SupportService from '../../public/support/support.service.js';
import { PRIVATE_AUTH_ROLES } from '../auth/auth.constants.js';

export default class PrivateSupportService {
    constructor({ supportDao, now = () => new Date() }) {
        this.supportDao = supportDao;
        this.userSupportService = new SupportService({ supportDao, now });
    }

    options(authContext) {
        this.assertPrivateSupportContext(authContext);

        return buildSuccessResponse({
            message: 'Private support options fetched successfully',
            data: {
                options: toPublicSupportOptions()
            }
        });
    }

    async summary(authContext) {
        this.assertPrivateSupportContext(authContext);

        if (!isOperatorContext(authContext)) {
            return this.userSupportService.summary(authContext);
        }

        const summary = await this.supportDao.findSummary();

        return buildSuccessResponse({
            message: 'Private support summary fetched successfully',
            data: {
                summary: toPublicSupportTicketSummary(normalizeSummary(summary))
            }
        });
    }

    async listTickets(authContext, query = {}) {
        this.assertPrivateSupportContext(authContext);

        if (!isOperatorContext(authContext)) {
            return this.userSupportService.listTickets(authContext, query);
        }

        const tickets = await this.supportDao.findAll(query);
        const plainTickets = tickets.map(toPlainObject);

        return buildSuccessResponse({
            message: 'Private support tickets fetched successfully',
            data: {
                tickets: plainTickets.map(toPublicSupportTicketHistoryItem),
                summary: toPublicSupportTicketSummary(buildSummaryFromTickets(plainTickets))
            }
        });
    }

    async getTicket(authContext, ticketId) {
        this.assertPrivateSupportContext(authContext);

        if (!isOperatorContext(authContext)) {
            return this.userSupportService.getTicket(authContext, ticketId);
        }

        const ticket = await this.supportDao.findById(ticketId);

        if (!ticket) {
            throw AppError.notFound('Support ticket not found');
        }

        const ticketObject = toPlainObject(ticket);

        return buildSuccessResponse({
            message: 'Private support ticket fetched successfully',
            data: {
                ticket: toPublicSupportTicket(ticketObject),
                guidance: toPublicSupportGuidance(ticketObject)
            }
        });
    }

    createTicket(authContext, payload) {
        this.assertPrivateSupportContext(authContext);

        return this.userSupportService.createTicket(authContext, payload);
    }

    addMessage(authContext, ticketId, payload) {
        this.assertPrivateSupportContext(authContext);

        return this.userSupportService.addMessage(authContext, ticketId, payload);
    }

    closeTicket(authContext, ticketId, payload) {
        this.assertPrivateSupportContext(authContext);

        return this.userSupportService.closeTicket(authContext, ticketId, payload);
    }

    assertPrivateSupportContext(authContext) {
        if (!authContext?.userId || !authContext?.role) {
            throw AppError.unauthorized();
        }

        if (!Object.values(PRIVATE_AUTH_ROLES).includes(authContext.role)) {
            throw AppError.forbidden('You do not have access to private support');
        }

        return authContext;
    }
}

const isOperatorContext = (authContext = {}) => [
    PRIVATE_AUTH_ROLES.ADMIN,
    PRIVATE_AUTH_ROLES.OPS
].includes(authContext.role);

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

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
