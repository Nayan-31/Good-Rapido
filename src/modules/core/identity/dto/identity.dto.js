import {
    IDENTITY_DOCUMENT_STATUSES,
    IDENTITY_DOCUMENT_TYPE_CATALOG,
    IDENTITY_DOCUMENT_TYPES,
    IDENTITY_REQUIRED_DOCUMENTS_BY_ROLE,
    IDENTITY_REVIEW_DECISIONS,
    IDENTITY_SCOPES,
    IDENTITY_STATUSES,
    IDENTITY_SUBJECT_ROLES
} from '../identity.constants.js';

export const toIdentityOptions = () => ({
    scopes: Object.values(IDENTITY_SCOPES),
    subjectRoles: Object.values(IDENTITY_SUBJECT_ROLES),
    statuses: Object.values(IDENTITY_STATUSES),
    documentTypes: Object.values(IDENTITY_DOCUMENT_TYPES),
    documentStatuses: Object.values(IDENTITY_DOCUMENT_STATUSES),
    reviewDecisions: Object.values(IDENTITY_REVIEW_DECISIONS),
    requiredDocumentsByRole: IDENTITY_REQUIRED_DOCUMENTS_BY_ROLE,
    documentTypeCatalog: IDENTITY_DOCUMENT_TYPE_CATALOG
});

export const toIdentityVerification = (identity = {}) => ({
    id: getId(identity),
    subject: {
        scope: identity.subjectScope || null,
        role: identity.subjectRole || null,
        id: identity.subjectId || null
    },
    fullName: identity.fullName || null,
    email: identity.email || null,
    phone: identity.phone || null,
    status: identity.status || IDENTITY_STATUSES.DRAFT,
    documents: toIdentityDocuments(identity.documents),
    completion: toIdentityCompletion(identity),
    guidance: toIdentityGuidance(identity),
    submittedAt: identity.submittedAt || null,
    reviewedAt: identity.reviewedAt || null,
    reviewedBy: identity.reviewedBy || null,
    rejectionReason: identity.rejectionReason || null,
    createdAt: identity.createdAt || null,
    updatedAt: identity.updatedAt || null
});

export const toIdentityReviewQueue = (identities = []) => ({
    verifications: identities.map(toIdentityReviewQueueItem),
    summary: {
        total: identities.length,
        submitted: identities.filter((identity) => identity.status === IDENTITY_STATUSES.SUBMITTED).length,
        verified: identities.filter((identity) => identity.status === IDENTITY_STATUSES.VERIFIED).length,
        rejected: identities.filter((identity) => identity.status === IDENTITY_STATUSES.REJECTED).length
    }
});

const toIdentityReviewQueueItem = (identity = {}) => ({
    id: getId(identity),
    subject: {
        scope: identity.subjectScope || null,
        role: identity.subjectRole || null,
        id: identity.subjectId || null
    },
    fullName: identity.fullName || null,
    phone: identity.phone || null,
    email: identity.email || null,
    status: identity.status || IDENTITY_STATUSES.DRAFT,
    documentCount: Array.isArray(identity.documents) ? identity.documents.length : 0,
    missingRequiredTypes: toIdentityCompletion(identity).missingRequiredTypes,
    submittedAt: identity.submittedAt || null,
    updatedAt: identity.updatedAt || null
});

const toIdentityDocuments = (documents = []) => documents.map((document) => ({
    type: document.type,
    status: document.status || IDENTITY_DOCUMENT_STATUSES.UPLOADED,
    documentNumber: document.documentNumber || null,
    holderName: document.holderName || null,
    fileUrl: document.fileUrl || null,
    backFileUrl: document.backFileUrl || null,
    issuedAt: document.issuedAt || null,
    expiresAt: document.expiresAt || null,
    uploadedAt: document.uploadedAt || null,
    reviewedAt: document.reviewedAt || null,
    reviewedBy: document.reviewedBy || null,
    rejectionReason: document.rejectionReason || null,
    notes: document.notes || null
}));

const toIdentityCompletion = (identity = {}) => {
    const requiredTypes = [...(IDENTITY_REQUIRED_DOCUMENTS_BY_ROLE[identity.subjectRole] || [])];
    const uploadedTypes = new Set((identity.documents || []).map((document) => document.type));
    const uploadedRequiredTypes = requiredTypes.filter((type) => uploadedTypes.has(type));
    const missingRequiredTypes = requiredTypes.filter((type) => !uploadedTypes.has(type));

    return {
        requiredTypes,
        uploadedRequiredTypes,
        missingRequiredTypes,
        isComplete: missingRequiredTypes.length === 0
    };
};

const toIdentityGuidance = (identity = {}) => ({
    canEdit: [
        IDENTITY_STATUSES.DRAFT,
        IDENTITY_STATUSES.REJECTED
    ].includes(identity.status || IDENTITY_STATUSES.DRAFT),
    canSubmit: [
        IDENTITY_STATUSES.DRAFT,
        IDENTITY_STATUSES.REJECTED
    ].includes(identity.status || IDENTITY_STATUSES.DRAFT) && toIdentityCompletion(identity).isComplete,
    needsReview: identity.status === IDENTITY_STATUSES.SUBMITTED,
    nextAction: resolveNextAction(identity)
});

const resolveNextAction = (identity = {}) => {
    const status = identity.status || IDENTITY_STATUSES.DRAFT;
    const completion = toIdentityCompletion(identity);

    if (status === IDENTITY_STATUSES.VERIFIED) {
        return 'Identity verified';
    }

    if (status === IDENTITY_STATUSES.SUBMITTED) {
        return 'Wait for identity review';
    }

    if (status === IDENTITY_STATUSES.REJECTED) {
        return 'Update rejected identity documents and resubmit';
    }

    if (!completion.isComplete) {
        return 'Upload required identity documents';
    }

    return 'Submit identity for review';
};

const getId = (document = {}) => document._id?.toString?.() || document.id || null;
