import { buildSuccessResponse } from '../../../shared/utils/apiResponse.js';
import AppError from '../../../shared/utils/appError.js';
import {
    PRIVATE_AUTH_ACCOUNT_STATUSES,
    PRIVATE_AUTH_PERMISSIONS,
    PRIVATE_AUTH_ROLES
} from '../auth/auth.constants.js';
import {
    DRIVER_ONBOARDING_STEP_CATALOG,
    DRIVER_ONBOARDING_STEP_KEYS,
    DRIVER_ONBOARDING_STEP_STATUSES
} from '../driver/driver.constants.js';
import {
    DRIVER_DOCUMENT_COLLECTION_STATUSES,
    DRIVER_DOCUMENT_REVIEW_STATUSES,
    DRIVER_DOCUMENT_STATUSES,
    DRIVER_DOCUMENT_TYPE_CATALOG,
    DRIVER_REQUIRED_DOCUMENT_TYPES
} from './driver-documents.constants.js';
import {
    toDriverDocumentReviewQueue,
    toDriverDocuments,
    toDriverDocumentsOptions
} from './dto/driver-documents.dto.js';

export default class DriverDocumentsService {
    constructor({ driverDocumentsDao, now = () => new Date() }) {
        this.driverDocumentsDao = driverDocumentsDao;
        this.now = now;
    }

    options(authContext) {
        this.assertPrivateContext(authContext);

        return buildSuccessResponse({
            message: 'Driver document options fetched successfully',
            data: {
                options: toDriverDocumentsOptions()
            }
        });
    }

    async getDocuments(authContext) {
        const { driverProfile } = await this.getDriverContext(authContext);

        return buildSuccessResponse({
            message: 'Driver documents fetched successfully',
            data: {
                documents: toDriverDocuments(driverProfile)
            }
        });
    }

    async upsertDocument(authContext, documentType, payload) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const documents = normalizeDocumentCollection(driverProfile.documents);

        assertDocumentsEditable(documents);

