import {
    DRIVER_DOCUMENT_COLLECTION_STATUSES,
    DRIVER_DOCUMENT_REVIEW_STATUSES,
    DRIVER_DOCUMENT_STATUSES,
    DRIVER_DOCUMENT_TYPE_CATALOG,
    DRIVER_DOCUMENT_TYPES,
    DRIVER_REQUIRED_DOCUMENT_TYPES
} from '../driver-documents.constants.js';

export const toDriverDocumentsOptions = () => ({
    documentTypes: Object.values(DRIVER_DOCUMENT_TYPES),
    collectionStatuses: Object.values(DRIVER_DOCUMENT_COLLECTION_STATUSES),
    documentStatuses: Object.values(DRIVER_DOCUMENT_STATUSES),
    reviewStatuses: Object.values(DRIVER_DOCUMENT_REVIEW_STATUSES),
    requiredDocumentTypes: DRIVER_REQUIRED_DOCUMENT_TYPES,
    documentCatalog: DRIVER_DOCUMENT_TYPE_CATALOG
});

export const toDriverDocuments = (driverProfile = {}) => {
    const documents = normalizeDocumentCollection(driverProfile.documents);
    const items = toDocumentItems(documents.items);
    const completion = toDocumentCompletion(items);

    return {
        status: documents.status,
        documents: items,
        completion,
        submittedAt: documents.submittedAt || null,
        reviewedAt: documents.reviewedAt || null,
        rejectionReason: documents.rejectionReason || null,
        guidance: toDocumentsGuidance(documents, completion)
    };
};

export const toDriverDocumentReviewQueue = (profiles = []) => profiles.map((profile) => ({
    driver: {
        id: getId(profile),
        authUserId: getAuthUserId(profile),
        driverCode: profile.driverCode || null,
        displayName: profile.profile?.displayName || null,
        serviceZone: profile.service?.serviceZone || null
    },
    documents: toDriverDocuments(profile)
}));

const toDocumentItems = (items = []) => DRIVER_DOCUMENT_TYPE_CATALOG.map((catalogItem) => {
    const document = items.find((item) => item.type === catalogItem.type) || {};

    return {
        type: catalogItem.type,
        label: catalogItem.label,
        required: catalogItem.required,
        expires: catalogItem.expires,
        status: document.status || DRIVER_DOCUMENT_STATUSES.MISSING,
        documentNumber: document.documentNumber || null,
        holderName: document.holderName || null,
        fileUrl: document.fileUrl || null,
        backFileUrl: document.backFileUrl || null,
        issuedAt: document.issuedAt || null,
        expiresAt: document.expiresAt || null,
        uploadedAt: document.uploadedAt || null,
        submittedAt: document.submittedAt || null,
        reviewedAt: document.reviewedAt || null,
        reviewedBy: document.reviewedBy || null,
        rejectionReason: document.rejectionReason || null,
        notes: document.notes || null
    };
});

const toDocumentCompletion = (items = []) => {
    const requiredItems = items.filter((item) => item.required);
    const approvedRequired = requiredItems.filter((item) => item.status === DRIVER_DOCUMENT_STATUSES.APPROVED);
    const readyRequired = requiredItems.filter((item) => [
        DRIVER_DOCUMENT_STATUSES.UPLOADED,
        DRIVER_DOCUMENT_STATUSES.UNDER_REVIEW,
        DRIVER_DOCUMENT_STATUSES.APPROVED
    ].includes(item.status));
    const missingRequiredTypes = requiredItems
        .filter((item) => item.status === DRIVER_DOCUMENT_STATUSES.MISSING)
        .map((item) => item.type);
    const rejectedRequiredTypes = requiredItems
        .filter((item) => item.status === DRIVER_DOCUMENT_STATUSES.REJECTED)
        .map((item) => item.type);

    return {
        requiredDocuments: requiredItems.length,
        readyRequiredDocuments: readyRequired.length,
        approvedRequiredDocuments: approvedRequired.length,
        missingRequiredTypes,
        rejectedRequiredTypes,
        percent: requiredItems.length
            ? Math.round((approvedRequired.length / requiredItems.length) * 100)
            : 100
    };
};

const toDocumentsGuidance = (documents = {}, completion = {}) => ({
    canEdit: ![
        DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
        DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED
    ].includes(documents.status),
    canSubmit: completion.missingRequiredTypes.length === 0
        && completion.rejectedRequiredTypes.length === 0
        && ![
            DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
            DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED
        ].includes(documents.status),
    requiresReview: documents.status === DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED,
    needsRevision: documents.status === DRIVER_DOCUMENT_COLLECTION_STATUSES.REJECTED,
    nextAction: resolveNextAction(documents, completion)
});

const resolveNextAction = (documents = {}, completion = {}) => {
    if (documents.status === DRIVER_DOCUMENT_COLLECTION_STATUSES.APPROVED) {
        return 'Documents approved';
    }

    if (documents.status === DRIVER_DOCUMENT_COLLECTION_STATUSES.SUBMITTED) {
        return 'Wait for document review';
    }

    if (documents.status === DRIVER_DOCUMENT_COLLECTION_STATUSES.REJECTED) {
        return 'Revise rejected documents and resubmit';
    }

    if (completion.missingRequiredTypes?.length) {
        return 'Upload all required documents';
    }

    return 'Submit documents for review';
};

const normalizeDocumentCollection = (documents = {}) => ({
    status: documents.status || DRIVER_DOCUMENT_COLLECTION_STATUSES.NOT_STARTED,
    items: Array.isArray(documents.items) ? documents.items : [],
    submittedAt: documents.submittedAt || null,
    reviewedAt: documents.reviewedAt || null,
    rejectionReason: documents.rejectionReason || null
});

const getId = (document = {}) => document._id?.toString?.() || document.id || null;

const getAuthUserId = (document = {}) => document.authUserId?._id?.toString?.()
    || document.authUserId?.toString?.()
    || document.authUserId
    || null;
