import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ROLES } from '../auth/auth.constants.js';
import TokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    SUPPORT_ATTACHMENT_TYPES,
    SUPPORT_CATEGORIES,
    SUPPORT_CHANNELS,
    SUPPORT_CONTACT_METHODS,
    SUPPORT_OPEN_STATUSES,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} from './support.constants.js';
import { createSupportRouter } from './support.route.js';

const BASE_PATH = '/api/v1/public/support';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createSupportRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createUser = (role = AUTH_ROLES.RIDER) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role
});

const createSupportTicket = (overrides = {}) => ({
    id: 'support-ticket-id',
    _id: 'support-ticket-id',
    ticketCode: 'SUP-20260101081000-ABC123',
    authUserId: 'rider-id',
    role: AUTH_ROLES.RIDER,
    category: SUPPORT_CATEGORIES.FARE_PAYMENT,
    status: SUPPORT_STATUSES.OPEN,
    priority: SUPPORT_PRIORITIES.HIGH,
    channel: SUPPORT_CHANNELS.IN_APP,
    contactMethod: SUPPORT_CONTACT_METHODS.IN_APP,
    subject: 'Payment was deducted twice',
    description: 'My wallet was debited twice for the same ride payment',
    relatedEntity: {
        type: 'payment',
        id: 'payment-id',
        code: 'PAY-123'
    },
    contact: null,
    attachments: [{
        type: SUPPORT_ATTACHMENT_TYPES.RECEIPT,
        label: 'Payment receipt',
        url: 'https://example.com/receipt.png',
        note: null,
        submittedAt: FIXED_NOW,
        capturedAt: null
    }],
    messages: [{
        sender: 'user',
        message: 'My wallet was debited twice for the same ride payment',
        attachments: [],
        createdAt: FIXED_NOW
    }],
    timeline: {
        openedAt: FIXED_NOW,
        firstResponseDueAt: new Date('2026-01-01T20:10:00.000Z'),
        lastUserMessageAt: FIXED_NOW
    },
    latestActivityAt: FIXED_NOW,
    metadata: {},
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDependencies = () => ({
    supportDao: {
        addMessage: jest.fn(),
        create: jest.fn(),
        findByIdForUser: jest.fn(),
        findForUser: jest.fn(),
        findSummaryForUser: jest.fn(),
        updateByIdForUser: jest.fn()
    },
    tokenService: new TokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('public support routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('options returns support metadata', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.categories).toEqual(expect.arrayContaining([
            expect.objectContaining({
                category: SUPPORT_CATEGORIES.SAFETY,
                defaultPriority: SUPPORT_PRIORITIES.URGENT
            })
        ]));
        expect(response.body.data.options.contactMethods).toContain(SUPPORT_CONTACT_METHODS.CALLBACK);
        expect(response.body.data.options.attachmentTypes).toContain(SUPPORT_ATTACHMENT_TYPES.RECEIPT);
    });

    test('faqs can be filtered by category and search text', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/faqs?category=${SUPPORT_CATEGORIES.FARE_PAYMENT}&q=deducted`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.faqs).toEqual([
            expect.objectContaining({
                id: 'payment-deducted',
                category: SUPPORT_CATEGORIES.FARE_PAYMENT
            })
        ]);
    });

    test('single FAQ can be fetched by id', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/faqs/fare-breakdown`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.faq.title).toBe('How is my fare calculated?');
    });

    test('create ticket persists a user support case', async () => {
        const user = createUser();

        dependencies.supportDao.create.mockImplementation(async (payload) => createSupportTicket({
            ...payload,
            id: 'support-ticket-id',
            _id: 'support-ticket-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/tickets`,
            headers: authHeaderFor(dependencies, user),
            body: {
                category: SUPPORT_CATEGORIES.FARE_PAYMENT,
                subject: 'Payment was deducted twice',
                description: 'My wallet was debited twice for the same ride payment',
                priority: SUPPORT_PRIORITIES.HIGH,
                relatedEntity: {
                    type: 'payment',
                    id: 'payment-id',
                    code: 'PAY-123'
                },
                attachments: [{
                    type: SUPPORT_ATTACHMENT_TYPES.RECEIPT,
                    label: 'Payment receipt',
                    url: 'https://example.com/receipt.png'
                }]
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.ticket.status).toBe(SUPPORT_STATUSES.OPEN);
        expect(response.body.data.ticket.ticketCode).toMatch(/^SUP-/);
        expect(response.body.data.guidance.isOpen).toBe(true);
        expect(dependencies.supportDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: user.id,
            role: user.role,
            category: SUPPORT_CATEGORIES.FARE_PAYMENT,
            priority: SUPPORT_PRIORITIES.HIGH,
            subject: 'Payment was deducted twice'
        }));
    });

    test('list tickets returns ticket ledger and summary with filters', async () => {
        const user = createUser();

        dependencies.supportDao.findForUser.mockResolvedValue([
            createSupportTicket({
                authUserId: user.id,
                role: user.role
            }),
            createSupportTicket({
                id: 'closed-ticket-id',
                _id: 'closed-ticket-id',
                ticketCode: 'SUP-CLOSED',
                authUserId: user.id,
                role: user.role,
                category: SUPPORT_CATEGORIES.ACCOUNT_PROFILE,
                status: SUPPORT_STATUSES.CLOSED,
                priority: SUPPORT_PRIORITIES.MEDIUM,
                timeline: {
                    openedAt: FIXED_NOW,
                    closedAt: FIXED_NOW
                }
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/tickets?status=${SUPPORT_STATUSES.OPEN}&limit=5`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.tickets).toHaveLength(2);
        expect(response.body.data.summary.totalTickets).toBe(2);
        expect(response.body.data.summary.openCount).toBe(1);
        expect(response.body.data.summary.closedCount).toBe(1);
        expect(dependencies.supportDao.findForUser).toHaveBeenCalledWith(user.id, user.role, {
            status: SUPPORT_STATUSES.OPEN,
            limit: 5
        });
    });

    test('summary returns aggregate support health', async () => {
        const user = createUser();

        dependencies.supportDao.findSummaryForUser.mockResolvedValue({
            totals: [{
                totalTickets: 4,
                openCount: 2,
                resolvedCount: 1,
                closedCount: 1,
                urgentCount: 1,
                latestActivityAt: FIXED_NOW
            }],
            statuses: [
                { _id: SUPPORT_STATUSES.OPEN, count: 2 },
                { _id: SUPPORT_STATUSES.CLOSED, count: 1 }
            ],
            categories: [
                { _id: SUPPORT_CATEGORIES.FARE_PAYMENT, count: 2 },
                { _id: SUPPORT_CATEGORIES.SAFETY, count: 1 }
            ]
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/summary`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.summary.totalTickets).toBe(4);
        expect(response.body.data.summary.byStatus.open).toBe(2);
        expect(response.body.data.summary.byCategory.safety).toBe(1);
    });

    test('ticket details can be fetched by id', async () => {
        const user = createUser();

        dependencies.supportDao.findByIdForUser.mockResolvedValue(createSupportTicket({
            authUserId: user.id,
            role: user.role
        }));

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/tickets/support-ticket-id`,
            headers: authHeaderFor(dependencies, user)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ticket.ticketCode).toBe('SUP-20260101081000-ABC123');
        expect(response.body.data.ticket.attachments).toHaveLength(1);
        expect(response.body.data.guidance.canReply).toBe(true);
        expect(dependencies.supportDao.findByIdForUser).toHaveBeenCalledWith('support-ticket-id', user.id, user.role);
    });

    test('message can be added to open support tickets', async () => {
        const user = createUser();
        const ticket = createSupportTicket({
            authUserId: user.id,
            role: user.role,
            status: SUPPORT_STATUSES.WAITING_FOR_USER
        });

        dependencies.supportDao.findByIdForUser.mockResolvedValue(ticket);
        dependencies.supportDao.addMessage.mockImplementation(async (_ticketId, _userId, _role, payload) => createSupportTicket({
            ...ticket,
            status: payload.status,
            messages: [...ticket.messages, payload.message],
            timeline: {
                ...ticket.timeline,
                lastUserMessageAt: payload.latestActivityAt
            },
            latestActivityAt: payload.latestActivityAt
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/tickets/support-ticket-id/messages`,
            headers: authHeaderFor(dependencies, user),
            body: {
                message: 'Here is the payment reference number.',
                attachments: [{
                    type: SUPPORT_ATTACHMENT_TYPES.TEXT_NOTE,
                    note: 'Payment reference: PAY-123'
                }]
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ticket.status).toBe(SUPPORT_STATUSES.WAITING_FOR_SUPPORT);
        expect(response.body.data.ticket.messages).toHaveLength(2);
        expect(dependencies.supportDao.addMessage).toHaveBeenCalledWith('support-ticket-id', user.id, user.role, expect.objectContaining({
            status: SUPPORT_STATUSES.WAITING_FOR_SUPPORT,
            latestActivityAt: FIXED_NOW
        }));
    });

    test('closed tickets reject new user messages', async () => {
        const user = createUser();

        dependencies.supportDao.findByIdForUser.mockResolvedValue(createSupportTicket({
            authUserId: user.id,
            role: user.role,
            status: SUPPORT_STATUSES.CLOSED
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/tickets/support-ticket-id/messages`,
            headers: authHeaderFor(dependencies, user),
            body: {
                message: 'I still need help with this.'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Only open support tickets can accept replies');
        expect(dependencies.supportDao.addMessage).not.toHaveBeenCalled();
    });

    test('ticket can be closed by the user', async () => {
        const user = createUser();
        const ticket = createSupportTicket({
            authUserId: user.id,
            role: user.role,
            status: SUPPORT_STATUSES.RESOLVED
        });

        dependencies.supportDao.findByIdForUser.mockResolvedValue(ticket);
        dependencies.supportDao.updateByIdForUser.mockImplementation(async (_ticketId, _userId, _role, payload) => createSupportTicket({
            ...ticket,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/tickets/support-ticket-id/close`,
            headers: authHeaderFor(dependencies, user),
            body: {
                note: 'This is resolved now.'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.ticket.status).toBe(SUPPORT_STATUSES.CLOSED);
        expect(response.body.data.ticket.timeline.closedAt).toBe(FIXED_NOW.toISOString());
        expect(response.body.data.guidance.canReply).toBe(false);
    });

    test('contact request creates a support ticket with contact preferences', async () => {
        const user = createUser(AUTH_ROLES.PASSENGER);

        dependencies.supportDao.create.mockImplementation(async (payload) => createSupportTicket({
            ...payload,
            id: 'contact-ticket-id',
            _id: 'contact-ticket-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/contact`,
            headers: authHeaderFor(dependencies, user),
            body: {
                category: SUPPORT_CATEGORIES.SAFETY,
                message: 'I need a callback about a safety issue from my last ride.',
                contactMethod: SUPPORT_CONTACT_METHODS.CALLBACK,
                contact: {
                    phone: '+919999999999',
                    preferredContactWindow: 'Today evening'
                }
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.ticket.category).toBe(SUPPORT_CATEGORIES.SAFETY);
        expect(response.body.data.ticket.contact.preferredContactMethod).toBe(SUPPORT_CONTACT_METHODS.CALLBACK);
        expect(dependencies.supportDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: user.id,
            role: user.role,
            category: SUPPORT_CATEGORIES.SAFETY,
            contactMethod: SUPPORT_CONTACT_METHODS.CALLBACK,
            subject: 'Contact support: Safety'
        }));
    });

    test('support routes reject requests without an access token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Access token is required');
    });

    test('support routes return validation errors for invalid payloads', async () => {
        const user = createUser();

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/tickets`,
            headers: authHeaderFor(dependencies, user),
            body: {
                category: SUPPORT_CATEGORIES.FARE_PAYMENT,
                subject: 'Pay',
                description: 'short'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });

    test('open status catalog remains available to route consumers', () => {
        expect(SUPPORT_OPEN_STATUSES).toEqual([
            SUPPORT_STATUSES.OPEN,
            SUPPORT_STATUSES.WAITING_FOR_SUPPORT,
            SUPPORT_STATUSES.WAITING_FOR_USER
        ]);
    });
});
