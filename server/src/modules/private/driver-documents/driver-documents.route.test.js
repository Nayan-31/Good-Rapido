import express from 'express';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
    DEFAULT_PRIVATE_ROLE_PERMISSIONS,
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import PrivateTokenService from '../auth/session/token.service.js';
import { errorMiddleware, notFoundMiddleware } from '../../../shared/middlewares/error.middleware.js';
import { injectRequest } from '../../../shared/test/httpTestClient.js';
import {
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_KEYS,
    DRIVER_ONBOARDING_STEP_STATUSES,
    DRIVER_ONBOARDING_STATUSES
} from '../driver/driver.constants.js';
import {
    DRIVER_DOCUMENT_COLLECTION_STATUSES,
    DRIVER_DOCUMENT_STATUSES,
    DRIVER_DOCUMENT_TYPES,
    DRIVER_REQUIRED_DOCUMENT_TYPES
} from './driver-documents.constants.js';
import { createDriverDocumentsRouter } from './driver-documents.route.js';

const BASE_PATH = '/api/v1/private/driver-documents';
const FIXED_NOW = new Date('2026-01-01T08:10:00.000Z');
const DOCUMENT_URL = 'https://cdn.goodrapido.test/driver/document-front.jpg';

const createTestApp = (dependencies) => {
    const app = express();

    app.use(express.json());
    app.use(BASE_PATH, createDriverDocumentsRouter(dependencies));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
};

