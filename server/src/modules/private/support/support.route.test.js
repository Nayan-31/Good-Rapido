import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import PrivateTokenService from '../auth/session/token.service.js';
import {
    SUPPORT_ATTACHMENT_TYPES,
    SUPPORT_CATEGORIES,
    SUPPORT_CHANNELS,
    SUPPORT_CONTACT_METHODS,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} from '../../public/support/support.constants.js';
import { createPrivateSupportRouter } from './support.route.js';

const BASE_PATH = '/api/v1/private/support';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createPrivateSupportRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.DRIVER, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    ...overrides
});

const createSupportTicket = (overrides = {}) => ({
    id: 'support-ticket-id',
    _id: 'support-ticket-id',
    ticketCode: 'SUP-20260101081000-ABC123',
    authUserId: 'driver-id',
    role: PRIVATE_AUTH_ROLES.DRIVER,
    category: SUPPORT_CATEGORIES.FARE_PAYMENT,
    status: SUPPORT_STATUSES.OPEN,
    priority: SUPPORT_PRIORITIES.HIGH,
    channel: SUPPORT_CHANNELS.IN_APP,
    contactMethod: SUPPORT_CONTACT_METHODS.IN_APP,
    subject: 'Payout help needed',
    description: 'My driver payout has not moved to available balance.',
    relatedEntity: {
        type: 'payment',
        id: 'payout-id',
        code: 'PAY-123'
    },
    contact: null,
    attachments: [{
        type: SUPPORT_ATTACHMENT_TYPES.RECEIPT,
        label: 'Payout receipt',
        url: 'https://example.com/payout.png',
        note: null,
        submittedAt: FIXED_NOW,
        capturedAt: null
    }],
    messages: [{
        sender: 'user',
        message: 'My driver payout has not moved to available balance.',
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
        findAll: jest.fn(),
        findById: jest.fn(),
        findByIdForUser: jest.fn(),
        findForUser: jest.fn(),
        findSummary: jest.fn(),
        findSummaryForUser: jest.fn(),
        updateByIdForUser: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private support routes', () => {
    let dependencies;
    let app;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
    });

    test('driver list returns only driver-scoped support tickets', async () => {
        const driver = createPrivateUser();

        dependencies.supportDao.findForUser.mockResolvedValue([
            createSupportTicket({
                authUserId: driver.id,
                role: driver.role
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/tickets?status=${SUPPORT_STATUSES.OPEN}&limit=5`,
            headers: authHeaderFor(dependencies, driver)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.tickets).toHaveLength(1);
        expect(response.body.data.summary.openCount).toBe(1);
        expect(dependencies.supportDao.findForUser).toHaveBeenCalledWith(driver.id, driver.role, {
            status: SUPPORT_STATUSES.OPEN,
            limit: 5
        });
        expect(dependencies.supportDao.findAll).not.toHaveBeenCalled();
    });

    test('driver can create a private support ticket', async () => {
        const driver = createPrivateUser();

        dependencies.supportDao.create.mockImplementation(async (payload) => createSupportTicket({
            ...payload,
            id: 'created-ticket-id',
            _id: 'created-ticket-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/tickets`,
            headers: authHeaderFor(dependencies, driver),
            body: {
                category: SUPPORT_CATEGORIES.FARE_PAYMENT,
                subject: 'Payout help needed',
                description: 'My driver payout has not moved to available balance.',
                priority: SUPPORT_PRIORITIES.HIGH,
                relatedEntity: {
                    type: 'payment',
                    id: 'payout-id',
                    code: 'PAY-123'
                }
            }
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.ticket.role).toBeUndefined();
        expect(response.body.data.ticket.status).toBe(SUPPORT_STATUSES.OPEN);
        expect(dependencies.supportDao.create).toHaveBeenCalledWith(expect.objectContaining({
            authUserId: driver.id,
            role: PRIVATE_AUTH_ROLES.DRIVER,
            subject: 'Payout help needed'
        }));
    });

    test('ops summary reads global support aggregates', async () => {
        const ops = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);

        dependencies.supportDao.findSummary.mockResolvedValue({
            totals: [{
                totalTickets: 6,
                openCount: 3,
                resolvedCount: 2,
                closedCount: 1,
                urgentCount: 1,
                latestActivityAt: FIXED_NOW
            }],
            statuses: [
                { _id: SUPPORT_STATUSES.OPEN, count: 3 },
                { _id: SUPPORT_STATUSES.RESOLVED, count: 2 }
            ],
            categories: [
                { _id: SUPPORT_CATEGORIES.SAFETY, count: 1 },
                { _id: SUPPORT_CATEGORIES.FARE_PAYMENT, count: 5 }
            ]
        });

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/summary`,
            headers: authHeaderFor(dependencies, ops)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.summary.totalTickets).toBe(6);
        expect(response.body.data.summary.byCategory.safety).toBe(1);
        expect(dependencies.supportDao.findSummary).toHaveBeenCalledTimes(1);
        expect(dependencies.supportDao.findSummaryForUser).not.toHaveBeenCalled();
    });

    test('admin can list global support tickets with filters', async () => {
        const admin = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        dependencies.supportDao.findAll.mockResolvedValue([
            createSupportTicket(),
            createSupportTicket({
                id: 'rider-support-id',
                _id: 'rider-support-id',
                ticketCode: 'SUP-RIDER',
                authUserId: 'rider-id',
                role: 'rider',
                status: SUPPORT_STATUSES.WAITING_FOR_SUPPORT,
                priority: SUPPORT_PRIORITIES.URGENT
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/tickets?priority=${SUPPORT_PRIORITIES.URGENT}&limit=10`,
            headers: authHeaderFor(dependencies, admin)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.tickets).toHaveLength(2);
        expect(response.body.data.summary.urgentCount).toBe(1);
        expect(dependencies.supportDao.findAll).toHaveBeenCalledWith({
            priority: SUPPORT_PRIORITIES.URGENT,
            limit: 10
        });
    });

    test('private support routes reject requests without a private token', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/tickets`
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Private access token is required');
    });
});