        const now = this.now();
        const nextDocuments = {
            ...documents,
            status: DRIVER_DOCUMENT_COLLECTION_STATUSES.IN_PROGRESS,
            items: replaceDocumentItem(documents.items, buildDocumentItem(documentType, payload, now)),
            submittedAt: null,
            reviewedAt: null,
            rejectionReason: null
        };
        const updatedProfile = await this.updateDriverDocumentsByAuthUserId(authContext.userId, {
            documents: nextDocuments,
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Driver document uploaded successfully',
            data: {
                documents: toDriverDocuments(updatedProfile)
            }
        });
    }

    async deleteDocument(authContext, documentType) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const documents = normalizeDocumentCollection(driverProfile.documents);

        assertDocumentsEditable(documents);

        const now = this.now();
        const nextItems = documents.items.filter((item) => item.type !== documentType);
        const nextDocuments = {
            ...documents,
            status: nextItems.length
                ? DRIVER_DOCUMENT_COLLECTION_STATUSES.IN_PROGRESS
                : DRIVER_DOCUMENT_COLLECTION_STATUSES.NOT_STARTED,
            items: nextItems,
            submittedAt: null,
            reviewedAt: null,
            rejectionReason: null
        };
        const updatedProfile = await this.updateDriverDocumentsByAuthUserId(authContext.userId, {
            documents: nextDocuments,
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Driver document removed successfully',
            data: {
                documents: toDriverDocuments(updatedProfile)
            }
        });
    }

    async submitDocuments(authContext) {
        this.assertDriverWriteContext(authContext);
        const { driverProfile } = await this.getDriverContext(authContext);
        const documents = normalizeDocumentCollection(driverProfile.documents);

        assertDocumentsEditable(documents);

        const missingTypes = findMissingSubmitRequirements(documents);

        if (missingTypes.length) {
            throw AppError.badRequest(`Upload required driver documents before submitting: ${missingTypes.join(', ')}`);
        }

        const now = this.now();
        const nextDocuments = {
            ...documents,
            status: DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
            items: documents.items.map((item) => toSubmittedDocumentItem(item, now)),
            submittedAt: now,
            reviewedAt: null,
            rejectionReason: null
        };
        const updatedProfile = await this.updateDriverDocumentsByAuthUserId(authContext.userId, {
            documents: nextDocuments,
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Driver documents submitted for review successfully',
            data: {
                documents: toDriverDocuments(updatedProfile)
            }
        });
    }

    async getReviewQueue(authContext, query = {}) {
        await this.getReviewerContext(authContext);

        const status = Object.values(DRIVER_DOCUMENT_COLLECTION_STATUSES).includes(query.status)
            ? query.status
            : DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED;
        const profiles = await this.driverDocumentsDao.findReviewQueue({
            status,
            limit: query.limit || 25
        });

        return buildSuccessResponse({
            message: 'Driver document review queue fetched successfully',
            data: {
                reviewQueue: toDriverDocumentReviewQueue(toPlainArray(profiles))
            }
        });
    }

    async reviewDocument(authContext, driverId, documentType, payload) {
        const reviewer = await this.getReviewerContext(authContext);
        const driverProfile = normalizeDriverProfile(toPlainObject(await this.driverDocumentsDao.findProfileById(driverId)));

        if (!driverProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        const documents = normalizeDocumentCollection(driverProfile.documents);

        if (documents.status !== DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED) {
            throw AppError.badRequest('Driver documents are not submitted for review');
        }

        const documentItem = documents.items.find((item) => item.type === documentType);

        if (!documentItem) {
            throw AppError.badRequest('Driver document has not been uploaded');
        }

        const now = this.now();
        const reviewedItem = {
            ...documentItem,
            status: payload.status,
            reviewedAt: now,
            reviewedBy: getId(reviewer),
            rejectionReason: payload.status === DRIVER_DOCUMENT_REVIEW_STATUSES.REJECTED
                ? payload.rejectionReason.trim()
                : null
        };
        const nextDocuments = resolveCollectionAfterReview({
            ...documents,
            items: replaceDocumentItem(documents.items, reviewedItem)
        }, now);
        const updatedProfile = await this.updateDriverDocumentsByProfileId(driverId, {
            documents: nextDocuments,
            onboarding: syncOnboardingDocumentsStep(driverProfile.onboarding, nextDocuments, now),
            latestActivityAt: now
        });

        return buildSuccessResponse({
            message: 'Driver document reviewed successfully',
            data: {
                documents: toDriverDocuments(updatedProfile)
            }
        });
    }

    async getDriverContext(authContext) {
        this.assertDriverReadContext(authContext);

        const authUser = toPlainObject(await this.driverDocumentsDao.findDriverAuthUserById(authContext.userId));

        if (!authUser) {
            throw AppError.notFound('Driver account not found');
        }

        assertActivePrivateUser(authUser, 'Driver');

        const driverProfile = normalizeDriverProfile(toPlainObject(
            await this.driverDocumentsDao.findProfileByAuthUserId(authContext.userId)
        ));

        if (!driverProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return {
            authUser,
            driverProfile
        };
    }

    async getReviewerContext(authContext) {
        this.assertReviewerContext(authContext);

        const privateUser = toPlainObject(await this.driverDocumentsDao.findPrivateUserById(authContext.userId));

        if (!privateUser) {
            throw AppError.notFound('Private reviewer account not found');
        }

        assertActivePrivateUser(privateUser, 'Private reviewer');

        return privateUser;
    }

    async updateDriverDocumentsByAuthUserId(authUserId, payload) {
        const updatedProfile = normalizeDriverProfile(toPlainObject(
            await this.driverDocumentsDao.updateDriverDocumentsByAuthUserId(authUserId, payload)
        ));

        if (!updatedProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return updatedProfile;
    }

    async updateDriverDocumentsByProfileId(profileId, payload) {
        const updatedProfile = normalizeDriverProfile(toPlainObject(
            await this.driverDocumentsDao.updateDriverDocumentsByProfileId(profileId, payload)
        ));

        if (!updatedProfile) {
            throw AppError.notFound('Driver profile not found');
        }

        return updatedProfile;
    }

    assertPrivateContext(authContext) {
        if (!authContext?.userId || !Object.values(PRIVATE_AUTH_ROLES).includes(authContext.role)) {
            throw AppError.forbidden('Private access is required');
        }

        return authContext;
    }

    assertDriverReadContext(authContext) {
        if (!authContext?.userId || authContext.role !== PRIVATE_AUTH_ROLES.DRIVER) {
            throw AppError.forbidden('Driver private access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_READ)) {
            throw AppError.forbidden('Driver documents read permission is required');
        }

        return authContext;
    }

    assertDriverWriteContext(authContext) {
        this.assertDriverReadContext(authContext);

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_WRITE)) {
            throw AppError.forbidden('Driver documents write permission is required');
        }
    }

    assertReviewerContext(authContext) {
        if (!authContext?.userId || ![
            PRIVATE_AUTH_ROLES.ADMIN,
            PRIVATE_AUTH_ROLES.OPS
        ].includes(authContext.role)) {
            throw AppError.forbidden('Driver document review access is required');
        }

        if (!authContext.permissions?.includes(PRIVATE_AUTH_PERMISSIONS.DRIVER_DOCUMENTS_REVIEW)) {
            throw AppError.forbidden('Driver document review permission is required');
        }
    }
}

const assertActivePrivateUser = (privateUser = {}, label) => {
    if (privateUser.accountStatus !== PRIVATE_AUTH_ACCOUNT_STATUSES.ACTIVE) {
        throw AppError.forbidden(`${label} account is ${privateUser.accountStatus}`);
    }
};

const assertDocumentsEditable = (documents = {}) => {
    if ([
        DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
        DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED
    ].includes(documents.status)) {
        throw AppError.badRequest('Submitted or approved driver documents cannot be edited');
    }
};

const normalizeDriverProfile = (driverProfile) => {
    if (!driverProfile) {
        return null;
    }

    return {
        ...driverProfile,
        documents: normalizeDocumentCollection(driverProfile.documents),
        onboarding: normalizeOnboarding(driverProfile.onboarding)
    };
};

const normalizeDocumentCollection = (documents = {}) => ({
    status: documents.status || DRIVER_DOCUMENT_COLLECTION_STATUSES.NOT_STARTED,
    items: normalizeDocumentItems(documents.items),
    submittedAt: documents.submittedAt || null,
    reviewedAt: documents.reviewedAt || null,
    rejectionReason: documents.rejectionReason || null
});

const normalizeDocumentItems = (items = []) => {
    const allowedTypes = new Set(DRIVER_DOCUMENT_TYPE_CATALOG.map((item) => item.type));

    return (Array.isArray(items) ? items : [])
        .filter((item) => allowedTypes.has(item.type))
        .map((item) => ({
            type: item.type,
            status: item.status || DRIVER_DOCUMENT_STATUSES.UPLOADED,
            documentNumber: item.documentNumber || null,
            holderName: item.holderName || null,
            fileUrl: item.fileUrl || null,
            backFileUrl: item.backFileUrl || null,
            issuedAt: item.issuedAt || null,
            expiresAt: item.expiresAt || null,
            uploadedAt: item.uploadedAt || null,
            submittedAt: item.submittedAt || null,
            reviewedAt: item.reviewedAt || null,
            reviewedBy: item.reviewedBy || null,
            rejectionReason: item.rejectionReason || null,
            notes: item.notes || null
        }));
};

const normalizeOnboarding = (onboarding = {}) => ({
    ...onboarding,
    steps: Array.isArray(onboarding.steps) ? onboarding.steps : []
});

const buildDocumentItem = (documentType, payload = {}, now) => ({
    type: documentType,
    status: DRIVER_DOCUMENT_STATUSES.UPLOADED,
    documentNumber: payload.documentNumber?.trim() || null,
    holderName: payload.holderName?.trim() || null,
    fileUrl: payload.fileUrl.trim(),
    backFileUrl: payload.backFileUrl?.trim() || null,
    issuedAt: payload.issuedAt || null,
    expiresAt: payload.expiresAt || null,
    uploadedAt: now,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    notes: payload.notes?.trim() || null
});

const replaceDocumentItem = (items = [], documentItem) => [
    ...items.filter((item) => item.type !== documentItem.type),
    documentItem
];

const findMissingSubmitRequirements = (documents = {}) => DRIVER_REQUIRED_DOCUMENT_TYPES.filter((documentType) => {
    const documentItem = documents.items.find((item) => item.type === documentType);

    return !documentItem?.fileUrl || ![
        DRIVER_DOCUMENT_STATUSES.UPLOADED,
        DRIVER_DOCUMENT_STATUSES.APPROVED
    ].includes(documentItem.status);
});

const toSubmittedDocumentItem = (documentItem, now) => {
    if (documentItem.status === DRIVER_DOCUMENT_STATUSES.APPROVED) {
        return documentItem;
    }

    return {
        ...documentItem,
        status: DRIVER_DOCUMENT_STATUSES.UNDER_REVIEW,
        submittedAt: now,
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null
    };
};

const resolveCollectionAfterReview = (documents = {}, now) => {
    const requiredItems = DRIVER_REQUIRED_DOCUMENT_TYPES.map((documentType) => (
        documents.items.find((item) => item.type === documentType)
    ));
    const rejectedRequired = requiredItems.find((item) => item?.status === DRIVER_DOCUMENT_STATUSES.REJECTED);
    const allRequiredApproved = requiredItems.every((item) => item?.status === DRIVER_DOCUMENT_STATUSES.APPROVED);

    if (rejectedRequired) {
        return {
            ...documents,
            status: DRIVER_DOCUMENT_COLLECTION_STATUSES.REJECTED,
            reviewedAt: now,
            rejectionReason: 'One or more required documents were rejected'
        };
    }

    if (allRequiredApproved) {
        return {
            ...documents,
            status: DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED,
            reviewedAt: now,
            rejectionReason: null
        };
    }

    return {
        ...documents,
        status: DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
        reviewedAt: null,
        rejectionReason: null
    };
};

const syncOnboardingDocumentsStep = (onboarding = {}, documents = {}, now) => {
    const existingSteps = Array.isArray(onboarding.steps) ? onboarding.steps : [];
    const existingByKey = new Map(existingSteps.map((step) => [step.key, step]));

    return {
        ...onboarding,
        steps: DRIVER_ONBOARDING_STEP_CATALOG.map((catalogStep) => {
            const existingStep = existingByKey.get(catalogStep.key) || {};

            if (catalogStep.key !== DRIVER_ONBOARDING_STEP_KEYS.DOCUMENTS) {
                return {
                    ...catalogStep,
                    ...existingStep
                };
            }

            return {
                ...catalogStep,
                ...existingStep,
                status: resolveOnboardingDocumentStepStatus(documents.status),
                note: resolveOnboardingDocumentStepNote(documents.status, documents.rejectionReason),
                completedAt: documents.status === DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED
                    ? existingStep.completedAt || now
                    : null,
                updatedAt: now
            };
        })
    };
};

const resolveOnboardingDocumentStepStatus = (documentsStatus) => {
    if (documentsStatus === DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED) {
        return DRIVER_ONBOARDING_STEP_STATUSES.COMPLETED;
    }

    if (documentsStatus === DRIVER_DOCUMENT_COLLECTION_STATUSES.REJECTED) {
        return DRIVER_ONBOARDING_STEP_STATUSES.REJECTED;
    }

    return DRIVER_ONBOARDING_STEP_STATUSES.PENDING;
};

const resolveOnboardingDocumentStepNote = (documentsStatus, rejectionReason) => {
    if (documentsStatus === DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED) {
        return 'Driver documents approved';
    }

    if (documentsStatus === DRIVER_DOCUMENT_COLLECTION_STATUSES.REJECTED) {
        return rejectionReason || 'Driver documents need revision';
    }

    return null;
};

const toPlainObject = (document) => document?.toObject ? document.toObject() : document;

const toPlainArray = (documents = []) => documents.map((document) => toPlainObject(document));

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