const createPrivateUser = (role = PRIVATE_AUTH_ROLES.DRIVER, overrides = {}) => ({
    id: `${role}-id`,
    _id: `${role}-id`,
    role,
    fullName: `${role} User`,
    email: `${role}@goodrapido.test`,
    phone: '+919111111111',
    employeeCode: role === PRIVATE_AUTH_ROLES.DRIVER ? 'DRV-001' : `${role.toUpperCase()}-001`,
    department: role === PRIVATE_AUTH_ROLES.DRIVER ? 'driver_network' : 'operations',
    serviceZone: 'kolkata',
    permissions: [...(DEFAULT_PRIVATE_ROLE_PERMISSIONS[role] || [])],
    accountStatus: PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createDriverProfile = (overrides = {}) => ({
    id: 'driver-profile-id',
    _id: 'driver-profile-id',
    authUserId: 'driver-id',
    driverCode: 'DRV-001',
    profile: {
        displayName: 'Driver User'
    },
    service: {
        serviceZone: 'kolkata'
    },
    onboarding: {
        status: DRIVER_ONBOARDING_STATUSES.IN_PROGRESS,
        steps: createOnboardingSteps()
    },
    documents: createDocumentCollection(),
    latestActivityAt: FIXED_NOW,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides
});

const createOnboardingSteps = () => DRIVER_ONBOARDING_STEP_CATALOG.map((step) => ({
    ...step,
    status: DRIVER_ONBOARDING_STEP_STATUSES.PENDING,
    note: null,
    completedAt: null,
    updatedAt: null
}));

const createDocumentCollection = (overrides = {}) => ({
    status: DRIVER_DOCUMENT_COLLECTION_STATUSES.NOT_STARTED,
    items: [],
    submittedAt: null,
    reviewedAt: null,
    rejectionReason: null,
    ...overrides
});

const createDocumentItem = (type, overrides = {}) => ({
    type,
    status: DRIVER_DOCUMENT_STATUSES.UPLOADED,
    documentNumber: `${type}-001`,
    holderName: 'Driver User',
    fileUrl: `https://cdn.goodrapido.test/${type}.jpg`,
    backFileUrl: null,
    issuedAt: null,
    expiresAt: null,
    uploadedAt: FIXED_NOW,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    notes: null,
    ...overrides
});

const createCompleteDocumentItems = (status = DRIVER_DOCUMENT_STATUSES.UPLOADED) => DRIVER_REQUIRED_DOCUMENT_TYPES.map((type) => (
    createDocumentItem(type, { status })
));

const createDependencies = () => ({
    driverDocumentsDao: {
        findPrivateUserById: jest.fn(),
        findDriverAuthUserById: jest.fn(),
        findProfileByAuthUserId: jest.fn(),
        findProfileById: jest.fn(),
        findReviewQueue: jest.fn(),
        updateDriverDocumentsByAuthUserId: jest.fn(),
        updateDriverDocumentsByProfileId: jest.fn()
    },
    tokenService: new PrivateTokenService(),
    now: () => FIXED_NOW
});

const authHeaderFor = (dependencies, user) => ({
    authorization: `Bearer ${dependencies.tokenService.signAccessToken(user)}`
});

describe('private driver document routes', () => {
    let dependencies;
    let app;
    let driverUser;

    beforeEach(() => {
        dependencies = createDependencies();
        app = createTestApp(dependencies);
        driverUser = createPrivateUser();
    });

    test('options returns document metadata', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/options`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.options.documentTypes).toContain(DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE);
        expect(response.body.data.options.requiredDocumentTypes).toContain(DRIVER_DOCUMENT_TYPES.IDENTITY_PROOF);
        expect(response.body.data.options.collectionStatuses).toContain(DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED);
    });

    test('documents returns required missing document guidance', async () => {
        dependencies.driverDocumentsDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDocumentsDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile());

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/documents`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.documents.status).toBe(DRIVER_DOCUMENT_COLLECTION_STATUSES.NOT_STARTED);
        expect(response.body.data.documents.completion.missingRequiredTypes).toEqual(DRIVER_REQUIRED_DOCUMENT_TYPES);
        expect(response.body.data.documents.guidance.nextAction).toBe('Upload all required documents');
    });

    test('driver can upload a document before submission', async () => {
        const profile = createDriverProfile();

        dependencies.driverDocumentsDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDocumentsDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.driverDocumentsDao.updateDriverDocumentsByAuthUserId.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload,
            updatedAt: FIXED_NOW
        }));

        const response = await injectRequest(app, {
            method: 'PUT',
            path: `${BASE_PATH}/documents/${DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE}`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                documentNumber: 'WB-2026-0001',
                holderName: 'Driver User',
                fileUrl: DOCUMENT_URL,
                expiresAt: '2031-01-01T00:00:00.000Z',
                notes: 'Front side uploaded'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.documents.status).toBe(DRIVER_DOCUMENT_COLLECTION_STATUSES.IN_PROGRESS);
        expect(response.body.data.documents.documents.find(
            (item) => item.type === DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE
        ).status).toBe(DRIVER_DOCUMENT_STATUSES.UPLOADED);
        expect(dependencies.driverDocumentsDao.updateDriverDocumentsByAuthUserId).toHaveBeenCalledWith(
            driverUser.id,
            expect.objectContaining({
                documents: expect.objectContaining({
                    status: DRIVER_DOCUMENT_COLLECTION_STATUSES.IN_PROGRESS,
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            type: DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE,
                            fileUrl: DOCUMENT_URL,
                            uploadedAt: FIXED_NOW
                        })
                    ])
                }),
                latestActivityAt: FIXED_NOW
            })
        );
    });

    test('submit rejects missing required documents', async () => {
        dependencies.driverDocumentsDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDocumentsDao.findProfileByAuthUserId.mockResolvedValue(createDriverProfile({
            documents: createDocumentCollection({
                status: DRIVER_DOCUMENT_COLLECTION_STATUSES.IN_PROGRESS,
                items: [createDocumentItem(DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE)]
            })
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/submit`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('Upload required driver documents before submitting');
        expect(dependencies.driverDocumentsDao.updateDriverDocumentsByAuthUserId).not.toHaveBeenCalled();
    });

    test('driver can submit complete documents for review', async () => {
        const profile = createDriverProfile({
            documents: createDocumentCollection({
                status: DRIVER_DOCUMENT_COLLECTION_STATUSES.IN_PROGRESS,
                items: createCompleteDocumentItems()
            })
        });

        dependencies.driverDocumentsDao.findDriverAuthUserById.mockResolvedValue(driverUser);
        dependencies.driverDocumentsDao.findProfileByAuthUserId.mockResolvedValue(profile);
        dependencies.driverDocumentsDao.updateDriverDocumentsByAuthUserId.mockImplementation(async (_authUserId, payload) => ({
            ...profile,
            ...payload
        }));

        const response = await injectRequest(app, {
            method: 'POST',
            path: `${BASE_PATH}/submit`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.documents.status).toBe(DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED);
        expect(response.body.data.documents.documents
            .filter((item) => item.required)
            .every((item) => item.status === DRIVER_DOCUMENT_STATUSES.UNDER_REVIEW)).toBe(true);
        expect(dependencies.driverDocumentsDao.updateDriverDocumentsByAuthUserId).toHaveBeenCalledWith(driverUser.id, expect.objectContaining({
            documents: expect.objectContaining({
                submittedAt: FIXED_NOW
            })
        }));
    });

    test('review queue returns submitted driver document profiles', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);
        const submittedProfile = createDriverProfile({
            documents: createDocumentCollection({
                status: DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
                items: createCompleteDocumentItems(DRIVER_DOCUMENT_STATUSES.UNDER_REVIEW),
                submittedAt: FIXED_NOW
            })
        });

        dependencies.driverDocumentsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.driverDocumentsDao.findReviewQueue.mockResolvedValue([submittedProfile]);

        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/review-queue?status=${DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED}&limit=10`,
            headers: authHeaderFor(dependencies, opsUser)
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.reviewQueue).toHaveLength(1);
        expect(response.body.data.reviewQueue[0].driver.driverCode).toBe('DRV-001');
        expect(dependencies.driverDocumentsDao.findReviewQueue).toHaveBeenCalledWith({
            status: DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
            limit: 10
        });
    });

    test('review approval can complete the document onboarding step', async () => {
        const adminUser = createPrivateUser(PRIVATE_AUTH_ROLES.ADMIN);
        const profile = createDriverProfile({
            documents: createDocumentCollection({
                status: DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
                items: createCompleteDocumentItems(DRIVER_DOCUMENT_STATUSES.APPROVED).map((item) => (
                    item.type === DRIVER_DOCUMENT_TYPES.PROFILE_PHOTO
                        ? { ...item, status: DRIVER_DOCUMENT_STATUSES.UNDER_REVIEW }
                        : item
                )),
                submittedAt: FIXED_NOW
            })
        });

        dependencies.driverDocumentsDao.findPrivateUserById.mockResolvedValue(adminUser);
        dependencies.driverDocumentsDao.findProfileById.mockResolvedValue(profile);
        dependencies.driverDocumentsDao.updateDriverDocumentsByProfileId.mockImplementation(async (_profileId, payload) => ({
            ...profile,
            ...payload
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/drivers/driver-profile-id/documents/${DRIVER_DOCUMENT_TYPES.PROFILE_PHOTO}/review`,
            headers: authHeaderFor(dependencies, adminUser),
            body: {
                status: DRIVER_DOCUMENT_STATUSES.APPROVED
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.documents.status).toBe(DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED);
        expect(dependencies.driverDocumentsDao.updateDriverDocumentsByProfileId).toHaveBeenCalledWith('driver-profile-id', expect.objectContaining({
            onboarding: expect.objectContaining({
                steps: expect.arrayContaining([
                    expect.objectContaining({
                        key: DRIVER_ONBOARDING_STEP_KEYS.DOCUMENTS,
                        status: DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED,
                        completedAt: FIXED_NOW
                    })
                ])
            })
        }));
    });

    test('review rejection marks documents for revision', async () => {
        const opsUser = createPrivateUser(PRIVATE_AUTH_ROLES.OPS);
        const profile = createDriverProfile({
            documents: createDocumentCollection({
                status: DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
                items: createCompleteDocumentItems(DRIVER_DOCUMENT_STATUSES.UNDER_REVIEW),
                submittedAt: FIXED_NOW
            })
        });

        dependencies.driverDocumentsDao.findPrivateUserById.mockResolvedValue(opsUser);
        dependencies.driverDocumentsDao.findProfileById.mockResolvedValue(profile);
        dependencies.driverDocumentsDao.updateDriverDocumentsByProfileId.mockImplementation(async (_profileId, payload) => ({
            ...profile,
            ...payload
        }));

        const response = await injectRequest(app, {
            method: 'PATCH',
            path: `${BASE_PATH}/drivers/driver-profile-id/documents/${DRIVER_DOCUMENT_TYPES.IDENTITY_PROOF}/review`,
            headers: authHeaderFor(dependencies, opsUser),
            body: {
                status: DRIVER_DOCUMENT_STATUSES.REJECTED,
                rejectionReason: 'Document image is blurred'
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.documents.status).toBe(DRIVER_DOCUMENT_COLLECTION_STATUSES.REJECTED);
        expect(response.body.data.documents.guidance.needsRevision).toBe(true);
    });

    test('driver document write routes reject missing write permission', async () => {
        const readOnlyDriver = createPrivateUser(PRIVATE_AUTH_ROLES.DRIVER, {
            permissions: [PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_READ]
        });

        const response = await injectRequest(app, {
            method: 'PUT',
            path: `${BASE_PATH}/documents/${DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE}`,
            headers: authHeaderFor(dependencies, readOnlyDriver),
            body: {
                fileUrl: DOCUMENT_URL
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Required private permission is missing');
    });

    test('review routes reject driver users', async () => {
        const response = await injectRequest(app, {
            method: 'GET',
            path: `${BASE_PATH}/review-queue`,
            headers: authHeaderFor(dependencies, driverUser)
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('You do not have access to this private route');
    });

    test('document upload returns validation errors for invalid payloads', async () => {
        const response = await injectRequest(app, {
            method: 'PUT',
            path: `${BASE_PATH}/documents/${DRIVER_DOCUMENT_TYPES.DRIVING_LICENSE}`,
            headers: authHeaderFor(dependencies, driverUser),
            body: {
                fileUrl: 'not-a-url',
                issuedAt: '2030-01-01T00:00:00.000Z',
                expiresAt: '2029-01-01T00:00:00.000Z'
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });
});
