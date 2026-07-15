import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ACCOUNT_STATUSES, AUTH_ROLES } from '../../public/auth/auth.constants.js';
import PublicTokenService from '../../public/auth/session/token.service.js';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_ROLES
} from '../../private/auth/auth.constants.js';
import PrivateTokenService from '../../private/auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    IDENTITY_DOCUMENT_STATUSES,
    IDENTITY_DOCUMENT_TYPES,
    IDENTITY_SCOPES,
    IDENTITY_STATUSES,
    IDENTITY_SUBJECT_ROLES
} from './identity.constants.js';
import { createIdentityRouter } from './identity.route.js';

const BASE_PATH = '/api/v1/core/identity';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createIdentityRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPublicUser = (role = AUTH_ROLES.RIDER, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: role === AUTH_ROLES.RIDER ? '+919111111111' : '+919222222222',
    accountStatus: AUTH_ACCOUNT_STATUSES.ACTIVE,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.ADMIN, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: role === PRIVATE_AUTH_ROLES.DRIVER ? '+919333333333' : '+919444444444',
    employeeCode: `${role.toUpperCase()}-001`,
    department: 'operations',
    serviceZone: 'kolkata',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createIdentity = (overrides = {}) => ({
    id: 'identity-id',
    _id: 'identity-id',
    subjectScope: IDENTITY_SCOPES.PUBLIC,
    subjectRole: IDENTITY_SUBJECT_ROLES.RIDER,
    subjectId: 'rider-id',
    fullName: 'rider User',
    email: 'rider@goodrapido.test',
    phone: '+919111111111',
    status: IDENTITY_STATUSES.DRAFT,
    documents: createRequiredRiderDocuments(),
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createIdentityDocument = (type, overrides = {}) => ({
    type,
    status: IDENTITY_DOCUMENT_STATUSES.UPLOADED,
    documentNumber: `${type}-001`,
    holderName: 'rider User',
    fileUrl: `https://cdn.goodrapido.test/${type}.jpg`,
    backFileUrl: null,
    issuedAt: null,
    expiresAt: null,
    uploadedAt: FIXED_NOW,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    notes: null,
    ...overrides
});

const createRequiredRiderDocuments = () => [
    createIdentityDocument(IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID),
    createIdentityDocument(IDENTITY_DOCUMENT_TYPES.PROFILE_PHOTO)
];

const createRequiredDriverDocuments = () => [
    createIdentityDocument(IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID),
    createIdentityDocument(IDENTITY_DOCUMENT_TYPES.DRIVING_LICENSE),
    createIdentityDocument(IDENTITY_DOCUMENT_TYPES.PROFILE_PHOTO)
];

const createIdentityPayload = () => ({
    documents: createRequiredRiderDocuments().map((document) => ({
        type: document.type,
        documentNumber: document.documentNumber,
        holderName: document.holderName,
        fileUrl: document.fileUrl,
        notes: document.notes || undefined
    }))
});

const createDependencies = () => ({
    identityDao: {
        findPublicUserById: jest.fn(),
        findPrivateUserById: jest.fn(),
        findBySubject: jest.fn(),
        create: jest.fn(),
        updateBySubject: jest.fn(),
        findById: jest.fn(),
        findReviewQueue: jest.fn(),
        updateById: jest.fn()
    },
    publicTokenService: new PublicTokenService(),
    privateTokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const publicAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.publicTokenService.signAccessToken(user)}`
});

const privateAuthHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.privateTokenService.signAccessToken(user)}`
});

describe('core identity routes', () => {
    let dependencies;
    let app;
    let riderUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        riderUser = createPublicUser();
    });

    test('options returns identity metadata for authenticated users', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.documentTypes).toContain(IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID);
        expect(response.body.data.options.subjectRoles).toContain(IDENTITY_SUBJECT_ROLES.DRIVER);
        expect(response.body.data.options.statuses).toContain(IDENTITY_STATUSES.SUBMITTED);
    });

    test('me returns a draft identity view when documents are not uploaded yet', async () => {
        dependencies.identityDao.findPublicUserById.mockResolvedValue(riderUser);
        dependencies.identityDao.findBySubject.mockResolvedValue(null);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/me`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.identity.status).toBe(IDENTITY_STATUSES.DRAFT);
        expect(response.body.data.identity.subject.role).toBe(AUTH_ROLES.RIDER);
        expect(response.body.data.identity.completion.missingRequiredTypes).toEqual([
            IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID,
            IDENTITY_DOCUMENT_TYPES.PROFILE_PHOTO
        ]);
    });

    test('user can save identity documents', async () => {
        dependencies.identityDao.findPublicUserById.mockResolvedValue(riderUser);
        dependencies.identityDao.findBySubject.mockResolvedValue(null);
        dependencies.identityDao.create.mockImplementation(async (payload) => ({
            ...payload,
            id: 'identity-id',
            _id: 'identity-id',
            createdAt: FIXED_NOW,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PUT',
            path: `${BASE_PATH}/me`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: createIdentityPayload()
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.data.identity.documents).toHaveLength(2);
        expect(response.body.data.identity.documents[0].status).toBe(IDENTITY_DOCUMENT_STATUSES.UPLOADED);
        expect(dependencies.identityDao.create).toHaveBeenCalledWith(expect.objectContaining({
            subjectScope: IDENTITY_SCOPES.PUBLIC,
            subjectRole: AUTH_ROLES.RIDER,
            subjectId: riderUser.id,
            status: IDENTITY_STATUSES.DRAFT,
            documents: expect.arrayContaining([
                expect.objectContaining({
                    type: IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID,
                    uploadedAt: FIXED_NOW
                })
            ])
        }));
    });

    test('submit rejects incomplete identity documents', async () => {
        dependencies.identityDao.findPublicUserById.mockResolvedValue(riderUser);
        dependencies.identityDao.findBySubject.mockResolvedValue(createIdentity({
            documents: [createIdentityDocument(IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID)]
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/me/submit`,
            headers: publicAuthHeaderFor(dependencies, riderUser)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('Upload required identity documents before submitting');
        expect(dependencies.identityDao.updateBySubject).not.toHaveBeenCalled();
    });

    test('driver can submit completed identity documents with a private token', async () => {
        const driverUser = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER);
        const driverIdentity = createIdentity({
            subjectScope: IDENTITY_SCOPES.PRIVATE,
            subjectRole: IDENTITY_SUBJECT_ROLES.DRIVER,
            subjectId: driverUser.id,
            fullName: driverUser.fullName,
            email: driverUser.email,
            phone: driverUser.phone,
            documents: createRequiredDriverDocuments()
        });

        dependencies.identityDao.findPrivateUserById.mockResolvedValue(driverUser);
        dependencies.identityDao.findBySubject.mockResolvedValue(driverIdentity);
        dependencies.identityDao.updateBySubject.mockImplementation(async (_scope, _role, _subjectId, payload) => ({
            ...driverIdentity,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/me/submit`,
            headers: privateAuthHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.identity.status).toBe(IDENTITY_STATUSES.SUBMITTED);
        expect(response.body.data.identity.submittedAt).toBe(FIXED_NOW.toISOString());
        expect(dependencies.identityDao.updateBySubject).toHaveBeenCalledWith(
            IDENTITY_SCOPES.PRIVATE,
            IDENTITY_SUBJECT_ROLES.DRIVER,
            driverUser.id,
            expect.objectContaining({
                status: IDENTITY_STATUSES.SUBMITTED,
                submittedAt: FIXED_NOW
            })
        );
    });

    test('review queue returns submitted identity verifications for trust reviewers', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);

        dependencies.identityDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.identityDao.findReviewQueue.mockResolvedValue([
            createIdentity({
                status: IDENTITY_STATUSES.SUBMITTED,
                submittedAt: FIXED_NOW
            })
        ]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/review-queue?limit=5`,
            headers: privateAuthHeaderFor(dependencies, adminUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.reviewQueue.summary.submitted).toBe(1);
        expect(dependencies.identityDao.findReviewQueue).toHaveBeenCalledWith({
            status: IDENTITY_STATUSES.SUBMITTED,
            subjectRole: undefined,
            limit: 5
        });
    });

    test('trust reviewer can verify a submitted identity', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);
        const submittedIdentity = createIdentity({
            status: IDENTITY_STATUSES.SUBMITTED,
            submittedAt: FIXED_NOW
        });

        dependencies.identityDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.identityDao.findById.mockResolvedValue(submittedIdentity);
        dependencies.identityDao.updateById.mockImplementation(async (_identityId, payload) => ({
            ...submittedIdentity,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/verifications/${submittedIdentity.id}/review`,
            headers: privateAuthHeaderFor(dependencies, adminUser),
            body: {
                status: IDENTITY_STATUSES.VERIFIED
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.identity.status).toBe(IDENTITY_STATUSES.VERIFIED);
        expect(response.body.data.identity.reviewedBy).toBe(adminUser.id);
        expect(response.body.data.identity.documents.every(
            (document) => document.status === IDENTITY_DOCUMENT_STATUSES.APPROVED
        )).toBe(true);
        expect(dependencies.identityDao.updateById).toHaveBeenCalledWith(
            submittedIdentity.id,
            expect.objectContaining({
                status: IDENTITY_STATUSES.VERIFIED,
                reviewedBy: adminUser.id,
                reviewedAt: FIXED_NOW
            })
        );
    });

    test('invalid document payload returns validation errors', async () => {
        const response = await injectRequest(app, {
            method: 'PUT',
            path: `${BASE_PATH}/me`,
            headers: publicAuthHeaderFor(dependencies, riderUser),
            body: {
                documents: [{
                    type: IDENTITY_DOCUMENT_TYPES.GOVERNMENT_ID,
                    fileUrl: 'not-a-url'
                }]
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });
});
